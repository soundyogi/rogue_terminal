/**
 * Main Game Class
 * Orchestrates all systems: store, events, input, rendering
 */

import { events, EVENT_TYPES } from './events.js';
import { gameRNG } from './rng.js';
import { initializeStore, store, dispatch } from './store.js';
import { unifiedInput } from './unified-input.js';

export class GameEngine {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.lastUpdate = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        this.gameLoopId = null;
        
        // Game modes
        this.modes = new Map();
        this.currentMode = null;
        
        // Initialize event listeners
        this.setupEventListeners();
    }

    /**
     * Initialize the game
     */
    async initialize(config = {}) {
        try {
            console.log('Initializing Roguelike Engine...');
            
            // Set up RNG seed
            if (config.seed) {
                gameRNG.setSeed(config.seed);
                gameState.update({ path: 'seed', value: config.seed });
            }
            
            // Load initial game mode
            const initialMode = config.mode || 'gambling';
            await this.switchMode(initialMode);
            
            // Set up initial state
            if (config.initialState) {
                gameState.deserialize(config.initialState);
            }
            
            console.log('Game engine initialized successfully');
            
            events.emit(EVENT_TYPES.GAME_START, {
                mode: initialMode,
                seed: gameState.get().seed
            });
            
            return true;
        } catch (error) {
            console.error('Failed to initialize game engine:', error);
            return false;
        }
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) {
            console.warn('Game is already running');
            return;
        }
        
        this.isRunning = true;
        this.isPaused = false;
        this.lastUpdate = performance.now();
        
        console.log('Starting game loop...');
        this.gameLoop();
        
        events.emit(EVENT_TYPES.GAME_RESUME);
    }

    /**
     * Stop the game loop
     */
    stop() {
        this.isRunning = false;
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        
        console.log('Game loop stopped');
        events.emit(EVENT_TYPES.GAME_END);
    }

    /**
     * Pause the game
     */
    pause() {
        this.isPaused = true;
        console.log('Game paused');
        events.emit(EVENT_TYPES.GAME_PAUSE);
    }

    /**
     * Resume the game
     */
    resume() {
        this.isPaused = false;
        this.lastUpdate = performance.now();
        console.log('Game resumed');
        events.emit(EVENT_TYPES.GAME_RESUME);
    }

    /**
     * Main game loop
     */
    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastUpdate;
        
        if (deltaTime >= this.frameInterval) {
            if (!this.isPaused) {
                this.update(deltaTime);
            }
            this.lastUpdate = currentTime;
        }
        
        this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * Update game state
     */
    update(deltaTime) {
        try {
            // Update current game mode
            if (this.currentMode && this.currentMode.update) {
                this.currentMode.update(deltaTime);
            }
            
            // Update play time
            const state = gameState.get();
            gameState.update({
                path: 'totalPlayTime',
                value: state.totalPlayTime + deltaTime
            });
            
            // Process any queued actions
            this.processQueuedActions();
            
            // Update RNG state in game state
            gameState.update({
                path: 'rng',
                value: gameRNG.getState()
            });
            
        } catch (error) {
            console.error('Error in game update:', error);
            events.emit(EVENT_TYPES.ERROR, { error, context: 'game_update' });
        }
    }

    /**
     * Switch to a different game mode
     */
    async switchMode(modeName) {
        try {
            console.log(`Switching to ${modeName} mode...`);
            
            // Stop current mode if any
            if (this.currentMode && this.currentMode.stop) {
                this.currentMode.stop();
            }
            
            // Load new mode
            const ModeClass = this.modes.get(modeName);
            if (!ModeClass) {
                // Try to load mode dynamically
                await this.loadMode(modeName);
                const LoadedModeClass = this.modes.get(modeName);
                if (!LoadedModeClass) {
                    throw new Error(`Mode '${modeName}' not found`);
                }
                this.currentMode = new LoadedModeClass(this);
            } else {
                this.currentMode = new ModeClass(this);
            }
            
            // Initialize new mode
            if (this.currentMode.initialize) {
                await this.currentMode.initialize();
            }
            
            // Update game state
            gameState.update({
                path: 'gameMode',
                value: modeName
            });
            
            console.log(`Switched to ${modeName} mode successfully`);
            
        } catch (error) {
            console.error(`Failed to switch to ${modeName} mode:`, error);
            throw error;
        }
    }

    /**
     * Register a game mode
     */
    registerMode(name, ModeClass) {
        this.modes.set(name, ModeClass);
        console.log(`Registered game mode: ${name}`);
    }

    /**
     * Load a game mode dynamically
     */
    async loadMode(modeName) {
        try {
            // In a real implementation, this would load mode files
            // For now, we'll create basic mode classes
            const BasicMode = class {
                constructor(engine) {
                    this.engine = engine;
                    this.name = modeName;
                }
                
                async initialize() {
                    console.log(`${this.name} mode initialized`);
                }
                
                update(deltaTime) {
                    // Basic update logic
                }
                
                stop() {
                    console.log(`${this.name} mode stopped`);
                }
            };
            
            this.registerMode(modeName, BasicMode);
            
        } catch (error) {
            console.error(`Failed to load mode ${modeName}:`, error);
            throw error;
        }
    }

    /**
     * Handle user input through unified interface
     */
    handleInput(inputType, data) {
        try {
            events.emit(EVENT_TYPES.INPUT_RECEIVED, { inputType, data });
            
            // Route input through unified input system
            switch (inputType) {
                case 'direction':
                    return unifiedInput.handleDirection(data.direction);
                    
                case 'action':
                    return unifiedInput.handleAction();
                    
                case 'cancel':
                    return unifiedInput.handleCancel();
                    
                case 'key':
                    return this.handleKeyInput(data.key);
                    
                default:
                    console.warn(`Unknown input type: ${inputType}`);
                    return false;
            }
            
        } catch (error) {
            console.error('Error handling input:', error);
            events.emit(EVENT_TYPES.ERROR, { error, context: 'input_handling' });
            return false;
        }
    }

    /**
     * Handle keyboard input - map keys to unified input commands
     */
    handleKeyInput(key) {
        const keyMap = {
            // Directional movement
            'w': () => unifiedInput.handleDirection('up'),
            'arrowup': () => unifiedInput.handleDirection('up'),
            's': () => unifiedInput.handleDirection('down'),
            'arrowdown': () => unifiedInput.handleDirection('down'),
            'a': () => unifiedInput.handleDirection('left'),
            'arrowleft': () => unifiedInput.handleDirection('left'),
            'd': () => unifiedInput.handleDirection('right'),
            'arrowright': () => unifiedInput.handleDirection('right'),
            
            // Action button
            'enter': () => unifiedInput.handleAction(),
            ' ': () => unifiedInput.handleAction(),
            'z': () => unifiedInput.handleAction(),
            
            // Cancel/Back
            'escape': () => unifiedInput.handleCancel(),
            'x': () => unifiedInput.handleCancel(),
            
            // System controls
            'q': () => this.stop(),
            'p': () => this.isPaused ? this.resume() : this.pause()
        };

        const action = keyMap[key.toLowerCase()];
        if (action) {
            return action();
        } else {
            console.log(`Unmapped key: ${key}`);
            return false;
        }
    }

    /**
     * Process queued actions (placeholder for future action queue system)
     */
    processQueuedActions() {
        // Future implementation for turn-based action queuing
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for state changes to trigger renders
        events.on(EVENT_TYPES.STATE_CHANGED, (event) => {
            events.emit(EVENT_TYPES.RENDER_REQUEST, { state: event.data.newState });
        });

        // Handle errors
        events.on(EVENT_TYPES.ERROR, (event) => {
            console.error('Game Error:', event.data.error);
            // Could implement error recovery logic here
        });

        // Log important events
        events.on(EVENT_TYPES.PLAYER_MOVE, (event) => {
            gameState.addLogMessage(`Moved to ${event.data.to.x}, ${event.data.to.y}`);
        });

        events.on(EVENT_TYPES.GAMBLE_RESOLVED, (event) => {
            const { won, winnings, reason } = event.data;
            const message = won 
                ? `Won ${winnings} coins! ${reason}` 
                : `Lost bet. ${reason}`;
            gameState.addLogMessage(message, won ? 'success' : 'warning');
        });
    }

    /**
     * Get current game state
     */
    getState() {
        return gameState.get();
    }

    /**
     * Get engine status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            currentMode: this.currentMode ? this.currentMode.name : null,
            availableModes: Array.from(this.modes.keys()),
            lastUpdate: this.lastUpdate,
            targetFPS: this.targetFPS
        };
    }

    /**
     * Save game state
     */
    async save(slot = 'default') {
        try {
            const saveData = gameState.serialize();
            // In a real implementation, save to localStorage, file, or server
            console.log(`Game saved to slot '${slot}':`, saveData.length, 'bytes');
            
            events.emit(EVENT_TYPES.STATE_SAVED, { slot, timestamp: Date.now() });
            return true;
        } catch (error) {
            console.error('Save failed:', error);
            return false;
        }
    }

    /**
     * Load game state
     */
    async load(saveData) {
        try {
            const success = gameState.deserialize(saveData);
            if (success) {
                events.emit(EVENT_TYPES.STATE_LOADED, { timestamp: Date.now() });
            }
            return success;
        } catch (error) {
            console.error('Load failed:', error);
            return false;
        }
    }
}

// Global game engine instance
export const gameEngine = new GameEngine();

// Helper functions for external use
export const startGame = (config) => gameEngine.initialize(config).then(() => gameEngine.start());
export const stopGame = () => gameEngine.stop();
export const pauseGame = () => gameEngine.pause();
export const resumeGame = () => gameEngine.resume();
export const handleInput = (type, data) => gameEngine.handleInput(type, data);
