/**
 * Redux Toolkit Store for Roguelike Engine
 * Migrated from custom Redux implementation
 */

import { configureStore } from '@reduxjs/toolkit';
import { createEventMiddleware, defaultEventMap } from './middleware/eventMiddleware.js';

// Import Redux Toolkit slice reducers
import gameReducer from './slices/gameSlice.js';
import playerReducer from './slices/playerSlice.js';
import uiReducer from './slices/uiSlice.js';
import inventoryReducer from './slices/inventorySlice.js';
import combatReducer from './slices/combatSlice.js';
import inputReducer from './slices/inputSlice.js';

// Import RNG for initial state
import { gameRNG } from './rng.js';

// Create the event middleware
const eventMiddleware = createEventMiddleware(defaultEventMap);

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
        }).concat(eventMiddleware),
    
    devTools: process.env.NODE_ENV !== 'production' && {
        name: 'Roguelike Engine',
        trace: true,
        traceLimit: 25
    }
});

// Store enhancement for compatibility with legacy code
store.events = {
    emit: (eventType, data) => {
        // Events are now handled by the eventMiddleware
        console.log(`Event: ${eventType}`, data);
    }
};

// Legacy compatibility methods
store.getSlice = (sliceName) => {
    const state = store.getState();
    return state[sliceName];
};

store.history = [];
store.maxHistorySize = 100;

store.addToHistory = (state) => {
    store.history.push(JSON.parse(JSON.stringify(state)));
    if (store.history.length > store.maxHistorySize) {
        store.history = store.history.slice(-store.maxHistorySize);
    }
};

store.undo = () => {
    if (store.history.length > 0) {
        const previousState = store.history.pop();
        // Note: In Redux Toolkit, we can't directly set state
        // This would need to be implemented as an action
        console.warn('Undo functionality needs to be implemented as Redux action');
    }
};

// Initialize RNG state in the store
store.dispatch({ type: 'game/initializeGame', payload: { 
    seed: gameRNG.getState().seed,
    mode: 'gambling'
}});

export default store;

// Legacy export for compatibility
export { store as Store };
