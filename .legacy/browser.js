/**
 * Browser Adapter - Platform-specific implementation for web browsers
 * Handles DOM interaction, input, and browser-specific features
 */

import { gameEngine } from '../core/game.js';
import { events, EVENT_TYPES } from '../core/events.js';
import { createRenderer } from '../ui/renderer.js';

export class BrowserAdapter {
    constructor() {
        this.renderer = null;
        this.gameContainer = null;
        this.inputEnabled = true;
        this.keyboardListeners = new Map();
        
        // Input state
        this.keysPressed = new Set();
        this.lastKeyTime = 0;
        this.keyRepeatDelay = 200; // ms before key repeat starts
        this.keyRepeatInterval = 100; // ms between repeats
    }

    /**
     * Initialize the browser adapter
     */
    async initialize(config = {}) {
        try {
            console.log('Initializing Browser Adapter...');
            
            // Setup DOM
            this.setupDOM(config.containerId || 'game-container');
            
            // Setup renderer
            this.renderer = createRenderer(this.gameContainer);
            
            // Setup input handling
            this.setupInputHandling();
            
            // Setup browser-specific features
            this.setupBrowserFeatures();
            
            // Listen for game events
            this.setupEventListeners();
            
            console.log('Browser Adapter initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize Browser Adapter:', error);
            return false;
        }
    }

    /**
     * Setup DOM elements
     */
    setupDOM(containerId) {
        // Find or create game container
        this.gameContainer = document.getElementById(containerId);
        
        if (!this.gameContainer) {
            // Create container if it doesn't exist
            this.gameContainer = document.createElement('div');
            this.gameContainer.id = containerId;
            document.body.appendChild(this.gameContainer);
        }
        
        // Style the container
        this.gameContainer.style.position = 'relative';
        this.gameContainer.style.display = 'block';
        this.gameContainer.style.minHeight = '400px';
        this.gameContainer.style.userSelect = 'none';
        this.gameContainer.tabIndex = 0; // Make focusable for keyboard input
        
        // Add loading message
        this.gameContainer.textContent = 'Initializing Roguelike Engine...';
        
        // Focus the container for keyboard input
        this.gameContainer.focus();
    }

