/**
 * Enhanced ASCII Renderer with Game Server Integration
 * Streaming-capable renderer for real-time multiplayer support
 */

import { ASCIIRenderer } from './renderer.js';
import type { 
    RootState,
    RenderCapabilities,
    GameServerBroadcast,
    GameEntity
} from '../core/types.js';

export class EnhancedASCIIRenderer extends ASCIIRenderer {
    private isStreamingMode: boolean = false;
    private gameServerClient: WebSocket | null = null;
    private entityCache: Map<string, GameEntity> = new Map();
    private lastUpdateFrameId: number = 0;
    private multiplayerIndicator: HTMLElement | null = null;

    constructor(container: HTMLElement | null = null) {
        super(container);
        this.setupMultiplayerIndicator();
    }

    /**
     * Enhanced capabilities with streaming support
     */
    public override getCapabilities(): RenderCapabilities {
        return {
            colors: this.mode === 'terminal',
            mouse: this.mode === 'browser',
            unicode: true,
            streaming: this.isStreamingMode
        };
    }

    /**
     * Connect to Game Server for streaming updates
     */
    public async connectToGameServer(serverUrl: string = 'ws://localhost:8080'): Promise<void> {
        try {
            console.log('🎮 Enhanced Renderer connecting to Game Server...');
            
            this.gameServerClient = new WebSocket(serverUrl);
            
            this.gameServerClient.onopen = () => {
                console.log('🎮 Enhanced Renderer connected to Game Server');
                this.isStreamingMode = true;
                this.updateMultiplayerIndicator('Connected', 'success');
                
                // Send renderer identification
                this.sendToServer({
                    type: 'renderer_connect',
                    renderType: 'enhanced_ascii',
                    capabilities: this.getCapabilities(),
                    timestamp: Date.now()
                });
            };
            
            this.gameServerClient.onmessage = (event) => {
                this.handleServerMessage(event);
            };
            
            this.gameServerClient.onclose = () => {
                console.log('🎮 Enhanced Renderer disconnected from Game Server');
                this.isStreamingMode = false;
                this.updateMultiplayerIndicator('Disconnected', 'error');
            };
            
            this.gameServerClient.onerror = (error) => {
                console.error('🚨 Enhanced Renderer connection error:', error);
                this.updateMultiplayerIndicator('Error', 'error');
            };
            
        } catch (error) {
            console.error('Failed to connect Enhanced Renderer to Game Server:', error);
            throw error;
        }
    }

    /**
     * Handle messages from Game Server
     */
    private handleServerMessage(event: MessageEvent): void {
        try {
            const message: GameServerBroadcast = JSON.parse(event.data);
            
            switch (message.type) {
                case 'state_update':
                    this.handleStreamingStateUpdate(message);
                    break;
                case 'entity_update':
                    this.handleEntityUpdate(message);
                    break;
                default:
                    // Let parent handle unknown messages
                    console.log('Enhanced Renderer received:', message.type);
            }
        } catch (error) {
            console.error('Enhanced Renderer message parse error:', error);
        }
    }

    /**
     * Handle streaming state updates from server
     */
    private handleStreamingStateUpdate(message: GameServerBroadcast): void {
        if (message.frameId <= this.lastUpdateFrameId) {
            return; // Skip outdated updates
        }
        
        this.lastUpdateFrameId = message.frameId;
        
        if (message.data && message.data.gameState) {
            const serverState: RootState = message.data.gameState;
            console.log('📡 Enhanced Renderer received streaming update, frame:', message.frameId);
            
            // Performance optimization: only render if state actually changed
            if (this.hasStateChanged(serverState)) {
                this.render(serverState);
                this.lastRenderedState = serverState;
            }
            
            // Update multiplayer indicators
            this.updateMultiplayerStatus(message);
        }
    }

    /**
     * Cached state for performance comparison
     */
    private override lastRenderedState: RootState | null = null;

    /**
     * Optimized state comparison to avoid unnecessary re-renders
     */
    private hasStateChanged(newState: RootState): boolean {
        if (!this.lastRenderedState) return true;
        
        const prev = this.lastRenderedState;
        
        // Quick comparison of key properties that affect rendering
        return (
            prev.player?.x !== newState.player?.x ||
            prev.player?.y !== newState.player?.y ||
            prev.player?.hp !== newState.player?.hp ||
            prev.player?.coins !== newState.player?.coins ||
            prev.ui?.currentContext !== newState.ui?.currentContext ||
            prev.game?.floor?.current !== newState.game?.floor?.current ||
            prev.player?.inventory?.length !== newState.player?.inventory?.length
        );
    }

    /**
     * Handle entity-specific updates
     */
    private handleEntityUpdate(message: GameServerBroadcast): void {
        if (message.data && message.data.entities) {
            message.data.entities.forEach((entity: GameEntity) => {
                this.entityCache.set(entity.id, entity);
            });
            
            console.log('🎮 Entity cache updated, entities:', this.entityCache.size);
            this.updateEntityOverlay();
        }
    }

    /**
     * Enhanced render method with multiplayer indicators
     */
    public override render(state: RootState): void {
        // Call parent render
        super.render(state);
        
        // Add multiplayer overlays if in streaming mode
        if (this.isStreamingMode) {
            this.renderMultiplayerOverlay(state);
        }
    }

