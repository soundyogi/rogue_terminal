/**
 * ASCII Renderer for the Roguelike Engine - TypeScript Version
 * Handles text-based visualization of the game state with enhanced type safety
 */

import { events, EVENT_TYPES } from '../core/events.js';
import type { 
    RootState, 
    RenderCapabilities,
    ScreenCell,
    InputState,
    LogMessage 
} from '../core/types.js';

// Define the UnifiedRenderer interface as specified in the migration plan
interface UnifiedRenderer {
    mode: 'browser' | 'terminal';
    render(state: RootState): void;
    clear(): void;
    getCapabilities(): RenderCapabilities;
    connectToGameServer?(): Promise<void>; // Optional enhancement
}

export class ASCIIRenderer implements UnifiedRenderer {
    public readonly mode: 'browser' | 'terminal';
    protected container: HTMLElement | null;
    private width: number = 80;
    private height: number = 24;
    private mapWidth: number = 50;
    private mapHeight: number = 20;
    private sidebarWidth: number = 30;
    
    // Character mappings with readonly for immutability
    private readonly chars: Record<string, string> = {
        player: '@',
        wall: '#',
        floor: '.',
        door: '+',
        item: '$',
        enemy: 'E',
        stairs_up: '<',
        stairs_down: '>',
        unknown: '?',
        empty: ' '
    } as const;
    
    // Color mappings for potential future terminal color support
    private readonly colors: Record<string, string> = {
        player: 'yellow',
        wall: 'white',
        floor: 'gray',
        door: 'brown',
        item: 'gold',
        enemy: 'red',
        stairs: 'cyan',
        ui: 'white'
    } as const;
    
    private lastRenderedState: RootState | null = null;
    
    constructor(container: HTMLElement | null = null) {
        this.container = container;
        this.mode = container ? 'browser' : 'terminal';
        this.setupEventListeners();
    }

    /**
     * Initialize the renderer
     */
    public initialize(): void {
        if (this.container) {
            this.setupDOM();
        }
        console.log('ASCII Renderer initialized');
    }

