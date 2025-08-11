/**
 * ASCII Renderer for the Roguelike Engine
 * Handles text-based visualization of the game state
 */

import { events, EVENT_TYPES } from '../core/events.js';

export class ASCIIRenderer {
    constructor(container = null) {
        this.container = container;
        this.width = 80;
        this.height = 24;
        this.mapWidth = 50;
        this.mapHeight = 20;
        this.sidebarWidth = 30;
        
        // Character mappings
        this.chars = {
            player: '@',
            wall:   '#',
            floor:  '.',
            door:   '+',
            item:   '$',
            enemy:  'E',
            stairs_up:   '<',
            stairs_down: '>',
            unknown: '?',
            empty:   ' '
        };
        
        // Color mappings (for potential future terminal color support)
        this.colors = {
            player: 'yellow',
            wall: 'white',
            floor: 'gray',
            door: 'brown',
            item: 'gold',
            enemy: 'red',
            stairs: 'cyan',
            ui: 'white'
        };
        
        this.lastRenderedState = null;
        this.setupEventListeners();
    }

    /**
     * Initialize the renderer
     */
    initialize() {
        if (this.container) {
            this.setupDOM();
        }
        console.log('ASCII Renderer initialized');
    }

    /**
     * Setup DOM elements for browser rendering
     */
    setupDOM() {
        this.container.innerHTML = '';
        this.container.style.fontFamily = 'monospace';
        this.container.style.fontSize = '12px';
        this.container.style.lineHeight = '1.2';
        this.container.style.whiteSpace = 'pre';
        this.container.style.backgroundColor = '#000';
        this.container.style.color = '#0f0';
        this.container.style.padding = '10px';
        this.container.style.overflow = 'hidden';
    }

    /**
     * Render the current game state
     */
    render(state) {
        try {
            // Check if we should render a menu overlay based on Redux state
            if (state.ui.currentContext !== 'world') {
                this.renderMenuOverlay(state);
            } else {
                // Normal world view
                const screen = this.createScreen(state);
                const output = this.screenToString(screen);
                
                if (this.container) {
                    this.container.textContent = output;
                } else {
                    console.clear();
                    console.log(output);
                }
            }
            
            this.lastRenderedState = state;
            
        } catch (error) {
            console.error('Render error:', error);
        }
    }

    /**
     * Render menu overlay
     */
    renderMenuOverlay(state) {
        // Start with the world view as background
        const screen = this.createScreen(state);
        
        // Draw menu overlay using Redux state
        this.drawMenuOverlay(screen, state);
        
        const output = this.screenToString(screen);
        
        if (this.container) {
            this.container.textContent = output;
        } else {
            console.clear();
            console.log(output);
        }
    }

    /**
     * Draw menu overlay on screen
     */
    drawMenuOverlay(screen, state) {
        const menuWidth = 40;
        const menuHeight = 15;
        const startX = Math.floor((this.width - menuWidth) / 2);
        const startY = Math.floor((this.height - menuHeight) / 2);
        
        // Draw menu background and border
        for (let y = startY; y < startY + menuHeight; y++) {
            for (let x = startX; x < startX + menuWidth; x++) {
                if (y === startY || y === startY + menuHeight - 1 || 
                    x === startX || x === startX + menuWidth - 1) {
                    screen[y][x] = '#'; // Border
                } else {
                    screen[y][x] = ' '; // Background
                }
            }
        }
        
        // Draw menu content based on context
        switch (inputState.context) {
            case 'main_menu':
                this.drawMainMenu(screen, startX, startY, inputState.selectedIndex);
                break;
            case 'inventory':
                this.drawInventoryMenu(screen, startX, startY, state, inputState.selectedIndex);
                break;
            case 'gambling':
                this.drawGamblingMenu(screen, startX, startY, state, inputState.selectedIndex);
                break;
            default:
                this.drawGenericMenu(screen, startX, startY, inputState.context);
        }
    }

    /**
     * Draw main menu
     */
    drawMainMenu(screen, startX, startY, selectedIndex) {
        this.writeText(screen, startX + 2, startY + 2, 'MAIN MENU');
        
        const menuItems = ['Inventory', 'Stats', 'Save Game', 'Quit'];
        menuItems.forEach((item, index) => {
            const prefix = index === selectedIndex ? '> ' : '  ';
            this.writeText(screen, startX + 2, startY + 4 + index, prefix + item);
        });
    }

