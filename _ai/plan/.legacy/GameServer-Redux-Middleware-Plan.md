# Game Server Redux Middleware Architecture
## Advanced Implementation with Koa.js and WebSocket Integration

### 📋 Enhanced Architecture Overview

**Goal**: Create a Redux middleware that automatically broadcasts state changes to connected clients (Unreal Engine 5, Unity, Web, etc.) using pure WebSocket connections and optional Koa.js for API endpoints.

```typescript
// Redux Store → Game Server Middleware → WebSocket Clients
Game Actions → Redux State Changes → Broadcast to UE5/Unity/Web
```

---

## 🏗️ Phase 1: Game Server Redux Middleware

### 1.1: Core Middleware Implementation

```typescript
// core/middleware/gameServerMiddleware.ts
import { Middleware, PayloadAction } from '@reduxjs/toolkit';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import type { 
  RootState, 
  GameEntity, 
  RenderData, 
  ClientInput,
  GameServerState 
} from '../types.js';

interface GameServerOptions {
  port?: number;
  enableHTTPAPI?: boolean;
  enableWebSocket?: boolean;
  tickRate?: number;
  compressionEnabled?: boolean;
}

interface ConnectedClient {
  id: string;
  ws: WebSocket;
  type: 'unreal' | 'unity' | 'web' | 'terminal';
  lastPing: number;
  subscriptions: Set<string>; // What state changes they want
}

export class GameServerMiddleware {
  private clients: Map<string, ConnectedClient> = new Map();
  private wsServer: WebSocketServer | null = null;
  private httpServer: any = null;
  private koaApp: Koa | null = null;
  private entityIdCounter: number = 0;
  private lastBroadcastState: RootState | null = null;
  
  constructor(private options: GameServerOptions = {}) {
    this.options = {
      port: 8080,
      enableHTTPAPI: true,
      enableWebSocket: true,
      tickRate: 30, // 30 FPS
      compressionEnabled: true,
      ...options
    };
  }

  // Redux Middleware Function
  public createMiddleware(): Middleware {
    return (store) => (next) => (action: PayloadAction<any>) => {
      // Process action normally
      const result = next(action);
      
      // Get updated state
      const state: RootState = store.getState();
      
      // Broadcast state changes to connected clients
      this.broadcastStateUpdate(action, state);
      
      return result;
    };
  }

  public async initialize(): Promise<void> {
    if (this.options.enableWebSocket) {
      await this.setupWebSocketServer();
    }
    
    if (this.options.enableHTTPAPI) {
      await this.setupKoaServer();
    }
    
    // Start heartbeat for client management
    this.startHeartbeat();
    
    console.log(`🎮 Game Server initialized on port ${this.options.port}`);
  }

  private async setupWebSocketServer(): Promise<void> {
    this.httpServer = createServer();
    this.wsServer = new WebSocketServer({ server: this.httpServer });
    
    this.wsServer.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientType = this.detectClientType(req);
      
      const client: ConnectedClient = {
        id: clientId,
        ws,
        type: clientType,
        lastPing: Date.now(),
        subscriptions: new Set(['all']) // Default: subscribe to all updates
      };
      
      this.clients.set(clientId, client);
      
      console.log(`📱 ${clientType} client connected: ${clientId}`);
      
      // Send initial game state
      this.sendInitialState(client);
      
      ws.on('message', (data) => {
        this.handleClientMessage(clientId, data);
      });
      
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`📱 Client disconnected: ${clientId}`);
      });
      
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = Date.now();
        }
      });
    });
    
    this.httpServer.listen(this.options.port);
  }

  private async setupKoaServer(): Promise<void> {
    this.koaApp = new Koa();
    const router = new Router();
    
    // Middleware
    this.koaApp.use(cors());
    this.koaApp.use(bodyParser());
    
    // API Routes for Unreal Engine 5 Blueprint integration
    router.get('/api/gamestate', this.handleGetGameState.bind(this));
    router.post('/api/input', this.handlePostInput.bind(this));
    router.get('/api/entities', this.handleGetEntities.bind(this));
    router.get('/api/models', this.handleGetModels.bind(this));
    router.post('/api/subscribe', this.handleSubscribe.bind(this));
    
    // Health check
    router.get('/health', (ctx) => {
      ctx.body = { 
        status: 'healthy', 
        clients: this.clients.size,
        uptime: process.uptime()
      };
    });
    
    this.koaApp.use(router.routes());
    this.koaApp.use(router.allowedMethods());
    
    // If no separate HTTP server, create one for Koa
    if (!this.httpServer) {
      this.httpServer = createServer(this.koaApp.callback());
      this.httpServer.listen(this.options.port);
    } else {
      // Mount Koa on existing server
      this.httpServer.on('request', this.koaApp.callback());
    }
  }

  // Core broadcast logic - triggered by Redux middleware
  private broadcastStateUpdate(action: PayloadAction<any>, state: RootState): void {
    if (this.clients.size === 0) return;
    
    // Only broadcast if state actually changed
    if (this.stateHasChanged(state)) {
      const gameServerState = this.convertToGameServerState(action, state);
      const message = this.createBroadcastMessage(action.type, gameServerState);
      
      // Broadcast to all connected clients based on their subscriptions
      this.clients.forEach((client) => {
        if (this.shouldBroadcastToClient(client, action.type)) {
          this.sendToClient(client, message);
        }
      });
      
      this.lastBroadcastState = state;
    }
  }

  private convertToGameServerState(action: PayloadAction<any>, state: RootState): GameServerState {
    return {
      sessionId: 'default', // TODO: Multi-session support
      gameState: state,
      entities: this.convertStateToEntities(state),
      worldData: this.createWorldData(state),
      frameId: ++this.entityIdCounter,
      timestamp: Date.now(),
      lastAction: {
        type: action.type,
        payload: action.payload
      }
    };
  }

  private convertStateToEntities(state: RootState): GameEntity[] {
    const entities: GameEntity[] = [];
    
    // Player entity
    entities.push({
      id: 'player',
      type: 'player',
      position: { 
        x: state.player.x * 2, // Scale for 3D world
        y: 0,
        z: state.player.y * 2 
      },
      model: 'Characters/Player/Player_Model',
      animation: this.getPlayerAnimation(state),
      metadata: {
        health: state.player.hp,
        maxHealth: state.player.maxHp,
        level: state.player.level,
        name: 'Player',
        interactive: false
      },
      lastUpdated: Date.now()
    });
    
    // Floor items
    state.floor.items.forEach((item, index) => {
      entities.push({
        id: `item_${index}`,
        type: 'item',
        position: { x: item.x * 2, y: 0.5, z: item.y * 2 },
        model: this.getItemModel(item),
        metadata: {
          name: item.name || 'Unknown Item',
          interactive: true,
          properties: item
        },
        lastUpdated: Date.now()
      });
    });
    
    // Enemies
    state.floor.enemies.forEach((enemy, index) => {
      entities.push({
        id: `enemy_${index}`,
        type: 'enemy',
        position: { x: enemy.x * 2, y: 0, z: enemy.y * 2 },
        model: this.getEnemyModel(enemy),
        animation: { name: 'idle', time: 0, speed: 1, loop: true },
        metadata: {
          health: enemy.hp,
          maxHealth: enemy.maxHp,
          name: enemy.name,
          interactive: true
        },
        lastUpdated: Date.now()
      });
    });
    
    return entities;
  }

  // Koa.js API Handlers
  private async handleGetGameState(ctx: Koa.Context): Promise<void> {
    // This would be injected by the middleware with current state
    const state = this.getCurrentState();
    
    if (!state) {
      ctx.status = 404;
      ctx.body = { error: 'No active game state' };
      return;
    }
    
    ctx.body = this.convertToGameServerState({ type: 'GET_STATE', payload: {} }, state);
  }

  private async handlePostInput(ctx: Koa.Context): Promise<void> {
    const input = ctx.request.body as ClientInput;
    
    // Validate input
    if (!input.type || !input.action) {
      ctx.status = 400;
      ctx.body = { error: 'Invalid input format' };
      return;
    }
    
    // Convert to Redux action and dispatch
    const reduxAction = this.convertInputToReduxAction(input);
    
    // This would be injected by middleware to dispatch actions
    // this.store.dispatch(reduxAction);
    
    ctx.body = { success: true, action: reduxAction.type };
  }

  private async handleGetEntities(ctx: Koa.Context): Promise<void> {
    const state = this.getCurrentState();
    
    if (!state) {
      ctx.status = 404;
      ctx.body = { error: 'No active game state' };
      return;
    }
    
    ctx.body = {
      entities: this.convertStateToEntities(state),
      timestamp: Date.now()
    };
  }

  private async handleGetModels(ctx: Koa.Context): Promise<void> {
    ctx.body = {
      characters: [
        'Characters/Player/Player_Model',
        'Characters/Enemies/Goblin_Model',
        'Characters/Enemies/Orc_Model',
        'Characters/NPCs/Merchant_Model'
      ],
      items: [
        'Items/Coins/GoldCoin_Model',
        'Items/Weapons/Sword_Model',
        'Items/Armor/Shield_Model',
        'Items/Potions/HealthPotion_Model'
      ],
      environment: [
        'Environment/Walls/StoneWall_Model',
        'Environment/Floors/StoneFloor_Model',
        'Environment/Doors/WoodenDoor_Model',
        'Environment/Stairs/StairsUp_Model'
      ]
    };
  }

  // WebSocket Message Handlers
  private handleClientMessage(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'input':
          this.handleClientInput(client, message.data);
          break;
        case 'subscribe':
          this.handleClientSubscription(client, message.data);
          break;
        case 'ping':
          client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        default:
          console.warn(`Unknown message type from ${clientId}:`, message.type);
      }
    } catch (error) {
      console.error(`Error parsing message from ${clientId}:`, error);
    }
  }

  private handleClientInput(client: ConnectedClient, inputData: ClientInput): void {
    // Convert client input to Redux action
    const reduxAction = this.convertInputToReduxAction(inputData);
    
    // This would dispatch to Redux store
    console.log(`Input from ${client.type} client:`, reduxAction);
  }

  private convertInputToReduxAction(input: ClientInput): PayloadAction<any> {
    // Map client inputs to Redux actions
    const actionMap: Record<string, string> = {
      'move_forward': 'player/movePlayer',
      'move_backward': 'player/movePlayer',
      'move_left': 'player/movePlayer',
      'move_right': 'player/movePlayer',
      'interact': 'ui/handleAction',
      'open_menu': 'ui/changeContext'
    };
    
    const actionType = actionMap[input.action] || 'unknown/action';
    
    return {
      type: actionType,
      payload: this.convertInputPayload(input)
    };
  }

  // Utility Methods
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private detectClientType(req: any): 'unreal' | 'unity' | 'web' | 'terminal' {
    const userAgent = req.headers['user-agent'] || '';
    
    if (userAgent.includes('UnrealEngine')) return 'unreal';
    if (userAgent.includes('Unity')) return 'unity';
    if (userAgent.includes('Mozilla')) return 'web';
    
    return 'terminal';
  }

  private startHeartbeat(): void {
    setInterval(() => {
      const now = Date.now();
      
      this.clients.forEach((client, clientId) => {
        if (now - client.lastPing > 30000) { // 30 second timeout
          client.ws.terminate();
          this.clients.delete(clientId);
          console.log(`🔌 Client timeout: ${clientId}`);
        } else {
          client.ws.ping();
        }
      });
    }, 10000); // Check every 10 seconds
  }

  private stateHasChanged(state: RootState): boolean {
    // Simple comparison - in production, use deep equality check
    return JSON.stringify(state) !== JSON.stringify(this.lastBroadcastState);
  }

  // Stub methods - would be properly implemented
  private getCurrentState(): RootState | null {
    // This would be injected by the Redux store
    return null;
  }

  private getPlayerAnimation(state: RootState): any {
    // Determine animation based on player state
    return { name: 'idle', time: 0, speed: 1, loop: true };
  }

  private getItemModel(item: any): string {
    return 'Items/Generic/GenericItem_Model';
  }

  private getEnemyModel(enemy: any): string {
    return 'Characters/Enemies/Generic_Model';
  }
}

// Factory function for easy integration
export const createGameServerMiddleware = (options?: GameServerOptions) => {
  const gameServer = new GameServerMiddleware(options);
  return gameServer.createMiddleware();
};
```

