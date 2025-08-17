/**
 * Redux Browser Adapter - TypeScript Version
 * Browser integration for Redux-based game with enhanced type safety
 */

import { game } from '../core/game.js';
import { renderer } from '../ui/renderer.js';
import { handleInput, handleAction } from '../core/inputThunks.js';
import type { 
    RootState, 
    KeyEventMapping, 
    ActionsConfig, 
    InputAdapter 
} from '../core/types.js';

export class ReduxBrowserAdapter implements InputAdapter {
    protected gameContainer: HTMLElement | null = null;
    private inputEnabled: boolean = true;
    private keysPressed: Set<string> = new Set();
    
    constructor() {
        // Bind methods for proper 'this' context
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleClick = this.handleClick.bind(this);
    }

    /**
     * Initialize the adapter with enhanced type safety
     */
    public async initialize(containerId: string = 'game-container'): Promise<boolean> {
        try {
            console.log('Initializing Redux Browser Adapter...');
            
            // Check if we're in a browser environment
            if (typeof document === 'undefined') {
                console.log('Not in browser environment, skipping DOM initialization');
                return false;
            }
            
            // Find or create game container with null safety
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
            const actionsConfig: ActionsConfig = await this.loadActionsConfig();
            
            // Initialize renderer - it doesn't take parameters
            renderer.initialize();
            
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
     * Set up DOM structure with type-safe element handling
     */
    private setupDOM(): void {
        if (!this.gameContainer) return;

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

        // Set up debug buttons with proper null checks
        const undoBtn = document.getElementById('undo-btn');
        const saveBtn = document.getElementById('save-btn');
        const loadBtn = document.getElementById('load-btn');

        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                game.undo();
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const state = game.save();
                if (state) {
                    localStorage.setItem('roguelike_save', JSON.stringify(state));
                    console.log('Game saved to localStorage');
                }
            });
        }

        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                const saved = localStorage.getItem('roguelike_save');
                if (saved) {
                    try {
                        const state: RootState = JSON.parse(saved);
                        game.load(state);
                        console.log('Game loaded from localStorage');
                    } catch (error) {
                        console.error('Failed to parse saved game:', error);
                    }
                }
            });
        }
    }

    /**
     * Set up input event listeners
     */
    public setupInputListeners(): void {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        
        if (this.gameContainer) {
            this.gameContainer.addEventListener('click', this.handleClick);
        }
        
        // Prevent default browser actions for game keys
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            const gameKeys: string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Escape'];
            if (gameKeys.includes(e.code)) {
                e.preventDefault();
            }
        });
    }

    /**
     * Handle key down events with proper typing
     */
    protected handleKeyDown(event: KeyboardEvent): void {
        if (!this.inputEnabled) return;

        // Prevent repeat key events
        if (this.keysPressed.has(event.code)) return;
        this.keysPressed.add(event.code);

        // Get current state with type safety
        const state: RootState | null = game.getState();
        if (!state) return;

        // Translate key press to input type and data
        const { inputType, inputData }: KeyEventMapping = this.mapKeyEventToInput(event);

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
    private handleKeyUp(event: KeyboardEvent): void {
        this.keysPressed.delete(event.code);
    }

    /**
     * Handle click events
     */
    private handleClick(event: MouseEvent): void {
        if (!this.inputEnabled) return;

        const state: RootState | null = game.getState();
        if (!state) return;

        // Treat click as a generic 'action' input using input thunk
        game.dispatch(handleAction());
    }

    /**
     * Map keyboard events to abstract input types with enhanced typing
     */
    protected mapKeyEventToInput(event: KeyboardEvent): KeyEventMapping {
        const { code } = event;

        // Directional Input (WASD and Arrow Keys)
        if (['ArrowUp', 'KeyW'].includes(code)) {
            return { inputType: 'direction', inputData: { direction: 'up' } };
        }
        if (['ArrowDown', 'KeyS'].includes(code)) {
            return { inputType: 'direction', inputData: { direction: 'down' } };
        }
        if (['ArrowLeft', 'KeyA'].includes(code)) {
            return { inputType: 'direction', inputData: { direction: 'left' } };
        }
        if (['ArrowRight', 'KeyD'].includes(code)) {
            return { inputType: 'direction', inputData: { direction: 'right' } };
        }

        // Action Input (Enter and Space)
        if (['Enter', 'Space'].includes(code)) {
            return { inputType: 'action', inputData: {} };
        }

        // Cancel Input (Escape)
        if (['Escape'].includes(code)) {
            return { inputType: 'cancel', inputData: {} };
        }

        // No mapping found
        return { inputType: null, inputData: {} };
    }

    /**
     * Toggle debug panel with null safety
     */
    private toggleDebugPanel(): void {
        const panel = document.getElementById('debug-panel');
        if (!panel) return;

        if (panel.style.display === 'none') {
            panel.style.display = 'block';
            this.updateDebugInfo();
        } else {
            panel.style.display = 'none';
        }
    }

    /**
     * Update debug information with type-safe state access
     */
    protected updateDebugInfo(): void {
        const debugInfo = document.getElementById('debug-info');
        const state: RootState | null = game.getState();
        
        if (debugInfo && state) {
            debugInfo.innerHTML = `
                <h3>Debug Info</h3>
                <p>Player: (${state.player.x}, ${state.player.y})</p>
                <p>HP: ${state.player.hp}/${state.player.maxHp}</p>
                <p>Coins: ${state.player.coins}</p>
                <p>Floor: ${state.game.floor.current}</p>
                <p>Context: ${state.ui.currentContext}</p>
                <p>Inventory: ${state.player.inventory.length} items</p>
            `;
        }
    }

    /**
     * Load actions configuration from JSON with enhanced error handling
     */
    private async loadActionsConfig(): Promise<ActionsConfig> {
        try {
            const response = await fetch('/content/actions.json');
            if (!response.ok) {
                throw new Error(`Failed to load actions: ${response.status}`);
            }
            const actionsConfig: ActionsConfig = await response.json();
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
     * Start the game with enhanced subscription handling
     */
    public start(): void {
        console.log('Starting Redux game...');
        game.start();
        
        // Set up state subscription for debug updates with proper typing
        game.subscribe(() => {
            const panel = document.getElementById('debug-panel');
            if (panel && panel.style.display !== 'none') {
                this.updateDebugInfo();
            }
        });
    }

    /**
     * Stop the game
     */
    public stop(): void {
        game.stop();
    }

    /**
     * Clean up resources with proper event listener removal
     */
    public destroy(): void {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
        
        if (this.gameContainer) {
            this.gameContainer.removeEventListener('click', this.handleClick);
        }
        
        this.stop();
    }

    /**
     * InputAdapter interface implementation
     */
    public onInput(callback: (event: any) => void): void {
        // This would be used for a more generic input system
        // For now, we handle input directly through Redux dispatch
    }

    public setEnabled(enabled: boolean): void {
        this.inputEnabled = enabled;
    }
}

// Create adapter instance with proper typing
export const reduxBrowserAdapter: ReduxBrowserAdapter = new ReduxBrowserAdapter();