    /**
     * Draw inventory menu
     */
    drawInventoryMenu(screen, startX, startY, state, selectedIndex) {
        this.writeText(screen, startX + 2, startY + 2, 'INVENTORY');
        
        const inventory = state.player.inventory;
        if (inventory.length === 0) {
            this.writeText(screen, startX + 2, startY + 4, 'Empty');
        } else {
            inventory.forEach((item, index) => {
                const prefix = index === selectedIndex ? '> ' : '  ';
                const displayItem = item.length > 30 ? item.substring(0, 27) + '...' : item;
                this.writeText(screen, startX + 2, startY + 4 + index, prefix + displayItem);
            });
        }
    }

    /**
     * Draw gambling menu
     */
    drawGamblingMenu(screen, startX, startY, state, selectedIndex) {
        this.writeText(screen, startX + 2, startY + 2, 'GAMBLING GAMES');
        
        const games = ['Coin Flip', 'High-Low', 'Blackjack', 'Liars Dice'];
        games.forEach((game, index) => {
            const prefix = index === selectedIndex ? '> ' : '  ';
            this.writeText(screen, startX + 2, startY + 4 + index, prefix + game);
        });
        
        // Show player's coins
        this.writeText(screen, startX + 2, startY + 10, `Coins: ${state.player.coins}`);
    }

    /**
     * Draw generic menu
     */
    drawGenericMenu(screen, startX, startY, context) {
        this.writeText(screen, startX + 2, startY + 2, context.toUpperCase());
        this.writeText(screen, startX + 2, startY + 4, 'Not implemented yet');
    }

    /**
     * Create a 2D screen buffer
     */
    createScreen(state) {
        // Initialize screen with spaces
        const screen = Array(this.height).fill().map(() => 
            Array(this.width).fill(' ')
        );
        
        // Draw main game area
        this.drawGameArea(screen, state);
        
        // Draw UI panels
        this.drawSidebar(screen, state);
        this.drawBottomBar(screen, state);
        
        return screen;
    }

