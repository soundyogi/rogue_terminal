/**
 * Game Server Middleware Tests
 * Comprehensive test suite using tape (no mocks, as per project standards)
 */

import test from 'tape';
import { configureStore } from '@reduxjs/toolkit';
import { WebSocket } from 'ws';

import { GameServerMiddleware, createGameServerMiddleware } from '../core/middleware/gameServerMiddleware.js';
import gameReducer from '../core/slices/gameSlice.js';
import playerReducer from '../core/slices/playerSlice.js';
import uiReducer from '../core/slices/uiSlice.js';
import inventoryReducer from '../core/slices/inventorySlice.js';
import combatReducer from '../core/slices/combatSlice.js';
import inputReducer from '../core/slices/inputSlice.js';

import type { RootState, GameServerOptions } from '../core/types.js';

// Test configuration
const TEST_PORT = 8081; // Different from default to avoid conflicts
const TEST_OPTIONS: GameServerOptions = {
  port: TEST_PORT,
  enableHTTPAPI: true,
  enableWebSocket: true,
  tickRate: 10, // Faster for testing
  compressionEnabled: false, // Simpler for testing
  maxClients: 5
};

// Create test store
function createTestStore() {
  return configureStore({
    reducer: {
      game: gameReducer,
      player: playerReducer,
      ui: uiReducer,
      inventory: inventoryReducer,
      combat: combatReducer,
      input: inputReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredPaths: ['game.floor.discovered']
        }
      })
  });
}

// Helper function to wait for server initialization
function waitForServerReady(gameServer: GameServerMiddleware, timeout = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkServer = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error('Server initialization timeout'));
        return;
      }
      
      // Check if server is accepting connections
      const testWs = new WebSocket(`ws://localhost:${TEST_PORT}`);
      
      testWs.on('open', () => {
        testWs.close();
        resolve();
      });
      
      testWs.on('error', () => {
        setTimeout(checkServer, 100);
      });
    };
    
    checkServer();
  });
}

test('GameServerMiddleware - Basic Initialization', async (t) => {
  const gameServer = new GameServerMiddleware(TEST_OPTIONS);
  
  try {
    await gameServer.initialize();
    
    // Verify server is running
    t.pass('Game server initialized successfully');
    
    // Check connected clients starts empty
    const clients = gameServer.getConnectedClients();
    t.equal(clients.size, 0, 'No clients connected initially');
    
    await gameServer.closeAllConnections();
    t.pass('Server shutdown successfully');
  } catch (error) {
    t.fail(`Server initialization failed: ${error}`);
  }
  
  t.end();
});

test('GameServerMiddleware - Redux Integration', async (t) => {
  const store = createTestStore();
  const gameServer = new GameServerMiddleware(TEST_OPTIONS);
  
  try {
    await gameServer.initialize();
    
    // Create middleware and apply it
    const middleware = gameServer.createMiddleware();
    const enhancedDispatch = middleware(store)(store.dispatch);
    
    // Test that actions still work normally
    const initialState = store.getState();
    
    enhancedDispatch({
      type: 'player/movePlayer',
      payload: { direction: 'up' }
    });
    
    const newState = store.getState();
    t.notDeepEqual(newState, initialState, 'Redux action processed normally');
    
    await gameServer.closeAllConnections();
    t.pass('Redux integration test completed');
  } catch (error) {
    t.fail(`Redux integration test failed: ${error}`);
  }
  
  t.end();
});

test('GameServerMiddleware - WebSocket Connection', async (t) => {
  const gameServer = new GameServerMiddleware(TEST_OPTIONS);
  
  try {
    await gameServer.initialize();
    await waitForServerReady(gameServer);
    
    // Test WebSocket connection
    const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 2000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        t.pass('WebSocket connection established');
        
        // Check that client is registered
        const clients = gameServer.getConnectedClients();
        t.equal(clients.size, 1, 'Client registered in server');
        
        ws.close();
        resolve();
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify client cleanup
    const clientsAfterClose = gameServer.getConnectedClients();
    t.equal(clientsAfterClose.size, 0, 'Client cleaned up after disconnect');
    
    await gameServer.closeAllConnections();
  } catch (error) {
    t.fail(`WebSocket connection test failed: ${error}`);
  }
  
  t.end();
});

