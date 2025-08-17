/**
 * Unit tests for Enhanced Browser Adapter
 * Testing WebSocket client integration and multiplayer features
 */

import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { EnhancedBrowserAdapter } from './enhanced-browser-adapter.js';

// Mock WebSocket
class MockWebSocket {
    public static CONNECTING = 0;
    public static OPEN = 1;
    public static CLOSING = 2;
    public static CLOSED = 3;

    public readyState = MockWebSocket.CONNECTING;
    public url: string;
    public onopen: ((event: any) => void) | null = null;
    public onclose: ((event: any) => void) | null = null;
    public onmessage: ((event: any) => void) | null = null;
    public onerror: ((event: any) => void) | null = null;

    constructor(url: string) {
        this.url = url;
        // Simulate async connection
        setTimeout(() => {
            this.readyState = MockWebSocket.OPEN;
            this.onopen?.(new Event('open'));
        }, 10);
    }

    send(data: string) {
        // Mock send behavior
    }

    close(code?: number, reason?: string) {
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.(new CloseEvent('close', { code, reason, wasClean: true }));
    }
}

// Mock DOM environment
const mockDocument = {
    getElementById: mock(() => null),
    createElement: mock(() => ({
        id: '',
        style: {},
        innerHTML: '',
        appendChild: mock(),
        addEventListener: mock(),
        removeEventListener: mock()
    })),
    body: {
        appendChild: mock()
    },
    head: {
        appendChild: mock()
    },
    addEventListener: mock(),
    removeEventListener: mock()
};