    /**
     * Setup input handling
     */
    setupInputHandling() {
        // Keyboard input
        this.gameContainer.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });
        
        this.gameContainer.addEventListener('keyup', (event) => {
            this.handleKeyUp(event);
        });
        
        // Mouse input (for future use)
        this.gameContainer.addEventListener('click', (event) => {
            this.handleMouseClick(event);
        });
        
        // Touch input (for mobile support)
        this.gameContainer.addEventListener('touchstart', (event) => {
            this.handleTouchStart(event);
        });
        
        // Prevent context menu
        this.gameContainer.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
        
        // Handle focus/blur for input state
        this.gameContainer.addEventListener('blur', () => {
            this.keysPressed.clear();
        });
    }

    /**
     * Handle keydown events
     */
    handleKeyDown(event) {
        if (!this.inputEnabled) return;
        
        const key = event.key.toLowerCase();
        const currentTime = Date.now();
        
        // Prevent default browser behavior for game keys
        if (this.isGameKey(key)) {
            event.preventDefault();
        }
        
        // Handle key repeat
        if (this.keysPressed.has(key)) {
            if (currentTime - this.lastKeyTime < this.keyRepeatInterval) {
                return; // Too soon for repeat
            }
        } else {
            this.keysPressed.add(key);
        }
        
        this.lastKeyTime = currentTime;
        
        // Convert key to unified input commands
        const inputCommand = this.mapKeyToInput(key);
        if (inputCommand) {
            gameEngine.handleInput(inputCommand.type, inputCommand.data);
        } else {
            // Fallback to raw key handling
            gameEngine.handleInput('key', { key, event });
        }
    }

    /**
     * Handle keyup events
     */
    handleKeyUp(event) {
        const key = event.key.toLowerCase();
        this.keysPressed.delete(key);
    }

    /**
     * Handle mouse clicks
     */
    handleMouseClick(event) {
        if (!this.inputEnabled) return;
        
        const rect = this.gameContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Convert pixel coordinates to game coordinates
        const gameX = Math.floor(x / 12); // Assuming 12px character width
        const gameY = Math.floor(y / 14); // Assuming 14px character height
        
        gameEngine.handleInput('click', { 
            x: gameX, 
            y: gameY, 
            button: event.button,
            event 
        });
    }

    /**
     * Handle touch events
     */
    handleTouchStart(event) {
        if (!this.inputEnabled) return;
        
        event.preventDefault();
        
        const touch = event.touches[0];
        const rect = this.gameContainer.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // Convert to game coordinates
        const gameX = Math.floor(x / 12);
        const gameY = Math.floor(y / 14);
        
        gameEngine.handleInput('touch', { 
            x: gameX, 
            y: gameY, 
            event 
        });
    }

    /**
     * Map keyboard input to unified input commands
     */
    mapKeyToInput(key) {
        const keyMapping = {
            // Directional movement
            'w': { type: 'direction', data: { direction: 'up' } },
            'arrowup': { type: 'direction', data: { direction: 'up' } },
            's': { type: 'direction', data: { direction: 'down' } },
            'arrowdown': { type: 'direction', data: { direction: 'down' } },
            'a': { type: 'direction', data: { direction: 'left' } },
            'arrowleft': { type: 'direction', data: { direction: 'left' } },
            'd': { type: 'direction', data: { direction: 'right' } },
            'arrowright': { type: 'direction', data: { direction: 'right' } },
            
            // Action button
            'enter': { type: 'action', data: {} },
            ' ': { type: 'action', data: {} },
            'z': { type: 'action', data: {} },
            
            // Cancel/Back
            'escape': { type: 'cancel', data: {} },
            'x': { type: 'cancel', data: {} }
        };
        
        return keyMapping[key] || null;
    }

    /**
     * Check if a key is a game control key
     */
    isGameKey(key) {
        const gameKeys = [
            'w', 'a', 's', 'd', // Movement
            'arrowup', 'arrowdown', 'arrowleft', 'arrowright', // Arrow keys
            'enter', ' ', 'z', // Action
            'escape', 'x', // Cancel
            'q', 'p' // System
        ];
        
        return gameKeys.includes(key);
    }

    /**
     * Setup browser-specific features
     */
    setupBrowserFeatures() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page is hidden, pause game if running
                if (gameEngine.getStatus().isRunning && !gameEngine.getStatus().isPaused) {
                    gameEngine.pause();
                    this.wasRunningBeforeHidden = true;
                }
            } else {
                // Page is visible, resume if it was running
                if (this.wasRunningBeforeHidden) {
                    gameEngine.resume();
                    this.wasRunningBeforeHidden = false;
                }
            }
        });
        
        // Handle beforeunload for saving
        window.addEventListener('beforeunload', (event) => {
            // Auto-save the game
            this.autoSave();
            
            // Show confirmation if game is running
            if (gameEngine.getStatus().isRunning) {
                event.preventDefault();
                return 'Are you sure you want to leave? Your progress may be lost.';
            }
        });
        
        // Handle resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    /**
     * Setup event listeners for game events
     */
    setupEventListeners() {
        // Listen for game start
        events.on(EVENT_TYPES.GAME_START, (event) => {
            console.log('Game started in browser');
            this.gameContainer.focus();
        });
        
        // Listen for game end
        events.on(EVENT_TYPES.GAME_END, (event) => {
            console.log('Game ended');
            this.showGameOverScreen();
        });
        
        // Listen for errors
        events.on(EVENT_TYPES.ERROR, (event) => {
            this.handleGameError(event.data.error);
        });
        
        // Listen for menu events
        events.on('MENU_OPENED', (event) => {
            this.showMenu(event.data);
        });
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Adjust renderer if needed
        if (this.renderer) {
            // Could recalculate optimal size based on window size
        }
    }

    /**
     * Auto-save game state
     */
    autoSave() {
        try {
            const state = gameEngine.getState();
            const saveData = JSON.stringify(state);
            localStorage.setItem('roguelike_autosave', saveData);
            console.log('Auto-saved game state');
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }

    /**
     * Load auto-saved game
     */
    loadAutoSave() {
        try {
            const saveData = localStorage.getItem('roguelike_autosave');
            if (saveData) {
                return gameEngine.load(saveData);
            }
            return false;
        } catch (error) {
            console.warn('Auto-load failed:', error);
            return false;
        }
    }

    /**
     * Show game over screen
     */
    showGameOverScreen() {
        const gameOverHTML = `
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                        background: rgba(0,0,0,0.9); color: white; padding: 20px; 
                        border: 2px solid #333; text-align: center;">
                <h2>Game Over</h2>
                <p>Your adventure has ended.</p>
                <button onclick="location.reload()">Play Again</button>
            </div>
        `;
        
        this.gameContainer.innerHTML = gameOverHTML;
    }

    /**
     * Show a menu overlay
     */
    showMenu(menuData) {
        // Create menu overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '1000';
        
        const menu = document.createElement('div');
        menu.style.backgroundColor = '#222';
        menu.style.color = 'white';
        menu.style.padding = '20px';
        menu.style.border = '2px solid #666';
        menu.style.fontFamily = 'monospace';
        
        if (menuData.type === 'inventory') {
            menu.innerHTML = `
                <h3>Inventory</h3>
                ${menuData.items.map(item => `<div>- ${item}</div>`).join('')}
                <br>
                <button onclick="this.parentElement.parentElement.remove()">Close</button>
            `;
        } else if (menuData.type === 'gambling') {
            menu.innerHTML = `
                <h3>Gambling Options</h3>
                <div>1. Coin Flip (Simple)</div>
                <div>2. Liar's Dice (Advanced)</div>
                <div>3. Blackjack (Card Game)</div>
                <br>
                <button onclick="this.parentElement.parentElement.remove()">Cancel</button>
            `;
        }
        
        overlay.appendChild(menu);
        this.gameContainer.appendChild(overlay);
        
        // Remove overlay on Escape key
        const escapeListener = (event) => {
            if (event.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escapeListener);
            }
        };
        document.addEventListener('keydown', escapeListener);
    }

    /**
     * Handle game errors
     */
    handleGameError(error) {
        console.error('Game Error:', error);
        
        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'absolute';
        errorDiv.style.top = '10px';
        errorDiv.style.right = '10px';
        errorDiv.style.backgroundColor = 'red';
        errorDiv.style.color = 'white';
        errorDiv.style.padding = '10px';
        errorDiv.style.border = '1px solid darkred';
        errorDiv.textContent = `Error: ${error.message || error}`;
        
        this.gameContainer.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 5000);
    }

    /**
     * Enable/disable input
     */
    setInputEnabled(enabled) {
        this.inputEnabled = enabled;
        this.gameContainer.style.pointerEvents = enabled ? 'auto' : 'none';
    }

    /**
     * Get adapter status
     */
    getStatus() {
        return {
            inputEnabled: this.inputEnabled,
            hasRenderer: !!this.renderer,
            containerExists: !!this.gameContainer,
            keysPressed: Array.from(this.keysPressed),
            rendererStatus: this.renderer ? this.renderer.getStatus() : null
        };
    }

    /**
     * Cleanup adapter
     */
    destroy() {
        // Remove event listeners
        if (this.gameContainer) {
            this.gameContainer.removeEventListener('keydown', this.handleKeyDown);
            this.gameContainer.removeEventListener('keyup', this.handleKeyUp);
            this.gameContainer.removeEventListener('click', this.handleMouseClick);
            this.gameContainer.removeEventListener('touchstart', this.handleTouchStart);
        }
        
        // Clear references
        this.renderer = null;
        this.gameContainer = null;
        this.keysPressed.clear();
        
        console.log('Browser Adapter destroyed');
    }
}

// Global adapter instance
export const browserAdapter = new BrowserAdapter();
