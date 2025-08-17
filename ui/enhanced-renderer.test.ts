/**
 * Unit tests for Enhanced ASCII Renderer
 * Testing streaming capabilities and multiplayer features
 */

import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { EnhancedASCIIRenderer } from './enhanced-renderer.js';
import type { RootState, GameServerBroadcast, GameEntity } from '../core/types.js';

// Mock WebSocket
class MockWebSocket {
    public static OPEN = 1;
    public static CLOSED = 3;

    public readyState = MockWebSocket.OPEN;
    public url: string;
    public onopen: ((event: any) => void) | null = null;
    public onclose: ((event: any) => void) | null = null;
    public onmessage: ((event: any) => void) | null = null;
    public onerror: ((event: any) => void) | null = null;

    constructor(url: string) {
        this.url = url;
        setTimeout(() => {
            this.onopen?.(new Event('open'));
        }, 10);
    }

    send(data: string) {}
    close(code?: number, reason?: string) {
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.(new CloseEvent('close', { code, reason, wasClean: true }));
    }
}

// Mock DOM environment
const mockDocument = {
    getElementById: mock(() => ({
        textContent: '',
        innerHTML: '',
        appendChild: mock(),
        style: { display: 'none' }
    })),
    createElement: mock(() => ({
        id: '',
        textContent: '',
        innerHTML: '',
        className: ''
    }))
};

// Mock state
const mockGameState: RootState = {
    game: {
        version: '1.0.0',
        timestamp: Date.now(),
        seed: 12345,
        gameMode: 'test',
        currentGame: null,
        floor: {
            current: 1,
            layout: null,
            enemies: [],
            items: [],
            discovered: new Set(),
            exits: []
        },
        meta: {
            totalPlayTime: 0,
            gamesPlayed: 0,
            lastSaveTime: null,
            achievements: []
        }
    },
    player: {
        x: 5,
        y: 3,
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        level: 1,
        experience: 0,
        coins: 10,
        inventory: [],
        stats: { luck: 1.0, speed: 1.0, strength: 1.0 },
        equipment: { weapon: null, armor: null }
    },
    ui: {
        currentContext: 'world',
        selectedIndex: 0,
        highlightedInteraction: null,
        logMessages: [],
        menu: { title: '', items: [] },
        showDebug: false
    },
    inventory: {
        items: [],
        equipment: { weapon: null, armor: null, accessory1: null, accessory2: null },
        capacity: 20,
        lastUsedItem: null
    },
    combat: {
        inCombat: false,
        currentEnemy: null,
        combatLog: [],
        playerTurn: true,
        turnCount: 0,
        lastAction: null,
        damageDealt: 0,
        damageTaken: 0,
        experience: 0
    },
    input: {
        currentContext: 'world',
        contextStack: [],
        interactions: {}
    }
};