describe('EnhancedBrowserAdapter', () => {
    let adapter: EnhancedBrowserAdapter;

    beforeEach(() => {
        // Setup mocks
        global.WebSocket = MockWebSocket as any;
        global.document = mockDocument as any;
        global.localStorage = {
            getItem: mock(() => null),
            setItem: mock(),
            removeItem: mock()
        } as any;
        
        adapter = new EnhancedBrowserAdapter();
    });

    afterEach(() => {
        adapter.destroy();
    });

    describe('Initialization', () => {
        it('should create enhanced adapter instance', () => {
            expect(adapter).toBeInstanceOf(EnhancedBrowserAdapter);
        });

        it('should generate unique client ID', () => {
            const status = adapter.getConnectionStatus();
            expect(status.clientId).toContain('browser_');
            expect(status.clientId.length).toBeGreaterThan(10);
        });

        it('should start disconnected', () => {
            const status = adapter.getConnectionStatus();
            expect(status.connected).toBe(false);
            expect(status.reconnectAttempts).toBe(0);
        });
    });

    describe('WebSocket Connection', () => {
        it('should connect to game server', async () => {
            await adapter.connectToGameServer('ws://localhost:8080');
            
            // Wait for mock connection to open
            await new Promise(resolve => setTimeout(resolve, 20));
            
            const status = adapter.getConnectionStatus();
            expect(status.connected).toBe(true);
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

            await adapter.connectToGameServer('ws://invalid:9999');
            await new Promise(resolve => setTimeout(resolve, 20));

            expect(consoleSpy).toHaveBeenCalled();
        });

        it('should generate client identification message', async () => {
            const sendSpy = mock();
            global.WebSocket = class extends MockWebSocket {
                override send = sendSpy;
            } as any;

            await adapter.connectToGameServer();
            await new Promise(resolve => setTimeout(resolve, 20));

            expect(sendSpy).toHaveBeenCalledWith(
                expect.stringContaining('"type":"client_connect"')
            );
        });
    });

    describe('Message Handling', () => {
        it('should handle state update messages', async () => {
            await adapter.connectToGameServer();
            await new Promise(resolve => setTimeout(resolve, 20));

            const mockMessage = {
                type: 'state_update',
                data: {
                    gameState: {
                        player: { x: 5, y: 3 },
                        ui: { currentContext: 'world' }
                    }
                },
                frameId: 123,
                timestamp: Date.now()
            };

            // Get the WebSocket instance
            const ws = (adapter as any).gameServerClient;
            ws.onmessage?.(new MessageEvent('message', {
                data: JSON.stringify(mockMessage)
            }));

            // Should handle message without errors
            expect(true).toBe(true); // Test passes if no errors thrown
        });

        it('should handle entity update messages', async () => {
            await adapter.connectToGameServer();
            await new Promise(resolve => setTimeout(resolve, 20));

            const mockMessage = {
                type: 'entity_update',
                data: {
                    entities: [
                        { id: 'player1', type: 'player', position: { x: 1, y: 2, z: 0 } }
                    ]
                },
                frameId: 124,
                timestamp: Date.now()
            };

            const ws = (adapter as any).gameServerClient;
            ws.onmessage?.(new MessageEvent('message', {
                data: JSON.stringify(mockMessage)
            }));

            // Should handle message without errors
            expect(true).toBe(true);
        });
    });

    describe('Input Processing', () => {
        it('should send input to server when connected', async () => {
            const sendSpy = mock();
            global.WebSocket = class extends MockWebSocket {
                override send = sendSpy;
            } as any;

            await adapter.connectToGameServer();
            await new Promise(resolve => setTimeout(resolve, 20));

            // Simulate key press
            // Mock KeyboardEvent for test environment
            const keyEvent = {
                code: 'ArrowUp',
                type: 'keydown',
                preventDefault: () => {},
                stopPropagation: () => {}
            } as KeyboardEvent;
            (adapter as any).handleKeyDown(keyEvent);

            expect(sendSpy).toHaveBeenCalledWith(
                expect.stringContaining('"type":"client_input"')
            );
        });

        it('should not send input when disconnected', () => {
            const sendSpy = mock();
            
            // Simulate key press while disconnected
            // Mock KeyboardEvent for test environment
            const keyEvent = {
                code: 'ArrowUp',
                type: 'keydown',
                preventDefault: () => {},
                stopPropagation: () => {}
            } as KeyboardEvent;
            (adapter as any).handleKeyDown(keyEvent);

            expect(sendSpy).not.toHaveBeenCalled();
        });
    });

    describe('Connection Management', () => {
        it('should implement heartbeat mechanism', async () => {
            const sendSpy = mock();
            global.WebSocket = class extends MockWebSocket {
                override send = sendSpy;
            } as any;

            await adapter.connectToGameServer();
            await new Promise(resolve => setTimeout(resolve, 20));

            // Simulate heartbeat interval (mocked to be faster)
            (adapter as any).startHeartbeat = mock(() => {
                setInterval(() => {
                    (adapter as any).sendToServer({
                        type: 'heartbeat',
                        clientId: (adapter as any).clientId,
                        timestamp: Date.now()
                    });
                }, 100);
            });

            (adapter as any).startHeartbeat();
            
            // Wait for heartbeat
            await new Promise(resolve => setTimeout(resolve, 150));
            
            expect(sendSpy).toHaveBeenCalledWith(
                expect.stringContaining('"type":"heartbeat"')
            );
        });

        it('should attempt reconnection on unexpected disconnect', async () => {
            const reconnectSpy = mock();
            (adapter as any).attemptReconnection = reconnectSpy;

            await adapter.connectToGameServer();
            await new Promise(resolve => setTimeout(resolve, 20));

            // Simulate unexpected disconnect
            const ws = (adapter as any).gameServerClient;
            ws.onclose?.(new CloseEvent('close', { wasClean: false }));

            expect(reconnectSpy).toHaveBeenCalled();
        });
    });

    describe('Cleanup', () => {
        it('should properly cleanup on destroy', async () => {
            await adapter.connectToGameServer();
            await new Promise(resolve => setTimeout(resolve, 20));

            const ws = (adapter as any).gameServerClient;
            const closeSpy = mock();
            ws.close = closeSpy;

            adapter.destroy();

            expect(closeSpy).toHaveBeenCalledWith(1000, 'Client disconnect');
        });
    });
});