    /**
     * Draw the main game area (map)
     */
    drawGameArea(screen, state) {
        const startX = 1;
        const startY = 1;
        const endX = this.mapWidth;
        const endY = this.mapHeight;
        
        // Draw border
        for (let x = startX - 1; x <= endX; x++) {
            screen[startY - 1][x] = '#';
            screen[endY][x] = '#';
        }
        for (let y = startY - 1; y <= endY; y++) {
            screen[y][startX - 1] = '#';
            screen[y][endX] = '#';
        }
        
        // Draw floor tiles
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                screen[y][x] = this.chars.floor;
            }
        }
        
        // Draw floor layout if available
        if (state.floor.layout) {
            this.drawFloorLayout(screen, state.floor.layout, startX, startY);
        }
        
        // Draw items
        state.floor.items.forEach(item => {
            const screenX = startX + item.x;
            const screenY = startY + item.y;
            if (this.isInBounds(screenX, screenY, startX, startY, endX, endY)) {
                screen[screenY][screenX] = this.chars.item;
            }
        });
        
        // Draw enemies
        state.floor.enemies.forEach(enemy => {
            const screenX = startX + enemy.x;
            const screenY = startY + enemy.y;
            if (this.isInBounds(screenX, screenY, startX, startY, endX, endY)) {
                screen[screenY][screenX] = this.chars.enemy;
            }
        });
        
        // Draw highlighted interaction based on Redux state
        if (state.ui.highlightedInteraction && state.ui.currentContext === 'world') {
            const highlightX = startX + state.player.x;
            const highlightY = startY + state.player.y;
            if (this.isInBounds(highlightX, highlightY, startX, startY, endX, endY)) {
                // Use a special highlight character or modify existing
                const existingChar = screen[highlightY][highlightX];
                screen[highlightY][highlightX] = existingChar === this.chars.floor ? '*' : existingChar;
            }
        }
        
        // Draw player (always on top)
        const playerX = startX + state.player.x;
        const playerY = startY + state.player.y;
        if (this.isInBounds(playerX, playerY, startX, startY, endX, endY)) {
            screen[playerY][playerX] = this.chars.player;
        }
    }

    /**
     * Draw floor layout from data
     */
    drawFloorLayout(screen, layout, offsetX, offsetY) {
        // Simple layout rendering - in a full implementation this would
        // parse a more complex floor layout structure
        if (layout.walls) {
            layout.walls.forEach(wall => {
                const x = offsetX + wall.x;
                const y = offsetY + wall.y;
                if (x < screen[0].length && y < screen.length) {
                    screen[y][x] = this.chars.wall;
                }
            });
        }
        
        if (layout.doors) {
            layout.doors.forEach(door => {
                const x = offsetX + door.x;
                const y = offsetY + door.y;
                if (x < screen[0].length && y < screen.length) {
                    screen[y][x] = this.chars.door;
                }
            });
        }
    }

    /**
     * Draw sidebar with player info and log
     */
    drawSidebar(screen, state) {
        const startX = this.mapWidth + 2;
        let currentY = 1;
        
        // Player stats
        this.writeText(screen, startX, currentY++, `HP: ${state.player.hp}/${state.player.maxHp}`);
        this.writeText(screen, startX, currentY++, `MP: ${state.player.mp}/${state.player.maxMp}`);
        this.writeText(screen, startX, currentY++, `Coins: ${state.player.coins}`);
        this.writeText(screen, startX, currentY++, `Floor: ${state.floor.current}`);
        
        currentY++; // Empty line
        
        // Current game info
        if (state.currentGame) {
            this.writeText(screen, startX, currentY++, `Game: ${state.currentGame.type}`);
            this.writeText(screen, startX, currentY++, `Bet: ${state.currentGame.bet}`);
            currentY++;
        }
        
        // Stats
        this.writeText(screen, startX, currentY++, 'Stats:');
        this.writeText(screen, startX, currentY++, `Luck: ${state.player.stats.luck.toFixed(1)}`);
        this.writeText(screen, startX, currentY++, `Speed: ${state.player.stats.speed.toFixed(1)}`);
        this.writeText(screen, startX, currentY++, `Str: ${state.player.stats.strength.toFixed(1)}`);
        
        currentY++; // Empty line
        
        // Inventory
        this.writeText(screen, startX, currentY++, 'Inventory:');
        state.player.inventory.slice(0, 5).forEach(item => {
            this.writeText(screen, startX, currentY++, `- ${item}`);
        });
        
        currentY++; // Empty line
        
        // Recent log messages
        this.writeText(screen, startX, currentY++, 'Log:');
        const recentMessages = state.ui.logMessages.slice(-4);
        recentMessages.forEach(msg => {
            const text = msg.message.length > 25 ? msg.message.substring(0, 22) + '...' : msg.message;
            this.writeText(screen, startX, currentY++, `> ${text}`);
        });
    }

    /**
     * Draw bottom command bar with unified interface
     */
    drawBottomBar(screen, state) {
        const bottomY = this.height - 1;
        
        // Draw separator line
        for (let x = 0; x < this.width; x++) {
            screen[bottomY - 1][x] = '-';
        }
        
        // Context-specific commands based on Redux state
        let commands = '';
        switch (state.ui.currentContext) {
            case 'world':
                commands = 'WASD/Arrows=Move  ENTER/Z=Action  ESC=Menu  Q=Quit';
                break;
            case 'main_menu':
                commands = 'WS/Arrows=Navigate  ENTER/Z=Select  ESC=Back';
                break;
            case 'inventory':
                commands = 'WS/Arrows=Navigate  ENTER/Z=Use Item  ESC=Back';
                break;
            case 'gambling':
                commands = 'WS/Arrows=Choose Game  ENTER/Z=Play  ESC=Back';
                break;
            case 'gambling_game':
                commands = 'ENTER/Z=Confirm  ESC=Fold';
                break;
            default:
                commands = 'WASD/Arrows=Move  ENTER/Z=Action  ESC=Cancel';
        }
        
        // Add context indicator
        const contextIndicator = `[${inputState.context.toUpperCase()}] `;
        const fullCommand = contextIndicator + commands;
        
        // Truncate if too long
        const displayCommand = fullCommand.length > this.width - 2 
            ? fullCommand.substring(0, this.width - 5) + '...'
            : fullCommand;
        
        this.writeText(screen, 1, bottomY, displayCommand);
    }

    /**
     * Write text to screen buffer
     */
    writeText(screen, x, y, text) {
        if (y < 0 || y >= screen.length) return;
        
        for (let i = 0; i < text.length && (x + i) < screen[y].length; i++) {
            screen[y][x + i] = text[i];
        }
    }

    /**
     * Check if coordinates are within bounds
     */
    isInBounds(x, y, minX, minY, maxX, maxY) {
        return x >= minX && x < maxX && y >= minY && y < maxY;
    }

    /**
     * Convert screen buffer to string
     */
    screenToString(screen) {
        return screen.map(row => row.join('')).join('\n');
    }

    /**
     * Render gambling interface
     */
    renderGamblingGame(gameState) {
        const screen = Array(this.height).fill().map(() => 
            Array(this.width).fill(' ')
        );
        
        // Draw gambling game UI based on game type
        switch (gameState.type) {
            case 'coin_flip':
                this.renderCoinFlip(screen, gameState);
                break;
            case 'liars_dice':
                this.renderLiarsDice(screen, gameState);
                break;
            case 'blackjack':
                this.renderBlackjack(screen, gameState);
                break;
            default:
                this.renderGenericGambling(screen, gameState);
        }
        
        const output = this.screenToString(screen);
        
        if (this.container) {
            this.container.textContent = output;
        } else {
            console.clear();
            console.log(output);
        }
    }

    /**
     * Render coin flip game
     */
    renderCoinFlip(screen, gameState) {
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);
        
        this.writeText(screen, centerX - 10, centerY - 3, 'COIN FLIP');
        this.writeText(screen, centerX - 15, centerY - 1, `Bet: ${gameState.bet} coins`);
        
        if (gameState.result) {
            const coinChar = gameState.result === 'heads' ? 'H' : 'T';
            this.writeText(screen, centerX - 1, centerY, `[${coinChar}]`);
            this.writeText(screen, centerX - 8, centerY + 2, `Result: ${gameState.result}`);
        } else {
            this.writeText(screen, centerX - 8, centerY, 'Choose: H or T?');
        }
        
        this.writeText(screen, 1, this.height - 1, 'H=Heads T=Tails ESC=Cancel');
    }

    /**
     * Render Liar's Dice game
     */
    renderLiarsDice(screen, gameState) {
        const centerX = Math.floor(this.width / 2);
        let currentY = 3;
        
        this.writeText(screen, centerX - 6, currentY++, "LIAR'S DICE");
        currentY++;
        
        if (gameState.yourDice) {
            this.writeText(screen, 5, currentY++, 'Your dice: ');
            const diceStr = gameState.yourDice.map(d => `[${d}]`).join(' ');
            this.writeText(screen, 17, currentY - 1, diceStr);
            currentY++;
        }
        
        if (gameState.currentBid) {
            this.writeText(screen, 5, currentY++, `Current bid: "${gameState.currentBid}"`);
            currentY++;
        }
        
        this.writeText(screen, 5, currentY++, 'Options:');
        this.writeText(screen, 7, currentY++, '1) Raise bid');
        this.writeText(screen, 7, currentY++, '2) Call bluff!');
        
        this.writeText(screen, 1, this.height - 1, '1-2=Choose ESC=Fold');
    }

    /**
     * Render generic gambling game
     */
    renderGenericGambling(screen, gameState) {
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);
        
        this.writeText(screen, centerX - 10, centerY - 2, gameState.type.toUpperCase());
        this.writeText(screen, centerX - 8, centerY, `Bet: ${gameState.bet}`);
        this.writeText(screen, centerX - 8, centerY + 2, 'Playing...');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for render requests
        events.on(EVENT_TYPES.RENDER_REQUEST, (event) => {
            this.render(event.data.state);
        });
        
        // Listen for gambling events to switch to gambling UI
        events.on(EVENT_TYPES.GAMBLE_STARTED, (event) => {
            // Could switch to gambling-specific rendering mode
        });
        
        events.on(EVENT_TYPES.GAMBLE_RESOLVED, (event) => {
            // Could show result animation
        });
    }

    /**
     * Get renderer status
     */
    getStatus() {
        return {
            width: this.width,
            height: this.height,
            hasContainer: !!this.container,
            lastRenderTime: this.lastRenderedState ? Date.now() : null
        };
    }
}

// Helper function to create and initialize renderer
export const createRenderer = (container = null) => {
    const renderer = new ASCIIRenderer(container);
    renderer.initialize();
    return renderer;
};

// Default renderer instance for compatibility
export const renderer = new ASCIIRenderer();
