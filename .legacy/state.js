/**
 * State Management System
 * Handles game state with immutable updates and history tracking
 */

import { events, EVENT_TYPES } from './events.js';
import { gameRNG } from './rng.js';

export class GameState {
    constructor(initialState = null) {
        this.state = initialState || this.createInitialState();
        this.history = [this.deepClone(this.state)];
        this.maxHistorySize = 100; // Limit history for memory management
        this.version = "1.0.0";
    }

    /**
     * Create the initial game state
     */
    createInitialState() {
        return {
            version: this.version,
            timestamp: Date.now(),
            seed: 12345,
            player: {
                x: 5,
                y: 5,
                hp: 100,
                maxHp: 100,
                mp: 20,
                maxMp: 20,
                level: 1,
                experience: 0,
                experienceToNext: 100,
                coins: 50,
                inventory: ["lucky_coin"],
                stats: {
                    luck: 1.0,
                    speed: 1.0,
                    strength: 1.0,
                    defense: 1.0,
                    wisdom: 1.0,
                    agility: 1.0
                },
                equipment: {
                    weapon: null,
                    armor: null,
                    accessory1: null,
                    accessory2: null
                }
            },
            floor: {
                current: 1,
                layout: null,
                enemies: [],
                items: [],
                discovered: new Set(), // Serialized as array
                exits: []
            },
            gameMode: "gambling", // or "marble", "jrpg", "idle"
            currentGame: null, // Current gambling game, combat, etc.
            ui: {
                selectedOption: 0,
                selectedIndex: 0,
                currentContext: 'world',
                showInventory: false,
                showStats: false,
                highlightedInteraction: null,
                contextData: null,
                logMessages: []
            },
            rng: gameRNG.getState(),
            flags: {}, // Story flags, unlocks, etc.
            achievements: [],
            totalPlayTime: 0,
            gamesPlayed: 0,
            floorsCleared: 0
        };
    }

    /**
     * Get current state (immutable)
     */
    get() {
        return this.deepClone(this.state);
    }

    /**
     * Update state with changes
     */
    update(changes) {
        const oldState = this.deepClone(this.state);
        
        try {
            // Apply changes to state
            const newState = this.applyChanges(this.state, changes);
            
            // Validate new state
            if (this.validateState(newState)) {
                // Add to history
                this.addToHistory(this.state);
                
                // Update current state
                this.state = newState;
                this.state.timestamp = Date.now();
                
                // Emit state change event
                events.emit(EVENT_TYPES.STATE_CHANGED, {
                    oldState,
                    newState: this.deepClone(this.state),
                    changes
                });
                
                return true;
            } else {
                console.warn('State validation failed, reverting changes');
                return false;
            }
        } catch (error) {
            console.error('Error updating state:', error);
            return false;
        }
    }

    /**
     * Apply changes to state object
     */
    applyChanges(state, changes) {
        const newState = this.deepClone(state);
        
        if (Array.isArray(changes)) {
            // Multiple changes
            changes.forEach(change => {
                this.applyChange(newState, change);
            });
        } else {
            // Single change
            this.applyChange(newState, changes);
        }
        
        return newState;
    }

    /**
     * Apply a single change to state
     */
    applyChange(state, change) {
        if (change.path) {
            // Path-based update (e.g., "player.hp")
            this.setNestedProperty(state, change.path, change.value);
        } else if (change.merge) {
            // Merge objects
            Object.assign(state, change.merge);
        } else if (change.arrayPush) {
            // Push to array
            const array = this.getNestedProperty(state, change.arrayPush.path);
            if (Array.isArray(array)) {
                array.push(change.arrayPush.value);
            }
        } else if (change.arrayRemove) {
            // Remove from array
            const array = this.getNestedProperty(state, change.arrayRemove.path);
            if (Array.isArray(array)) {
                const index = array.indexOf(change.arrayRemove.value);
                if (index !== -1) {
                    array.splice(index, 1);
                }
            }
        }
    }