    /**
     * Render multiplayer-specific overlays
     */
    private renderMultiplayerOverlay(state: RootState): void {
        // Add frame ID indicator in debug mode
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel && debugPanel.style.display !== 'none') {
            const frameInfo = document.getElementById('frame-info');
            if (frameInfo) {
                frameInfo.textContent = `Frame: ${this.lastUpdateFrameId}`;
            } else {
                const frameDiv = document.createElement('div');
                frameDiv.id = 'frame-info';
                frameDiv.textContent = `Frame: ${this.lastUpdateFrameId}`;
                debugPanel.appendChild(frameDiv);
            }
        }
        
        // Show entity count if available
        if (this.entityCache.size > 0) {
            this.updateEntityDisplay();
        }
    }

    /**
     * Update entity overlay display
     */
    private updateEntityOverlay(): void {
        const entityInfo = document.getElementById('entity-overlay');
        if (entityInfo && this.entityCache.size > 0) {
            const entities = Array.from(this.entityCache.values());
            const players = entities.filter(e => e.type === 'player').length;
            const enemies = entities.filter(e => e.type === 'enemy').length;
            const items = entities.filter(e => e.type === 'item').length;
            
            entityInfo.innerHTML = `
                <div class="entity-stats">
                    Players: ${players} | Enemies: ${enemies} | Items: ${items}
                </div>
            `;
        }
    }

    /**
     * Update entity display in sidebar
     */
    private updateEntityDisplay(): void {
        const debugInfo = document.getElementById('debug-info');
        if (debugInfo && this.isStreamingMode) {
            const entityInfo = `
                <h4>Live Entities</h4>
                <p>Total: ${this.entityCache.size}</p>
                <p>Frame: ${this.lastUpdateFrameId}</p>
            `;
            debugInfo.innerHTML += entityInfo;
        }
    }

    /**
     * Setup multiplayer indicator
     */
    private setupMultiplayerIndicator(): void {
        if (typeof document === 'undefined') return;
        
        // Add multiplayer status to existing UI
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) {
            const multiplayerDiv = document.createElement('div');
            multiplayerDiv.id = 'multiplayer-status';
            multiplayerDiv.innerHTML = `
                <h4>Multiplayer</h4>
                <div id="multiplayer-indicator">
                    <span id="multiplayer-status-text">Not connected</span>
                    <span id="multiplayer-status-dot" class="status-dot error"></span>
                </div>
            `;
            debugPanel.appendChild(multiplayerDiv);
            
            this.multiplayerIndicator = document.getElementById('multiplayer-status-text');
        }
    }

    /**
     * Update multiplayer indicator
     */
    private updateMultiplayerIndicator(status: string, type: 'success' | 'error' | 'connecting'): void {
        if (this.multiplayerIndicator) {
            this.multiplayerIndicator.textContent = status;
        }
        
        const statusDot = document.getElementById('multiplayer-status-dot');
        if (statusDot) {
            statusDot.className = `status-dot ${type}`;
        }
    }

    /**
     * Update multiplayer status with server data
     */
    private updateMultiplayerStatus(message: GameServerBroadcast): void {
        const statusText = `Connected (Frame ${message.frameId})`;
        this.updateMultiplayerIndicator(statusText, 'success');
    }

    /**
     * Send message to server
     */
    private sendToServer(message: any): void {
        if (this.gameServerClient && this.gameServerClient.readyState === WebSocket.OPEN) {
            this.gameServerClient.send(JSON.stringify(message));
        }
    }

    /**
     * Get streaming status
     */
    public getStreamingStatus(): {
        isStreaming: boolean;
        frameId: number;
        entitiesCount: number;
    } {
        return {
            isStreaming: this.isStreamingMode,
            frameId: this.lastUpdateFrameId,
            entitiesCount: this.entityCache.size
        };
    }

    /**
     * Enhanced cleanup with server disconnection
     */
    public destroy(): void {
        if (this.gameServerClient) {
            this.gameServerClient.close(1000, 'Renderer cleanup');
        }
        
        this.isStreamingMode = false;
        this.entityCache.clear();
    }

    /**
     * Override initialize to setup enhanced features
     */
    public override initialize(): void {
        super.initialize();
        
        // Auto-connect to game server if available
        if (typeof WebSocket !== 'undefined') {
            this.connectToGameServer().catch(error => {
                console.log('Game Server not available for enhanced renderer:', error.message);
            });
        }
    }

    /**
     * Clear method with multiplayer support
     */
    public override clear(): void {
        if (this.container) {
            this.container.textContent = '';
        } else {
            console.clear();
        }
        
        // Clear entity cache
        this.entityCache.clear();
        this.lastUpdateFrameId = 0;
    }
}

// Helper function to create enhanced renderer
export const createEnhancedRenderer = (container: HTMLElement | null = null): EnhancedASCIIRenderer => {
    const renderer = new EnhancedASCIIRenderer(container);
    renderer.initialize();
    return renderer;
};

// Enhanced renderer instance for compatibility
export const enhancedRenderer = new EnhancedASCIIRenderer();