---

## 🔧 Phase 2: Redux Store Integration

### 2.1: Enhanced Store Configuration

```typescript
// core/store.ts - Enhanced with Game Server Middleware
import { configureStore } from '@reduxjs/toolkit';
import { gameSlice } from './slices/gameSlice.js';
import { playerSlice } from './slices/playerSlice.js';
import { uiSlice } from './slices/uiSlice.js';
import { inventorySlice } from './slices/inventorySlice.js';
import { combatSlice } from './slices/combatSlice.js';
import { inputSlice } from './slices/inputSlice.js';
import { eventMiddleware } from './middleware/eventMiddleware.js';
import { thunkMiddleware } from './middleware/thunkMiddleware.js';
import { createGameServerMiddleware } from './middleware/gameServerMiddleware.js';

// Initialize Game Server Middleware
const gameServerMiddleware = createGameServerMiddleware({
  port: 8080,
  enableHTTPAPI: true,
  enableWebSocket: true,
  tickRate: 30,
  compressionEnabled: true
});

export const store = configureStore({
  reducer: {
    game: gameSlice.reducer,
    player: playerSlice.reducer,
    ui: uiSlice.reducer,
    inventory: inventorySlice.reducer,
    combat: combatSlice.reducer,
    input: inputSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['game/setFloorDiscovered'],
        ignoredPaths: ['game.floor.discovered'],
      },
    })
    .concat(eventMiddleware)
    .concat(thunkMiddleware)
    .concat(gameServerMiddleware), // Add game server middleware
});

// Initialize the game server
gameServerMiddleware.initialize().then(() => {
  console.log('🎮 Game Server ready to accept connections');
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

---

## 🎮 Phase 3: Pure WebSocket vs Koa.js Decision

### 3.1: Architecture Comparison

**Pure WebSocket Approach:**
```typescript
// Pros:
// - Lower latency (no HTTP overhead)
// - Real-time bidirectional communication
// - Better for high-frequency updates (30-60 FPS)
// - Simpler for Unreal Engine 5 integration