    /**
     * Set nested property using dot notation
     */
    setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    /**
     * Get nested property using dot notation
     */
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Validate state integrity
     */
    validateState(state) {
        try {
            // Basic validations
            if (!state.player) return false;
            if (state.player.hp < 0) return false;
            if (state.player.hp > state.player.maxHp) return false;
            if (state.player.mp < 0) return false;
            if (state.player.mp > state.player.maxMp) return false;
            if (state.player.coins < 0) return false;
            if (state.floor.current < 1) return false;
            if (!Array.isArray(state.player.inventory)) return false;
            
            // Mode-specific validations
            if (state.gameMode === 'gambling' && state.currentGame) {
                // Validate gambling state
                if (typeof state.currentGame.bet !== 'number') return false;
                if (state.currentGame.bet > state.player.coins) return false;
            }
            
            return true;
        } catch (error) {
            console.error('State validation error:', error);
            return false;
        }
    }

    /**
     * Add state to history
     */
    addToHistory(state) {
        this.history.push(this.deepClone(state));
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    /**
     * Undo last change
     */
    undo() {
        if (this.history.length > 1) {
            this.history.pop(); // Remove current state
            this.state = this.deepClone(this.history[this.history.length - 1]);
            
            events.emit(EVENT_TYPES.STATE_CHANGED, {
                action: 'undo',
                newState: this.deepClone(this.state)
            });
            
            return true;
        }
        return false;
    }

    /**
     * Serialize state for saving
     */
    serialize() {
        const state = this.deepClone(this.state);
        
        // Convert Sets to Arrays for JSON serialization
        if (state.floor.discovered instanceof Set) {
            state.floor.discovered = Array.from(state.floor.discovered);
        }
        
        return JSON.stringify(state);
    }

    /**
     * Deserialize state from save
     */
    deserialize(data) {
        try {
            const state = JSON.parse(data);
            
            // Convert Arrays back to Sets
            if (Array.isArray(state.floor.discovered)) {
                state.floor.discovered = new Set(state.floor.discovered);
            }
            
            // Validate version compatibility
            if (state.version !== this.version) {
                console.warn(`Save version ${state.version} differs from current ${this.version}`);
                // Could implement migration logic here
            }
            
            if (this.validateState(state)) {
                this.state = state;
                this.history = [this.deepClone(state)];
                
                // Restore RNG state
                if (state.rng) {
                    gameRNG.setState(state.rng);
                }
                
                events.emit(EVENT_TYPES.STATE_LOADED, {
                    state: this.deepClone(this.state)
                });
                
                return true;
            } else {
                console.error('Loaded state failed validation');
                return false;
            }
        } catch (error) {
            console.error('Error deserializing state:', error);
            return false;
        }
    }

    /**
     * Reset to initial state
     */
    reset() {
        this.state = this.createInitialState();
        this.history = [this.deepClone(this.state)];
        gameRNG.setState(this.state.rng);
        
        events.emit(EVENT_TYPES.STATE_CHANGED, {
            action: 'reset',
            newState: this.deepClone(this.state)
        });
    }

    /**
     * Deep clone object
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Set) return new Set(Array.from(obj));
        if (obj instanceof Map) return new Map(Array.from(obj));
        if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        
        return cloned;
    }

    /**
     * Get state snapshot for debugging
     */
    getSnapshot() {
        return {
            state: this.deepClone(this.state),
            historyLength: this.history.length,
            version: this.version,
            timestamp: Date.now()
        };
    }

    /**
     * Quick access methods for common state operations
     */
    getPlayer() {
        return this.deepClone(this.state.player);
    }

    getFloor() {
        return this.deepClone(this.state.floor);
    }

    getCurrentGame() {
        return this.deepClone(this.state.currentGame);
    }

    addLogMessage(message, type = 'info') {
        this.update({
            arrayPush: {
                path: 'ui.logMessages',
                value: {
                    message,
                    type,
                    timestamp: Date.now()
                }
            }
        });
    }
}

// Global state instance
export const gameState = new GameState();
