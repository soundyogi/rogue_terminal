/**
 * Simple Game Class for Redux Integration
 * Coordinates store, input, and rendering
 */

import { events, EVENT_TYPES } from './events.js';
import { gameRNG } from './rng.js';
import store from './store.js';

// Import types
import type { 
    RootState, 
    Renderer, 
    ActionsConfig, 
    GameController 
} from './types.js';
import type { AppStore } from './store.js';

export class Game implements GameController {
    public running: boolean = false;
    public renderer: Renderer | null = null;
    public actionsConfig: ActionsConfig | null = null;
    public store: AppStore | null = null;
    
    constructor() {
        // Bind methods
        this.update = this.update.bind(this);
    }

    /**
     * Initialize game with required dependencies
     */
    async initialize(renderer: Renderer, actionsConfig: ActionsConfig): Promise<boolean> {
        try {
            console.log('Initializing game with Redux Toolkit store...');
            
            // Store dependencies
            this.renderer = renderer;
            this.actionsConfig = actionsConfig;
            
            // Use the Redux Toolkit store
            this.store = store;
            
            // Subscribe to state changes for rendering
            this.store.subscribe(() => {
                if (this.renderer && this.running && this.store) {
                    const state = this.store.getState();
                    this.renderer.render(state);
                }
            });

            // Initialize RNG with seed from state
            const state = this.store.getState();
            gameRNG.setSeed(state.game.seed);

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
    start(): void {
        if (this.running) {
            console.warn('Game is already running');
            return;
        }

        this.running = true;
        console.log('Game started');

        // Emit initial events
        events.emit(EVENT_TYPES.GAME_START, { timestamp: Date.now() });

        // Initial render
        if (this.renderer && this.store) {
            this.renderer.render(this.store.getState());
        }
    }

    /**
     * Stop the game
     */
    stop(): void {
        this.running = false;
        events.emit(EVENT_TYPES.GAME_END, { timestamp: Date.now() });
        console.log('Game stopped');
    }

    /**
     * Update game state (called by external game loop if needed)
     */
    update(deltaTime: number): void {
        if (!this.running) return;

        // Update systems that need time-based updates
        // For now, just emit update event
        events.emit(EVENT_TYPES.GAME_UPDATE, { deltaTime, timestamp: Date.now() });
    }

    /**
     * Get current game state
     */
    getState(): RootState | null {
        return this.store ? this.store.getState() : null;
    }

    /**
     * Dispatch action to store
     */
    dispatch(action: any): any {
        if (this.store) {
            return this.store.dispatch(action);
        }
        return false;
    }

    /**
     * Register a state change listener
     */
    subscribe(callback: () => void): () => void {
        if (this.store) {
            return this.store.subscribe(callback);
        }
        return () => {};
    }

    /**
     * Undo last action
     */
    undo(): boolean {
        if (this.store) {
            // Note: This assumes the store has been enhanced with undo functionality
            return (this.store as any).undo();
        }
        return false;
    }

    /**
     * Save current state
     */
    save(): RootState | null {
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
    load(savedState: RootState): boolean {
        if (this.store && savedState) {
            // Replace current state (this is a bit hacky, but works for demo)
            // Note: In a proper implementation, this would use a Redux action
            (this.store as any).state = savedState;
            
            // Notify subscribers manually
            if ((this.store as any).notifySubscribers) {
                (this.store as any).notifySubscribers({ 
                    type: 'LOAD_GAME', 
                    timestamp: Date.now() 
                });
            }
            
            events.emit(EVENT_TYPES.GAME_LOAD, { 
                state: savedState, 
                timestamp: Date.now() 
            });
            return true;
        }
        return false;
    }
}

// Create default game instance
export const game = new Game();