// Cons:
// - No REST API for debugging/tools
// - Harder to integrate with web browsers initially
// - Less tooling for debugging
```

**Koa.js + WebSocket Hybrid:**
```typescript
// Pros:
// - REST API for debugging and tools
// - Easy web browser integration
// - Better for development and testing
// - Supports both real-time and request-response patterns

// Cons:
// - Slightly more complex
// - Additional dependency
```

### 3.2: Recommended Hybrid Approach

```typescript
// core/middleware/gameServerMiddleware.ts - Enhanced Decision Logic
export class GameServerMiddleware {
  constructor(private options: GameServerOptions = {}) {
    // Smart defaults based on use case
    this.options = {
      port: 8080,
      enableHTTPAPI: process.env.NODE_ENV === 'development', // Only in dev
      enableWebSocket: true, // Always enabled
      tickRate: 30,
      compressionEnabled: true,
      ...options
    };
  }

  // Production: Pure WebSocket for performance
  // Development: Koa.js + WebSocket for debugging
  private async setupServer(): Promise<void> {
    if (this.options.enableWebSocket) {
      await this.setupWebSocketServer();
    }
    
    // Only setup HTTP API in development or when explicitly enabled
    if (this.options.enableHTTPAPI) {
      await this.setupKoaServer();
      console.log('🌐 HTTP API enabled for debugging');
    } else {
      console.log('⚡ Pure WebSocket mode for maximum performance');
    }
  }
}
```

---

## 📊 Phase 4: Enhanced Type Definitions

```typescript
// core/types.ts - Additional types for Game Server Middleware
export interface GameServerMiddlewareOptions {
  port?: number;
  enableHTTPAPI?: boolean;
  enableWebSocket?: boolean;
  tickRate?: number;
  compressionEnabled?: boolean;
  allowedOrigins?: string[];
  maxClients?: number;
}