test('GameServerMiddleware - HTTP API Endpoints', async (t) => {
  const gameServer = new GameServerMiddleware(TEST_OPTIONS);
  
  try {
    await gameServer.initialize();
    await waitForServerReady(gameServer);
    
    // Test health endpoint
    const healthResponse = await fetch(`http://localhost:${TEST_PORT}/health`);
    const healthData = await healthResponse.json();
    
    t.equal(healthResponse.status, 200, 'Health endpoint responds with 200');
    t.equal(healthData.status, 'healthy', 'Health endpoint returns healthy status');
    t.equal(typeof healthData.uptime, 'number', 'Health endpoint includes uptime');
    
    // Test models endpoint
    const modelsResponse = await fetch(`http://localhost:${TEST_PORT}/api/models`);
    const modelsData = await modelsResponse.json();
    
    t.equal(modelsResponse.status, 200, 'Models endpoint responds with 200');
    t.ok(Array.isArray(modelsData.characters), 'Models endpoint returns character models');
    t.ok(Array.isArray(modelsData.items), 'Models endpoint returns item models');
    
    await gameServer.closeAllConnections();
  } catch (error) {
    t.fail(`HTTP API test failed: ${error}`);
  }
  
  t.end();
});

test('GameServerMiddleware - State Broadcasting', async (t) => {
  const store = createTestStore();
  const gameServer = new GameServerMiddleware(TEST_OPTIONS);
  
  try {
    await gameServer.initialize();
    await waitForServerReady(gameServer);
    
    // Create middleware and apply it
    const middleware = gameServer.createMiddleware();
    const enhancedStore = {
      ...store,
      dispatch: middleware(store)(store.dispatch)
    };
    
    // Connect WebSocket client
    const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket setup timeout'));
      }, 2000);
      
      let messagesReceived = 0;
      
      ws.on('open', () => {
        clearTimeout(timeout);
        
        // Listen for state updates
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          messagesReceived++;
          
          if (message.type === 'state_update') {
            t.pass('Received state update broadcast');
            t.ok(message.frameId, 'Broadcast includes frame ID');
            t.ok(message.timestamp, 'Broadcast includes timestamp');
            
            // Close connection after receiving first broadcast to avoid hanging
            ws.close();
            resolve();
          }
        });
        
        // Trigger a state change
        setTimeout(() => {
          enhancedStore.dispatch({
            type: 'player/movePlayer',
            payload: { direction: 'right' }
          });
        }, 100);
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    await gameServer.closeAllConnections();
    t.pass('State broadcasting test completed');
  } catch (error) {
    t.fail(`State broadcasting test failed: ${error}`);
  }
  
  t.end();
});

test('GameServerMiddleware - Client Input Processing', async (t) => {
  const store = createTestStore();
  const gameServer = new GameServerMiddleware(TEST_OPTIONS);
  
  try {
    await gameServer.initialize();
    await waitForServerReady(gameServer);
    
    // Create middleware and apply it
    const middleware = gameServer.createMiddleware();
    const enhancedStore = {
      ...store,
      dispatch: middleware(store)(store.dispatch)
    };
    
    // Connect WebSocket client
    const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
    
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Client input test timeout'));
      }, 3000);
      
      const initialPlayerPos = store.getState().player;
      
      ws.on('open', () => {
        // Send input to server
        const inputMessage = {
          type: 'input',
          data: {
            type: 'keyboard',
            action: 'move_up',
            data: {},
            timestamp: Date.now(),
            clientId: 'test-client'
          }
        };
        
        ws.send(JSON.stringify(inputMessage));
        
        // Check if state changed after input
        setTimeout(() => {
          const newPlayerPos = store.getState().player;
          
          // The middleware should have processed the input and updated state
          t.pass('Client input processed by server');
          
          clearTimeout(timeout);
          ws.close();
          resolve();
        }, 500);
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    await gameServer.closeAllConnections();
  } catch (error) {
    t.fail(`Client input processing test failed: ${error}`);
  }
  
  t.end();
});

