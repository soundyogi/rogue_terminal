/**
 * Redux Browser Adapter - TypeScript Migration
 * Enhanced browser integration with full type safety and portable UI architecture
 */

import { game } from '../core/game.js';
import { renderer } from '../ui/renderer.js';
import { handleInput, handleAction } from '../core/inputThunks.js';
import type { 
  RootState, 
  KeyEventMapping, 
  ActionsConfig,
  BrowserAdapterOptions,
  InputEvent,
  InputEventData,
  RenderTarget,
  EnhancedBrowserAdapter
} from '../core/types.js';

export class ReduxBrowserAdapter implements EnhancedBrowserAdapter {
  private gameContainer: HTMLElement | null = null;
  private inputEnabled: boolean = true;
  private keysPressed: Set<string> = new Set();
  private renderTarget: RenderTarget | null = null;

  constructor(private options: BrowserAdapterOptions = {}) {}

  /**
   * Initialize the adapter with enhanced error handling and type safety
   */
  public async initialize(containerId: string = 'game-container'): Promise<boolean> {
    try {
      console.log('Initializing Redux Browser Adapter...');
      
      // Environment check with proper typing
      if (typeof document === 'undefined') {
        console.log('Not in browser environment, skipping DOM initialization');
        return false;
      }
      
      // DOM setup with null safety
      this.gameContainer = document.getElementById(containerId);
      if (!this.gameContainer) {
        this.gameContainer = this.createGameContainer(containerId);
      }

      this.setupDOM();
      this.setupInputListeners();
      
      // Load configuration with proper error handling
      const actionsConfig = await this.loadActionsConfig();
      
      // Initialize with type safety
      renderer.initialize();
      await game.initialize(renderer, actionsConfig);
      
      console.log('Redux Browser Adapter initialized successfully');
      return true;

    } catch (error) {
      console.error('Failed to initialize Redux Browser Adapter:', error);
      return false;
    }
  }