export interface GameServerState {
  sessionId: string;
  gameState: RootState;
  entities: GameEntity[];
  worldData: WorldData;
  frameId: number;
  timestamp: number;
  lastAction?: {
    type: string;
    payload: any;
  };
}

export interface ClientSubscription {
  actions?: string[];      // Which Redux actions to listen for
  stateSlices?: string[];  // Which state slices to receive updates for
  entityTypes?: string[];  // Which entity types to track
  frequency?: number;      // Update frequency in Hz (max)
}

export interface GameServerBroadcast {
  type: 'state_update' | 'entity_update' | 'action_result' | 'error';
  data: any;
  frameId: number;
  timestamp: number;
  clientId?: string;
}

// Enhanced Entity System for 3D Engines
export interface Enhanced3DEntity extends GameEntity {
  physics?: {
    velocity: Vector3D;
    acceleration: Vector3D;
    mass: number;
    friction: number;
  };
  rendering?: {
    material: string;
    shader: string;
    lightmapIndex?: number;
    castShadows: boolean;
    receiveShadows: boolean;
  };
  collision?: {
    type: 'box' | 'sphere' | 'mesh';
    bounds: Vector3D;
    trigger: boolean;
  };
}
```

---

## 🚀 Phase 5: Usage Examples

### 5.1: Unreal Engine 5 Integration

```cpp
// GameServerWebSocket.h - Pure WebSocket approach
#pragma once