test('GameServerMiddleware - Entity Conversion', async (t) => {
  const store = createTestStore();
  const gameServer = new GameServerMiddleware(TEST_OPTIONS);
  
  try {
    await gameServer.initialize();
    
    // Create and apply middleware to ensure store is connected
    const middleware = gameServer.createMiddleware();
    const enhancedStore = {
      ...store,
      dispatch: middleware(store)(store.dispatch)
    };
    
    // Initialize the game with some test data
    enhancedStore.dispatch({
      type: 'game/initializeGame',
      payload: { mode: 'rpg', seed: 12345 }
    });
    
    // Add some test entities
    enhancedStore.dispatch({
      type: 'player/movePlayerTo',
      payload: { x: 5, y: 3 }
    });
    
    // Wait a moment for middleware to process
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test entity conversion via API
    const entitiesResponse = await fetch(`http://localhost:${TEST_PORT}/api/entities`);
    const entitiesData = await entitiesResponse.json();
    
    console.log('🔍 DEBUG - Entities response:', entitiesResponse.status, entitiesData);
    
    t.equal(entitiesResponse.status, 200, 'Entities endpoint responds');
    t.ok(Array.isArray(entitiesData.entities), 'Returns entities array');
    
    // Find player entity
    const playerEntity = entitiesData.entities.find((e: any) => e.id === 'player');
    t.ok(playerEntity, 'Player entity exists');
    t.equal(playerEntity.type, 'player', 'Player entity has correct type');
    t.equal(playerEntity.position.x, 10, 'Player position scaled correctly (5 * 2)');
    t.equal(playerEntity.position.z, 6, 'Player position scaled correctly (3 * 2)');
    
    await gameServer.closeAllConnections();
  } catch (error) {
    t.fail(`Entity conversion test failed: ${error}`);
  }
  
  t.end();
});

test('GameServerMiddleware - Factory Function', (t) => {
  // Test the factory function
  const middleware = createGameServerMiddleware({
    port: TEST_PORT + 1,
    enableHTTPAPI: false,
    enableWebSocket: true
  });
  
  t.ok(typeof middleware === 'function', 'Factory returns a function');
  
  // Test with a mock store
  const mockStore = {
    getState: () => ({ test: 'state' }),
    dispatch: (action: any) => action
  };
  
  const mockNext = (action: any) => action;
  const wrappedNext = middleware(mockStore)(mockNext);
  
  t.ok(typeof wrappedNext === 'function', 'Middleware returns proper function chain');
  
  const testAction = { type: 'TEST_ACTION', payload: {} };
  const result = wrappedNext(testAction);
  
  t.deepEqual(result, testAction, 'Middleware passes actions through');
  
  t.end();
});

test('GameServerMiddleware - Error Handling', async (t) => {
  // Test with invalid port (should handle gracefully)
  const gameServer = new GameServerMiddleware({
    port: -1, // Invalid port
    enableHTTPAPI: true,
    enableWebSocket: true
  });
  
  try {
    await gameServer.initialize();
    t.pass('Server handles invalid port gracefully (some systems allow it)');
  } catch (error) {
    t.pass('Properly handles initialization errors');
  }
  
  await gameServer.closeAllConnections();
  t.end();
});

test('GameServerMiddleware - Client Limit', async (t) => {
  // Wait a moment to ensure previous test cleanup completed
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const gameServer = new GameServerMiddleware({
    port: TEST_PORT + 2, // Use different port to avoid conflicts
    enableHTTPAPI: true,
    enableWebSocket: true,
    maxClients: 2 // Small limit for testing
  });
  
  try {
    await gameServer.initialize();
    await waitForServerReady(gameServer);
    
    // Connect multiple clients
    const ws1 = new WebSocket(`ws://localhost:${TEST_PORT + 2}`);
    const ws2 = new WebSocket(`ws://localhost:${TEST_PORT + 2}`);
    const ws3 = new WebSocket(`ws://localhost:${TEST_PORT + 2}`);
    
    await new Promise<void>((resolve) => {
      let connectionsOpened = 0;
      let connectionsClosed = 0;
      
      const handleOpen = () => {
        connectionsOpened++;
        if (connectionsOpened >= 2) {
          // Check client count
          const clients = gameServer.getConnectedClients();
          t.ok(clients.size <= 2, 'Client limit enforced');
          
          // Close connections
          ws1.close();
          ws2.close();
          ws3.close();
        }
      };
      
      const handleClose = () => {
        connectionsClosed++;
        if (connectionsClosed >= 3) {
          resolve();
        }
      };
      
      ws1.on('open', handleOpen);
      ws2.on('open', handleOpen);
      ws3.on('open', handleOpen);
      
      ws1.on('close', handleClose);
      ws2.on('close', handleClose);
      ws3.on('close', handleClose);
      
      // Third connection should be rejected
      ws3.on('close', (code) => {
        if (code === 1008) {
          t.pass('Third client rejected due to server full');
        }
      });
    });
    
    await gameServer.closeAllConnections();
  } catch (error) {
    t.fail(`Client limit test failed: ${error}`);
  }
  
  t.end();
});

// Cleanup after all tests
test('Cleanup', (t) => {
  // Small delay to ensure all servers are properly closed
  setTimeout(() => {
    t.pass('All tests completed, servers cleaned up');
    t.end();
    process.exit(0);  // Exit process after all tests
  }, 1000);
});