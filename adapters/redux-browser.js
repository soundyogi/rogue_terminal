/**
 * Redux Browser Adapter
 * Browser integration for Redux-based game
 */

import { game } from '../core/game.js';
import { renderer } from '../ui/renderer.js';
import { handleInput, handleAction } from '../core/inputThunks.js';

export class ReduxBrowserAdapter {
    constructor() {
        this.gameContainer = null;
        this.inputEnabled = true;
        this.keysPressed = new Set();
        
        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleClick = this.handleClick.bind(this);
    }

    /**
     * Initialize the adapter
     */
    async initialize(containerId = 'game-container') {
        try {
            console.log('Initializing Redux Browser Adapter...');
            
            // Check if we're in a browser environment
            if (typeof document === 'undefined') {
                console.log('Not in browser environment, skipping DOM initialization');
                return;
            }
            
            // Find or create game container
            this.gameContainer = document.getElementById(containerId);
            if (!this.gameContainer) {
                this.gameContainer = document.createElement('div');
                this.gameContainer.id = containerId;
                document.body.appendChild(this.gameContainer);
            }

            // Set up DOM structure
            this.setupDOM();
            
            // Set up input listeners
            this.setupInputListeners();
            
            // Load actions configuration
            const actionsConfig = await this.loadActionsConfig();
            
            // Initialize renderer
            renderer.initialize(this.gameContainer);
            
            // Initialize game with renderer and actions
            await game.initialize(renderer, actionsConfig);
            
            console.log('Redux Browser Adapter initialized successfully');
            return true;

        } catch (error) {
            console.error('Failed to initialize Redux Browser Adapter:', error);
            return false;
        }
    }

    /**
     * Set up DOM structure
     */
    setupDOM() {
        this.gameContainer.innerHTML = `
            <div id="game-display">
                <div id="ascii-display"></div>
                <div id="ui-overlay"></div>
            </div>
            <div id="debug-panel" style="display: none;">
                <div id="debug-info"></div>
                <button id="undo-btn">Undo</button>
                <button id="save-btn">Save</button>
                <button id="load-btn">Load</button>
            </div>
        `;

        // Style the container
        this.gameContainer.style.cssText = `
            font-family: 'Courier New', monospace;
            background: #000;
            color: #fff;
            padding: 10px;
            max-width: 800px;
            margin: 0 auto;
        `;

        // Set up debug buttons
        document.getElementById('undo-btn').addEventListener('click', () => {
            game.undo();
        });

        document.getElementById('save-btn').addEventListener('click', () => {
            const state = game.save();
            if (state) {
                localStorage.setItem('roguelike_save', JSON.stringify(state));
                console.log('Game saved to localStorage');
            }
        });

        document.getElementById('load-btn').addEventListener('click', () => {
            const saved = localStorage.getItem('roguelike_save');
            if (saved) {
                const state = JSON.parse(saved);
                game.load(state);
                console.log('Game loaded from localStorage');
            }
        });
    }

    /**
     * Set up input event listeners
     */
    setupInputListeners() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        this.gameContainer.addEventListener('click', this.handleClick);
        
        // Prevent default browser actions for game keys
        document.addEventListener('keydown', (e) => {
            const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Escape'];
            if (gameKeys.includes(e.code)) {
                e.preventDefault();
            }
        });
    }

    /**
     * Handle key down events
     */
    handleKeyDown(event) {
        if (!this.inputEnabled) return;

        // Prevent repeat key events
        if (this.keysPressed.has(event.code)) return;
        this.keysPressed.add(event.code);

        // Get current state
        const state = game.getState();
        if (!state) return;

        // Translate key press to input type and data
        const { inputType, inputData } = this.mapKeyEventToInput(event);

        if (inputType) {
            // Use the input thunk to handle input
            game.dispatch(handleInput({ inputType, inputData }));
        }

        // Debug keys
        if (event.code === 'F1') {
            this.toggleDebugPanel();
        }
    }

    /**
     * Handle key up events
     */
    handleKeyUp(event) {
        this.keysPressed.delete(event.code);
    }

    /**
     * Handle click events
     */
    handleClick(event) {
        if (!this.inputEnabled) return;

        const state = game.getState();
        if (!state) return;

        // Treat click as a generic 'action' input using input thunk
        game.dispatch(handleAction());
    }

    /**
     * Map keyboard events to abstract input types.
     */
    mapKeyEventToInput(event) {
        const { code } = event;

        // Directional Input (WASD and Arrow Keys)
        if (['ArrowUp', 'KeyW'].includes(code)) return { inputType: 'direction', inputData: { direction: 'up' } };
        if (['ArrowDown', 'KeyS'].includes(code)) return { inputType: 'direction', inputData: { direction: 'down' } };
        if (['ArrowLeft', 'KeyA'].includes(code)) return { inputType: 'direction', inputData: { direction: 'left' } };
        if (['ArrowRight', 'KeyD'].includes(code)) return { inputType: 'direction', inputData: { direction: 'right' } };

        // Action Input (Enter and Space)
        if (['Enter', 'Space'].includes(code)) return { inputType: 'action' };

        // Cancel Input (Escape)
        if (['Escape'].includes(code)) return { inputType: 'cancel' };

        // No mapping found
        return { inputType: null, inputData: {} };
    }

    /**
     * Toggle debug panel
     */
    toggleDebugPanel() {
        const panel = document.getElementById('debug-panel');
        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            this.updateDebugInfo();
        } else {
            panel.style.display = 'none';
        }
    }

    /**
     * Update debug information
     */
    updateDebugInfo() {
        const debugInfo = document.getElementById('debug-info');
        const state = game.getState();
        
        if (debugInfo && state) {
            debugInfo.innerHTML = `
                <h3>Debug Info</h3>
                <p>Player: (${state.player.x}, ${state.player.y})</p>
                <p>HP: ${state.player.hp}/${state.player.maxHp}</p>
                <p>Coins: ${state.player.coins}</p>
                <p>Floor: ${state.floor.current}</p>
                <p>Context: ${state.ui.currentContext}</p>
                <p>Inventory: ${state.player.inventory.length} items</p>
            `;
        }
    }

    /**
     * Load actions configuration from JSON
     */
    async loadActionsConfig() {
        try {
            const response = await fetch('/content/actions.json');
            if (!response.ok) {
                throw new Error(`Failed to load actions: ${response.status}`);
            }
            const actionsConfig = await response.json();
            console.log('Loaded actions configuration:', Object.keys(actionsConfig).length, 'actions');
            return actionsConfig;
        } catch (error) {
            console.error('Failed to load actions config:', error);
            // Return minimal config for fallback
            return {
                'MOVE_PLAYER': { category: 'movement', undoable: true },
                'SELECT_MENU_ITEM': { category: 'ui', undoable: false },
                'CHANGE_CONTEXT': { category: 'ui', undoable: false }
            };
        }
    }

    /**
     * Start the game
     */
    start() {
        console.log('Starting Redux game...');
        game.start();
        
        // Set up state subscription for debug updates
        game.subscribe((state, action) => {
            if (document.getElementById('debug-panel').style.display !== 'none') {
                this.updateDebugInfo();
            }
        });
    }

    /**
     * Stop the game
     */
    stop() {
        game.stop();
    }

    /**
     * Clean up resources
     */
    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        this.gameContainer.removeEventListener('click', this.handleClick);
        
        this.stop();
    }
}

// Create adapter instance
export const reduxBrowserAdapter = new ReduxBrowserAdapter();