describe('EnhancedASCIIRenderer', () => {
    let renderer: EnhancedASCIIRenderer;

    beforeEach(() => {
        // Setup mocks
        global.WebSocket = MockWebSocket as any;
        global.document = mockDocument as any;
        global.console = {
            ...console,
            log: mock(),
            error: mock()
        };
        
        renderer = new EnhancedASCIIRenderer(null);
    });

    afterEach(() => {
        renderer.destroy();
    });

    describe('Initialization', () => {
        it('should create enhanced renderer instance', () => {
            expect(renderer).toBeInstanceOf(EnhancedASCIIRenderer);
        });

        it('should start with streaming disabled', () => {
            const capabilities = renderer.getCapabilities();
            expect(capabilities.streaming).toBe(false);
        });

        it('should have enhanced capabilities', () => {
            const capabilities = renderer.getCapabilities();
            expect(capabilities).toHaveProperty('colors');
            expect(capabilities).toHaveProperty('streaming');
            expect(capabilities).toHaveProperty('mouse');
            expect(capabilities).toHaveProperty('unicode');
        });
    });

    describe('Game Server Connection', () => {
        it('should connect to game server successfully', async () => {
            await renderer.connectToGameServer('ws://localhost:8080');
            
            // Wait for mock connection
            await new Promise(resolve => setTimeout(resolve, 20));
            
            const status = renderer.getStreamingStatus();
            expect(status.isStreaming).toBe(true);
        });

        it('should enable streaming mode when connected', async () => {
            await renderer.connectToGameServer();
            await new Promise(resolve => setTimeout(resolve, 20));
            
            const capabilities = renderer.getCapabilities();
            expect(capabilities.streaming).toBe(true);
        });

        it('should handle connection errors gracefully', async () => {
            // Mock WebSocket with error
            global.WebSocket = class extends MockWebSocket {
                constructor(url: string) {
                    super(url);
                    setTimeout(() => {
                        this.onerror?.(new Event('error'));
                    }, 10);
                }
            } as any;

            const consoleSpy = mock();
            console.error = consoleSpy;

            await renderer.connectToGameServer('ws://invalid:9999');
            await new Promise(resolve => setTimeout(resolve, 20));

            expect(consoleSpy).toHaveBeenCalled();
        });
    });

    describe('Message Handling', () => {
        beforeEach(async () => {
            await renderer.connectToGameServer();
            await new Promise(resolve => setTimeout(resolve, 20));
        });

        it('should handle state update messages', () => {
            const mockMessage: GameServerBroadcast = {
                type: 'state_update',
                data: { gameState: mockGameState },
                frameId: 123,
                timestamp: Date.now()
            };

            const ws = (renderer as any).gameServerClient;
            ws.onmessage?.(new MessageEvent('message', {
                data: JSON.stringify(mockMessage)
            }));

            const status = renderer.getStreamingStatus();
            expect(status.frameId).toBe(123);
        });

        it('should handle entity update messages', () => {
            const mockEntities: GameEntity[] = [
                {
                    id: 'player1',
                    type: 'player',
                    position: { x: 1, y: 2, z: 0 },
                    model: 'player_model',
                    metadata: {
                        name: 'Test Player',
                        interactive: true
                    },
                    lastUpdated: Date.now()
                }
            ];

            const mockMessage: GameServerBroadcast = {
                type: 'entity_update',
                data: { entities: mockEntities },
                frameId: 124,
                timestamp: Date.now()
            };

            const ws = (renderer as any).gameServerClient;
            ws.onmessage?.(new MessageEvent('message', {
                data: JSON.stringify(mockMessage)
            }));

            const status = renderer.getStreamingStatus();
            expect(status.entitiesCount).toBe(1);
        });

        it('should ignore outdated frame updates', () => {
            // Set current frame to higher value
            (renderer as any).lastUpdateFrameId = 200;

            const mockMessage: GameServerBroadcast = {
                type: 'state_update',
                data: { gameState: mockGameState },
                frameId: 100, // Older frame
                timestamp: Date.now()
            };

            const renderSpy = mock();
            renderer.render = renderSpy;

            const ws = (renderer as any).gameServerClient;
            ws.onmessage?.(new MessageEvent('message', {
                data: JSON.stringify(mockMessage)
            }));

            expect(renderSpy).not.toHaveBeenCalled();
        });
    });

    describe('Rendering', () => {
        it('should render state without errors', () => {
            expect(() => {
                renderer.render(mockGameState);
            }).not.toThrow();
        });

        it('should add multiplayer overlays in streaming mode', async () => {
            await renderer.connectToGameServer();
            await new Promise(resolve => setTimeout(resolve, 20));

            // Enable debug mode
            mockDocument.getElementById = mock(() => ({
                textContent: '',
                innerHTML: '',
                appendChild: mock(),
                style: { display: 'block' } // Debug panel visible
            }));

            expect(() => {
                renderer.render(mockGameState);
            }).not.toThrow();
        });
    });

    describe('Entity Management', () => {
        beforeEach(async () => {
            await renderer.connectToGameServer();
            await new Promise(resolve => setTimeout(resolve, 20));
        });

        it('should cache entities from updates', () => {
            const mockEntities: GameEntity[] = [
                {
                    id: 'player1',
                    type: 'player',
                    position: { x: 1, y: 2, z: 0 },
                    model: 'player_model',
                    metadata: {
                        name: 'Player 1',
                        interactive: true
                    },
                    lastUpdated: Date.now()
                },
                {
                    id: 'enemy1',
                    type: 'enemy',
                    position: { x: 5, y: 5, z: 0 },
                    model: 'enemy_model',
                    metadata: {
                        name: 'Test Enemy',
                        interactive: false
                    },
                    lastUpdated: Date.now()
                }
            ];

            const mockMessage: GameServerBroadcast = {
                type: 'entity_update',
                data: { entities: mockEntities },
                frameId: 125,
                timestamp: Date.now()
            };

            const ws = (renderer as any).gameServerClient;
            ws.onmessage?.(new MessageEvent('message', {
                data: JSON.stringify(mockMessage)
            }));

            const status = renderer.getStreamingStatus();
            expect(status.entitiesCount).toBe(2);
        });

        it('should clear entity cache on clear', () => {
            // Add some entities first
            const entityCache = (renderer as any).entityCache;
            entityCache.set('test1', { id: 'test1', type: 'player' });
            entityCache.set('test2', { id: 'test2', type: 'enemy' });

            renderer.clear();

            const status = renderer.getStreamingStatus();
            expect(status.entitiesCount).toBe(0);
            expect(status.frameId).toBe(0);
        });
    });

    describe('Status Management', () => {
        it('should provide streaming status', () => {
            const status = renderer.getStreamingStatus();
            expect(status).toHaveProperty('isStreaming');
            expect(status).toHaveProperty('frameId');
            expect(status).toHaveProperty('entitiesCount');
            expect(typeof status.isStreaming).toBe('boolean');
            expect(typeof status.frameId).toBe('number');
            expect(typeof status.entitiesCount).toBe('number');
        });

        it('should update frame ID from server messages', async () => {
            await renderer.connectToGameServer();
            await new Promise(resolve => setTimeout(resolve, 20));

            const mockMessage: GameServerBroadcast = {
                type: 'state_update',
                data: { gameState: mockGameState },
                frameId: 999,
                timestamp: Date.now()
            };

            const ws = (renderer as any).gameServerClient;
            ws.onmessage?.(new MessageEvent('message', {
                data: JSON.stringify(mockMessage)
            }));

            const status = renderer.getStreamingStatus();
            expect(status.frameId).toBe(999);
        });
    });

    describe('Cleanup', () => {
        it('should cleanup WebSocket connection on destroy', async () => {
            await renderer.connectToGameServer();
            await new Promise(resolve => setTimeout(resolve, 20));

            const ws = (renderer as any).gameServerClient;
            const closeSpy = mock();
            ws.close = closeSpy;

            renderer.destroy();

            expect(closeSpy).toHaveBeenCalledWith(1000, 'Renderer cleanup');
        });

        it('should reset streaming state on destroy', async () => {
            await renderer.connectToGameServer();
            await new Promise(resolve => setTimeout(resolve, 20));

            renderer.destroy();

            const status = renderer.getStreamingStatus();
            expect(status.isStreaming).toBe(false);
            expect(status.entitiesCount).toBe(0);
        });
    });
});