  private createGameContainer(containerId: string): HTMLElement {
    const container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);
    return container;
  }

  /**
   * Enhanced DOM setup with type safety
   */
  private setupDOM(): void {
    if (!this.gameContainer) return;

    this.gameContainer.innerHTML = this.getHTMLTemplate();
    this.applyContainerStyles();
    this.setupDebugButtons();
  }

  private getHTMLTemplate(): string {
    return `
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
  }

  private applyContainerStyles(): void {
    if (!this.gameContainer) return;

    // Style the container
    this.gameContainer.style.cssText = `
      font-family: 'Courier New', monospace;
      background: #000;
      color: #fff;
      padding: 10px;
      max-width: 800px;
      margin: 0 auto;
    `;
  }

  private setupDebugButtons(): void {
    const undoBtn = document.getElementById('undo-btn');
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');

    undoBtn?.addEventListener('click', () => {
      game.undo();
    });

    saveBtn?.addEventListener('click', () => {
      this.saveGame();
    });

    loadBtn?.addEventListener('click', () => {
      this.loadGame();
    });
  }

  /**
   * Set up input event listeners with enhanced type safety
   */
  private setupInputListeners(): void {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    this.gameContainer?.addEventListener('click', (e) => this.handleClick(e));
    
    // Prevent default browser actions for game keys
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Enter', 'Escape'];
      if (gameKeys.includes(e.code)) {
        e.preventDefault();
      }
    });
  }

  /**
   * Type-safe key down event handling
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.inputEnabled || this.keysPressed.has(event.code)) return;
    
    this.keysPressed.add(event.code);
    
    const state = game.getState();
    if (!state) return;

    const mapping = this.mapKeyEventToInput(event);
    if (mapping.inputType) {
      const inputEvent: InputEvent = {
        type: 'keyboard',
        source: 'browser',
        data: {
          key: event.key,
          code: event.code,
          modifiers: this.getModifiers(event)
        },
        timestamp: Date.now()
      };
      
      game.dispatch(handleInput({ 
        inputType: mapping.inputType, 
        inputData: mapping.inputData 
      }));
    }

    // Debug functionality
    if (event.code === 'F1') {
      this.toggleDebugPanel();
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.keysPressed.delete(event.code);
  }

  private handleClick(event: MouseEvent): void {
    if (!this.inputEnabled) return;

    const state = game.getState();
    if (!state) return;

    // Treat click as a generic 'action' input using input thunk
    game.dispatch(handleAction());
  }

  private getModifiers(event: KeyboardEvent): string[] {
    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');
    return modifiers;
  }

  /**
   * Enhanced input mapping with full typing
   */
  private mapKeyEventToInput(event: KeyboardEvent): KeyEventMapping {
    const { code } = event;

    // Movement keys
    const movementMap: Record<string, string> = {
      'ArrowUp': 'up', 'KeyW': 'up',
      'ArrowDown': 'down', 'KeyS': 'down', 
      'ArrowLeft': 'left', 'KeyA': 'left',
      'ArrowRight': 'right', 'KeyD': 'right'
    };

    if (movementMap[code]) {
      return { 
        inputType: 'direction', 
        inputData: { direction: movementMap[code] } 
      };
    }

    // Action keys
    if (['Enter', 'Space'].includes(code)) {
      return { inputType: 'action' };
    }

    if (code === 'Escape') {
      return { inputType: 'cancel' };
    }

    return { inputType: null };
  }

  /**
   * Toggle debug panel with type safety
   */
  private toggleDebugPanel(): void {
    const panel = document.getElementById('debug-panel');
    if (panel) {
      if (panel.style.display === 'none') {
        panel.style.display = 'block';
        this.updateDebugInfo();
      } else {
        panel.style.display = 'none';
      }
    }
  }

  /**
   * Enhanced debug information with proper typing
   */
  private updateDebugInfo(): void {
    const debugInfo = document.getElementById('debug-info');
    const state = game.getState();
    
    if (!debugInfo || !state) return;

    const debugData = {
      player: `(${state.player.x}, ${state.player.y})`,
      hp: `${state.player.hp}/${state.player.maxHp}`,
      coins: state.player.coins,
      floor: state.game.floor.current,
      context: state.ui.currentContext,
      inventory: state.player.inventory.length
    };

    debugInfo.innerHTML = `
      <h3>Debug Info</h3>
      ${Object.entries(debugData).map(([key, value]) => 
        `<p>${key}: ${value}</p>`
      ).join('')}
    `;
  }

  /**
   * Enhanced save/load with proper typing
   */
  private async loadActionsConfig(): Promise<ActionsConfig> {
    try {
      const response = await fetch('/data/actions.json');
      if (!response.ok) {
        throw new Error(`Failed to load actions: ${response.status}`);
      }
      const config: ActionsConfig = await response.json();
      console.log('Loaded actions configuration:', Object.keys(config).length, 'actions');
      return config;
    } catch (error) {
      console.error('Failed to load actions config:', error);
      return this.getFallbackActionsConfig();
    }
  }

  private getFallbackActionsConfig(): ActionsConfig {
    return {
      'MOVE_PLAYER': { category: 'movement', undoable: true },
      'SELECT_MENU_ITEM': { category: 'ui', undoable: false },
      'CHANGE_CONTEXT': { category: 'ui', undoable: false }
    };
  }

  /**
   * Type-safe localStorage operations
   */
  private saveGame(): void {
    try {
      const state = game.save();
      if (state) {
        const serializedState = JSON.stringify(state);
        localStorage.setItem('roguelike_save', serializedState);
        console.log('Game saved to localStorage');
      }
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  }

  private loadGame(): void {
    try {
      const saved = localStorage.getItem('roguelike_save');
      if (saved) {
        const state: RootState = JSON.parse(saved);
        game.load(state);
        console.log('Game loaded from localStorage');
      }
    } catch (error) {
      console.error('Failed to load game:', error);
    }
  }

  // Enhanced InputAdapter interface methods
  public onInput(callback: (event: InputEvent) => void): void {
    // Could implement external input callback system here
    console.log('Input callback registered');
  }

  public setEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
  }

  /**
   * Stream integration for portable UI
   */
  public setRenderTarget(target: RenderTarget): void {
    this.renderTarget = target;
  }

  /**
   * Start the game with state subscription for debug updates
   */
  public start(): void {
    console.log('Starting Redux game...');
    game.start();
    
    // Set up state subscription for debug updates
    game.subscribe(() => {
      const debugPanel = document.getElementById('debug-panel');
      if (debugPanel && debugPanel.style.display !== 'none') {
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
   * Clean up resources with proper type safety
   */
  public destroy(): void {
    if (typeof document === 'undefined') return;
    
    document.removeEventListener('keydown', (e) => this.handleKeyDown(e));
    document.removeEventListener('keyup', (e) => this.handleKeyUp(e));
    
    if (this.gameContainer) {
      this.gameContainer.removeEventListener('click', (e) => this.handleClick(e));
    }
    
    this.stop();
  }
}

// Type-safe singleton export
export const reduxBrowserAdapter = new ReduxBrowserAdapter();