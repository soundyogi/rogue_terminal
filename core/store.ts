/**
 * Redux Toolkit Store for Roguelike Engine
 * Migrated from custom Redux implementation
 */

import { configureStore } from '@reduxjs/toolkit';
import type { ThunkAction, Action } from '@reduxjs/toolkit';
import { createEventMiddleware, defaultEventMap } from './middleware/eventMiddleware.js';
import { createGameServerMiddleware } from './middleware/gameServerMiddleware.js';

// Import Redux Toolkit slice reducers
import gameReducer from './slices/gameSlice.js';
import playerReducer from './slices/playerSlice.js';
import uiReducer from './slices/uiSlice.js';
import inventoryReducer from './slices/inventorySlice.js';
import combatReducer from './slices/combatSlice.js';
import inputReducer from './slices/inputSlice.js';

// Import RNG for initial state
import { gameRNG } from './rng.js';

// Import types
import type { RootState, EnhancedStore } from './types.js';

// Create the event middleware
const eventMiddleware = createEventMiddleware(defaultEventMap);

// Initialize Game Server Middleware with smart defaults
const gameServerMiddleware = createGameServerMiddleware({
  port: 8080,
  enableHTTPAPI: process.env.NODE_ENV === 'development', // Only in dev mode
  enableWebSocket: true,
  tickRate: 30,
  compressionEnabled: true,
  maxClients: 100
});

// Configure the Redux Toolkit store
const store = configureStore({
    reducer: {
        game: gameReducer,
        player: playerReducer,
        ui: uiReducer,
        inventory: inventoryReducer,
        combat: combatReducer,
        input: inputReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            // Configure for our use case
            serializableCheck: {
                // Ignore these action types
                ignoredActions: ['persist/PERSIST'],
                // Ignore these field paths in all actions
                ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
                // Ignore these paths in the state
                ignoredPaths: ['game.floor.discovered'] // Set objects are not serializable
            }
        })
        .concat(eventMiddleware)
        .concat(gameServerMiddleware), // Add game server middleware
    
    devTools: process.env.NODE_ENV !== 'production' && {
        name: 'Roguelike Engine',
        trace: true,
        traceLimit: 25
    }
});

// Type the store and dispatch
export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;

// Store enhancement for compatibility with legacy code
interface LegacyCompatibilityMethods {
    events: {
        emit: (eventType: string, data: any) => void;
    };
    getSlice: (sliceName: keyof RootState) => any;
    history: any[];
    maxHistorySize: number;
    addToHistory: (state: RootState) => void;
    undo: () => void;
}

// Extend store with legacy methods
const enhancedStore = store as AppStore & LegacyCompatibilityMethods;

enhancedStore.events = {
    emit: (eventType: string, data: any): void => {
        // Events are now handled by the eventMiddleware
        console.log(`Event: ${eventType}`, data);
    }
};

// Legacy compatibility methods
enhancedStore.getSlice = (sliceName: keyof RootState): any => {
    const state = enhancedStore.getState();
    return state[sliceName];
};

enhancedStore.history = [];
enhancedStore.maxHistorySize = 100;

enhancedStore.addToHistory = (state: RootState): void => {
    enhancedStore.history.push(JSON.parse(JSON.stringify(state)));
    if (enhancedStore.history.length > enhancedStore.maxHistorySize) {
        enhancedStore.history = enhancedStore.history.slice(-enhancedStore.maxHistorySize);
    }
};

enhancedStore.undo = (): void => {
    if (enhancedStore.history.length > 0) {
        const previousState = enhancedStore.history.pop();
        // Note: In Redux Toolkit, we can't directly set state
        // This would need to be implemented as an action
        console.warn('Undo functionality needs to be implemented as Redux action');
    }
};

// Initialize RNG state in the store
enhancedStore.dispatch({ 
    type: 'game/initializeGame', 
    payload: { 
        seed: gameRNG.getState().seed,
        mode: 'gambling' as const
    }
});

// Export enhanced store as default
export default enhancedStore;

// Legacy export for compatibility
export { enhancedStore as Store };

// Export types for use in other files
export type { RootState };
export type AppThunk<ReturnType = void> = ThunkAction<
    ReturnType,
    RootState,
    unknown,
    Action<string>
>;