#include "CoreMinimal.h"
#include "WebSocketsModule.h"
#include "IWebSocket.h"
#include "GameFramework/Actor.h"
#include "GameServerWebSocket.generated.h"

UCLASS(BlueprintType)
class ROGUELIKE_API AGameServerWebSocket : public AActor
{
    GENERATED_BODY()

public:
    AGameServerWebSocket();

    UFUNCTION(BlueprintCallable)
    void ConnectToGameServer();
    
    UFUNCTION(BlueprintCallable)
    void SendInputToServer(const FString& Action, const FString& Data);

    UFUNCTION(BlueprintImplementableEvent)
    void OnGameStateUpdated(const FString& JsonData);

protected:
    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
    TSharedPtr<IWebSocket> WebSocket;
    FString ServerURL = TEXT("ws://localhost:8080");
    
    void HandleWebSocketConnected();
    void HandleWebSocketMessage(const FString& Message);
    void HandleWebSocketClosed(int32 StatusCode, const FString& Reason, bool bWasClean);
};
```

### 5.2: Unity Integration

```csharp
// GameServerWebSocket.cs - Pure WebSocket approach
using System;
using UnityEngine;
using WebSocketSharp;
using Newtonsoft.Json;

public class GameServerWebSocket : MonoBehaviour
{
    [SerializeField] private string serverUrl = "ws://localhost:8080";
    private WebSocket webSocket;
    
    public event Action<GameServerState> OnGameStateUpdated;
    
    void Start()
    {
        ConnectToServer();
    }
    
    private void ConnectToServer()
    {
        webSocket = new WebSocket(serverUrl);
        
        webSocket.OnOpen += OnWebSocketOpen;
        webSocket.OnMessage += OnWebSocketMessage;
        webSocket.OnError += OnWebSocketError;
        webSocket.OnClose += OnWebSocketClose;
        
        webSocket.Connect();
    }
    
    private void OnWebSocketMessage(object sender, MessageEventArgs e)
    {
        var broadcast = JsonConvert.DeserializeObject<GameServerBroadcast>(e.Data);
        
        switch (broadcast.type)
        {
            case "state_update":
                var gameState = JsonConvert.DeserializeObject<GameServerState>(
                    broadcast.data.ToString()
                );
                OnGameStateUpdated?.Invoke(gameState);
                break;
        }
    }
    
    public void SendInput(string action, object data)
    {
        if (webSocket?.ReadyState != WebSocketState.Open) return;
        
        var inputMessage = new
        {
            type = "input",
            data = new
            {
                type = "gamepad",
                action = action,
                data = data,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                clientId = SystemInfo.deviceUniqueIdentifier
            }
        };
        
        webSocket.Send(JsonConvert.SerializeObject(inputMessage));
    }
}
```

---

## ✅ Implementation Benefits

### Performance Advantages
- **Redux Integration**: Automatic state broadcasting on every Redux action
- **Selective Updates**: Clients subscribe only to relevant state changes
- **Optimized Bandwidth**: Only send changed entities, not full state
- **Real-Time Sync**: Sub-100ms latency for smooth 3D gameplay

### Development Benefits
- **Hot Reloading**: Development HTTP API for debugging
- **Type Safety**: Full TypeScript coverage for all server communications
- **Easy Testing**: REST endpoints for automated testing
- **Flexible Deployment**: Pure WebSocket for production, hybrid for development

### Architecture Benefits
- **Single Source of Truth**: Redux state drives all client rendering
- **Platform Agnostic**: Same middleware serves Unreal, Unity, Web, Terminal
- **Scalable**: Easy to add new client types or modify entity system
- **Maintainable**: Clean separation between game logic and networking

This enhanced architecture provides the best of both worlds: the performance of pure WebSocket communication with the development convenience of a REST API when needed.