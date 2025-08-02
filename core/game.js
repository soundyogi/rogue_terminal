/**
 * Simple Game Class for Redux Integration
 * Coordinates store, input, and rendering
 */

import { events, EVENT_TYPES } from './events.js';
import { gameRNG } from './rng.js';
import store from './store.js';

export class Game {
    constructor() {
        this.running = false;
        this.renderer = null;
        this.actionsConfig = null;
        this.store = null;
        
        // Bind methods
        this.update = this.update.bind(this);
    }

    /**
     * Initialize game with required dependencies
     */
    async initialize(renderer, actionsConfig) {
        try {
            console.log('Initializing game with Redux Toolkit store...');
            
            // Store dependencies
            this.renderer = renderer;
            this.actionsConfig = actionsConfig;
            
            // Use the Redux Toolkit store
            this.store = store;
            
            // Subscribe to state changes for rendering
            this.store.subscribe(() => {
                if (this.renderer && this.running) {
                    const state = this.store.getState();
                    this.renderer.render(state);
                }
            });

            // Initialize RNG with seed from state
            const state = this.store.getState();
            gameRNG.seed(state.game.seed);

            console.log('Game initialized successfully with Redux Toolkit');
            return true;

        } catch (error) {
            console.error('Game initialization failed:', error);
            return false;
        }
    }

    /**
     * Start the game
     */
    start() {
        if (this.running) {
            console.warn('Game is already running');
            return;
        }

        this.running = true;
        console.log('Game started');

        // Emit initial events
        events.emit(EVENT_TYPES.GAME_START, { timestamp: Date.now() });

        // Initial render
        if (this.renderer) {
            this.renderer.render(this.store.getState());
        }
    }

    /**
     * Stop the game
     */
    stop() {
        this.running = false;
        events.emit(EVENT_TYPES.GAME_END, { timestamp: Date.now() });
        console.log('Game stopped');
    }


    /**
     * Update game state (called by external game loop if needed)
     */
    update(deltaTime) {
        if (!this.running) return;

        // Update systems that need time-based updates
        // For now, just emit update event
        events.emit(EVENT_TYPES.GAME_UPDATE, { deltaTime, timestamp: Date.now() });
    }

    /**
     * Get current game state
     */
    getState() {
        return this.store ? this.store.getState() : null;
    }

    /**
     * Dispatch action to store
     */
    dispatch(action) {
        if (this.store) {
            return this.store.dispatch(action);
        }
        return false;
    }

    /**
     * Register a state change listener
     */
    subscribe(callback) {
        if (this.store) {
            return this.store.subscribe(callback);
        }
        return () => {};
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.store) {
            return this.store.undo();
        }
        return false;
    }

    /**
     * Save current state
     */
    save() {
        const state = this.getState();
        if (state) {
            // For now, just emit save event
            events.emit(EVENT_TYPES.GAME_SAVE, { state, timestamp: Date.now() });
            return state;
        }
        return null;
    }

    /**
     * Load state
     */
    load(savedState) {
        if (this.store && savedState) {
            // Replace current state (this is a bit hacky, but works for demo)
            this.store.state = savedState;
            this.store.notifySubscribers({ type: 'LOAD_GAME', timestamp: Date.now() });
            
            events.emit(EVENT_TYPES.GAME_LOAD, { state: savedState, timestamp: Date.now() });
            return true;
        }
        return false;
    }
}

// Create default game instance
export const game = new Game();