    /**
     * Setup DOM elements for browser rendering
     */
    private setupDOM(): void {
        if (!this.container) return;

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
     * Render the current game state with enhanced type safety
     */
    public render(state: RootState): void {
        try {
            // Check if we should render a menu overlay based on Redux state
            if (state.ui.currentContext !== 'world') {
                this.renderMenuOverlay(state);
            } else {
                // Normal world view
                const screen: ScreenCell[][] = this.createScreen(state);
                const output: string = this.screenToString(screen);
                
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
     * Clear the renderer output
     */
    public clear(): void {
        if (this.container) {
            this.container.textContent = '';
        } else {
            console.clear();
        }
    }

    /**
     * Get renderer capabilities
     */
    public getCapabilities(): RenderCapabilities {
        return {
            colors: this.mode === 'terminal',
            mouse: this.mode === 'browser',
            unicode: true,
            streaming: false // Will be enhanced in Phase 2
        };
    }

    /**
     * Render menu overlay
     */
    private renderMenuOverlay(state: RootState): void {
        // Start with the world view as background
        const screen: ScreenCell[][] = this.createScreen(state);
        
        // Draw menu overlay using Redux state
        this.drawMenuOverlay(screen, state);
        
        const output: string = this.screenToString(screen);
        
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
    private drawMenuOverlay(screen: ScreenCell[][], state: RootState): void {
        const menuWidth: number = 40;
        const menuHeight: number = 15;
        const startX: number = Math.floor((this.width - menuWidth) / 2);
        const startY: number = Math.floor((this.height - menuHeight) / 2);
        
        // Draw menu background and border
        for (let y = startY; y < startY + menuHeight; y++) {
            for (let x = startX; x < startX + menuWidth; x++) {
                if (y >= 0 && y < screen.length && x >= 0 && screen[y] && x < screen[y]!.length) {
                    if (y === startY || y === startY + menuHeight - 1 ||
                        x === startX || x === startX + menuWidth - 1) {
                        screen[y]![x] = { char: '#' }; // Border
                    } else {
                        screen[y]![x] = { char: ' ' }; // Background
                    }
                }
            }
        }
        
        // Draw menu content based on context
        switch (state.ui.currentContext) {
            case 'main_menu':
                this.drawMainMenu(screen, startX, startY, state.ui.selectedIndex);
                break;
            case 'inventory':
                this.drawInventoryMenu(screen, startX, startY, state, state.ui.selectedIndex);
                break;
            case 'gambling':
                this.drawGamblingMenu(screen, startX, startY, state, state.ui.selectedIndex);
                break;
            default:
                this.drawGenericMenu(screen, startX, startY, state.ui.currentContext);
        }
    }

    /**
     * Draw main menu
     */
    private drawMainMenu(screen: ScreenCell[][], startX: number, startY: number, selectedIndex: number): void {
        this.writeText(screen, startX + 2, startY + 2, 'MAIN MENU');
        
        const menuItems: string[] = ['Inventory', 'Stats', 'Save Game', 'Quit'];
        menuItems.forEach((item: string, index: number) => {
            const prefix: string = index === selectedIndex ? '> ' : '  ';
            this.writeText(screen, startX + 2, startY + 4 + index, prefix + item);
        });
    }

    /**
     * Draw inventory menu
     */
    private drawInventoryMenu(screen: ScreenCell[][], startX: number, startY: number, state: RootState, selectedIndex: number): void {
        this.writeText(screen, startX + 2, startY + 2, 'INVENTORY');
        
        const inventory: string[] = state.player.inventory;
        if (inventory.length === 0) {
            this.writeText(screen, startX + 2, startY + 4, 'Empty');
        } else {
            inventory.forEach((item: string, index: number) => {
                const prefix: string = index === selectedIndex ? '> ' : '  ';
                const displayItem: string = item.length > 30 ? item.substring(0, 27) + '...' : item;
                this.writeText(screen, startX + 2, startY + 4 + index, prefix + displayItem);
            });
        }
    }

    /**
     * Draw gambling menu
     */
    private drawGamblingMenu(screen: ScreenCell[][], startX: number, startY: number, state: RootState, selectedIndex: number): void {
        this.writeText(screen, startX + 2, startY + 2, 'GAMBLING GAMES');
        
        const games: string[] = ['Coin Flip', 'High-Low', 'Blackjack', 'Liars Dice'];
        games.forEach((game: string, index: number) => {
            const prefix: string = index === selectedIndex ? '> ' : '  ';
            this.writeText(screen, startX + 2, startY + 4 + index, prefix + game);
        });
        
        // Show player's coins
        this.writeText(screen, startX + 2, startY + 10, `Coins: ${state.player.coins}`);
    }

    /**
     * Draw generic menu
     */
    private drawGenericMenu(screen: ScreenCell[][], startX: number, startY: number, context: string): void {
        this.writeText(screen, startX + 2, startY + 2, context.toUpperCase());
        this.writeText(screen, startX + 2, startY + 4, 'Not implemented yet');
    }

    /**
     * Create a 2D screen buffer with proper typing
     */
    private createScreen(state: RootState): ScreenCell[][] {
        // Initialize screen with spaces - ensure proper initialization
        const screen: ScreenCell[][] = Array.from({ length: this.height }, () =>
            Array.from({ length: this.width }, () => ({ char: ' ' } as ScreenCell))
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
    private drawGameArea(screen: ScreenCell[][], state: RootState): void {
        const startX: number = 1;
        const startY: number = 1;
        const endX: number = this.mapWidth;
        const endY: number = this.mapHeight;
        
        // Draw border with bounds checking
        for (let x = startX - 1; x <= endX; x++) {
            if (startY - 1 >= 0 && startY - 1 < screen.length && x >= 0 && screen[0] && x < screen[0].length) {
                screen[startY - 1]![x] = { char: '#' };
            }
            if (endY >= 0 && endY < screen.length && x >= 0 && screen[0] && x < screen[0].length) {
                screen[endY]![x] = { char: '#' };
            }
        }
        for (let y = startY - 1; y <= endY; y++) {
            if (y >= 0 && y < screen.length && startX - 1 >= 0 && screen[y] && startX - 1 < screen[y]!.length) {
                screen[y]![startX - 1] = { char: '#' };
            }
            if (y >= 0 && y < screen.length && endX >= 0 && screen[y] && endX < screen[y]!.length) {
                screen[y]![endX] = { char: '#' };
            }
        }
        
        // Draw floor tiles
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (y >= 0 && y < screen.length && x >= 0 && screen[y] && x < screen[y]!.length) {
                    screen[y]![x] = { char: this.chars.floor || '.' };
                }
            }
        }
        
        // Draw floor layout if available
        if (state.game.floor.layout) {
            this.drawFloorLayout(screen, state.game.floor.layout, startX, startY);
        }
        
        // Draw items
        state.game.floor.items.forEach((item: any) => {
            const screenX: number = startX + item.x;
            const screenY: number = startY + item.y;
            if (this.isInBounds(screenX, screenY, startX, startY, endX, endY) &&
                screenY >= 0 && screenY < screen.length &&
                screenX >= 0 && screen[screenY] && screenX < screen[screenY].length) {
                screen[screenY]![screenX] = { char: this.chars.item || '$' };
            }
        });
        
        // Draw enemies
        state.game.floor.enemies.forEach((enemy: any) => {
            const screenX: number = startX + enemy.x;
            const screenY: number = startY + enemy.y;
            if (this.isInBounds(screenX, screenY, startX, startY, endX, endY) &&
                screenY >= 0 && screenY < screen.length &&
                screenX >= 0 && screen[screenY] && screenX < screen[screenY].length) {
                screen[screenY]![screenX] = { char: this.chars.enemy || 'E' };
            }
        });
        
        // Draw highlighted interaction based on Redux state
        if (state.ui.highlightedInteraction && state.ui.currentContext === 'world') {
            const highlightX: number = startX + state.player.x;
            const highlightY: number = startY + state.player.y;
            if (this.isInBounds(highlightX, highlightY, startX, startY, endX, endY) &&
                highlightY >= 0 && highlightY < screen.length &&
                highlightX >= 0 && screen[highlightY] && highlightX < screen[highlightY].length) {
                // Use a special highlight character or modify existing
                const existingChar: string = screen[highlightY]![highlightX]!.char;
                screen[highlightY]![highlightX] = {
                    char: existingChar === (this.chars.floor || '.') ? '*' : existingChar
                };
            }
        }
        
        // Draw player (always on top)
        const playerX: number = startX + state.player.x;
        const playerY: number = startY + state.player.y;
        if (this.isInBounds(playerX, playerY, startX, startY, endX, endY) &&
            playerY >= 0 && playerY < screen.length &&
            playerX >= 0 && screen[playerY] && playerX < screen[playerY].length) {
            screen[playerY]![playerX] = { char: this.chars.player || '@' };
        }
    }

    /**
     * Draw floor layout from data
     */
    private drawFloorLayout(screen: ScreenCell[][], layout: any, offsetX: number, offsetY: number): void {
        // Simple layout rendering - in a full implementation this would
        // parse a more complex floor layout structure
        if (layout.walls) {
            layout.walls.forEach((wall: any) => {
                const x: number = offsetX + wall.x;
                const y: number = offsetY + wall.y;
                if (y >= 0 && y < screen.length && x >= 0 && screen[y] && x < screen[y].length) {
                    screen[y]![x] = { char: this.chars.wall || '#' };
                }
            });
        }
        
        if (layout.doors) {
            layout.doors.forEach((door: any) => {
                const x: number = offsetX + door.x;
                const y: number = offsetY + door.y;
                if (y >= 0 && y < screen.length && x >= 0 && screen[y] && x < screen[y].length) {
                    screen[y]![x] = { char: this.chars.door || '+' };
                }
            });
        }
    }

    /**
     * Draw sidebar with player info and log
     */
    private drawSidebar(screen: ScreenCell[][], state: RootState): void {
        const startX: number = this.mapWidth + 2;
        let currentY: number = 1;
        
        // Player stats
        this.writeText(screen, startX, currentY++, `HP: ${state.player.hp}/${state.player.maxHp}`);
        this.writeText(screen, startX, currentY++, `MP: ${state.player.mp}/${state.player.maxMp}`);
        this.writeText(screen, startX, currentY++, `Coins: ${state.player.coins}`);
        this.writeText(screen, startX, currentY++, `Floor: ${state.game.floor.current}`);
        
        currentY++; // Empty line
        
        // Current game info
        if (state.game.currentGame) {
            this.writeText(screen, startX, currentY++, `Game: ${state.game.currentGame.type}`);
            this.writeText(screen, startX, currentY++, `Bet: ${state.game.currentGame.bet}`);
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
        state.player.inventory.slice(0, 5).forEach((item: string) => {
            this.writeText(screen, startX, currentY++, `- ${item}`);
        });
        
        currentY++; // Empty line
        
        // Recent log messages
        this.writeText(screen, startX, currentY++, 'Log:');
        const recentMessages: LogMessage[] = state.ui.logMessages.slice(-4);
        recentMessages.forEach((msg: LogMessage) => {
            const text: string = msg.message.length > 25 ? msg.message.substring(0, 22) + '...' : msg.message;
            this.writeText(screen, startX, currentY++, `> ${text}`);
        });
    }

    /**
     * Draw bottom command bar with unified interface
     */
    private drawBottomBar(screen: ScreenCell[][], state: RootState): void {
        const bottomY: number = this.height - 1;
        
        // Draw separator line
        for (let x = 0; x < this.width; x++) {
            if (bottomY - 1 >= 0 && bottomY - 1 < screen.length && screen[bottomY - 1] && x < screen[bottomY - 1]!.length) {
                screen[bottomY - 1]![x] = { char: '-' };
            }
        }
        
        // Context-specific commands based on Redux state
        let commands: string = '';
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
        const contextIndicator: string = `[${state.ui.currentContext.toUpperCase()}] `;
        const fullCommand: string = contextIndicator + commands;
        
        // Truncate if too long
        const displayCommand: string = fullCommand.length > this.width - 2 
            ? fullCommand.substring(0, this.width - 5) + '...'
            : fullCommand;
        
        this.writeText(screen, 1, bottomY, displayCommand);
    }

    /**
     * Write text to screen buffer
     */
    private writeText(screen: ScreenCell[][], x: number, y: number, text: string): void {
        if (y < 0 || y >= screen.length || !screen[y]) return;
        
        for (let i = 0; i < text.length && (x + i) < screen[y]!.length; i++) {
            if (x + i >= 0 && text[i] !== undefined) {
                screen[y]![x + i] = { char: text[i] || ' ' };
            }
        }
    }

    /**
     * Check if coordinates are within bounds
     */
    private isInBounds(x: number, y: number, minX: number, minY: number, maxX: number, maxY: number): boolean {
        return x >= minX && x < maxX && y >= minY && y < maxY;
    }

    /**
     * Convert screen buffer to string
     */
    private screenToString(screen: ScreenCell[][]): string {
        return screen.map((row: ScreenCell[]) => row.map((cell: ScreenCell) => cell.char).join('')).join('\n');
    }

    /**
     * Render gambling interface
     */
    public renderGamblingGame(gameState: any): void {
        const screen: ScreenCell[][] = Array.from({ length: this.height }, () =>
            Array.from({ length: this.width }, () => ({ char: ' ' } as ScreenCell))
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
        
        const output: string = this.screenToString(screen);
        
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
    private renderCoinFlip(screen: ScreenCell[][], gameState: any): void {
        const centerX: number = Math.floor(this.width / 2);
        const centerY: number = Math.floor(this.height / 2);
        
        this.writeText(screen, centerX - 10, centerY - 3, 'COIN FLIP');
        this.writeText(screen, centerX - 15, centerY - 1, `Bet: ${gameState.bet} coins`);
        
        if (gameState.result) {
            const coinChar: string = gameState.result === 'heads' ? 'H' : 'T';
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
    private renderLiarsDice(screen: ScreenCell[][], gameState: any): void {
        const centerX: number = Math.floor(this.width / 2);
        let currentY: number = 3;
        
        this.writeText(screen, centerX - 6, currentY++, "LIAR'S DICE");
        currentY++;
        
        if (gameState.yourDice) {
            this.writeText(screen, 5, currentY++, 'Your dice: ');
            const diceStr: string = gameState.yourDice.map((d: number) => `[${d}]`).join(' ');
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
     * Render blackjack game (placeholder)
     */
    private renderBlackjack(screen: ScreenCell[][], gameState: any): void {
        this.renderGenericGambling(screen, gameState);
    }

    /**
     * Render generic gambling game
     */
    private renderGenericGambling(screen: ScreenCell[][], gameState: any): void {
        const centerX: number = Math.floor(this.width / 2);
        const centerY: number = Math.floor(this.height / 2);
        
        this.writeText(screen, centerX - 10, centerY - 2, gameState.type.toUpperCase());
        this.writeText(screen, centerX - 8, centerY, `Bet: ${gameState.bet}`);
        this.writeText(screen, centerX - 8, centerY + 2, 'Playing...');
    }

    /**
     * Setup event listeners
     */
    private setupEventListeners(): void {
        // Listen for gambling events to switch to gambling UI
        events.on(EVENT_TYPES.GAMBLING_SESSION_START, (event: any) => {
            // Could switch to gambling-specific rendering mode
        });
        
        events.on(EVENT_TYPES.GAMBLING_SESSION_END, (event: any) => {
            // Could show result animation
        });
    }

    /**
     * Get renderer status
     */
    public getStatus(): { width: number; height: number; hasContainer: boolean; lastRenderTime: number | null } {
        return {
            width: this.width,
            height: this.height,
            hasContainer: !!this.container,
            lastRenderTime: this.lastRenderedState ? Date.now() : null
        };
    }
}

// Helper function to create and initialize renderer
export const createRenderer = (container: HTMLElement | null = null): ASCIIRenderer => {
    const renderer = new ASCIIRenderer(container);
    renderer.initialize();
    return renderer;
};

// Default renderer instance for compatibility
export const renderer = new ASCIIRenderer();