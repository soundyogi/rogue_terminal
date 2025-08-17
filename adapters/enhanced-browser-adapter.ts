/**
 * Enhanced Browser Adapter with Game Server Integration
 * WebSocket client implementation for real-time multiplayer support
 */

import { ReduxBrowserAdapter } from './redux-browser.ts';
import type { 
    RootState,
    GameServerState,
    ClientInput,
    GameServerBroadcast
} from '../core/types.js';

export class EnhancedBrowserAdapter extends ReduxBrowserAdapter {
    private gameServerClient: WebSocket | null = null;
    private isConnected: boolean = false;
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 1000;
    private clientId: string = '';
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private connectionStatus: HTMLElement | null = null;

    constructor() {
        super();
        this.generateClientId();
    }

    /**
     * Initialize with Game Server connection
     */
    public override async initialize(containerId: string = 'game-container'): Promise<boolean> {
        const success = await super.initialize(containerId);
        if (success) {
            this.setupConnectionStatus();
            await this.connectToGameServer();
        }
        return success;
    }

    /**
     * Connect to Game Server with WebSocket
     */
    public async connectToGameServer(serverUrl: string = 'ws://localhost:8080'): Promise<void> {
        try {
            console.log('Connecting to Game Server at', serverUrl);
            
            this.gameServerClient = new WebSocket(serverUrl);
            
            this.gameServerClient.onopen = (event) => {
                console.log('🔌 Connected to Game Server');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.updateConnectionStatus('Connected', 'success');
                
                // Send client identification
                this.sendToServer({
                    type: 'client_connect',
                    clientId: this.clientId,
                    clientType: 'browser',
                    timestamp: Date.now()
                });
                
                // Start heartbeat
                this.startHeartbeat();
            };
            
            this.gameServerClient.onmessage = (event) => {
                this.handleServerMessage(event);
            };
            
            this.gameServerClient.onclose = (event) => {
                console.log('🔌 Disconnected from Game Server');
                this.isConnected = false;
                this.updateConnectionStatus('Disconnected', 'error');
                this.stopHeartbeat();
                
                // Attempt reconnection if not intentional
                if (!event.wasClean) {
                    this.attemptReconnection(serverUrl);
                }
            };
            
            this.gameServerClient.onerror = (event) => {
                console.error('❌ Game Server connection error:', event);
                this.updateConnectionStatus('Error', 'error');
            };
            
        } catch (error) {
            console.error('Failed to connect to Game Server:', error);
            this.updateConnectionStatus('Failed', 'error');
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
                    this.handleStateUpdate(message);
                    break;
                case 'entity_update':
                    this.handleEntityUpdate(message);
                    break;
                case 'action_result':
                    this.handleActionResult(message);
                    break;
                case 'error':
                    this.handleServerError(message);
                    break;
                default:
                    console.log('Unknown server message type:', message.type);
            }
        } catch (error) {
            console.error('Error parsing server message:', error);
        }
    }

    /**
     * Handle state update from server
     */
    private handleStateUpdate(message: GameServerBroadcast): void {
        if (message.data && message.data.gameState) {
            // Update local state based on server state
            // This enables real-time synchronization
            const serverState: RootState = message.data.gameState;
            
            // Optional: Only update if we're not the source of the change
            if (message.clientId !== this.clientId) {
                console.log('📡 Received state update from server');
                // The renderer will automatically update via Redux subscription
            }
        }
    }

    /**
     * Handle entity update from server  
     */
    private handleEntityUpdate(message: GameServerBroadcast): void {
        console.log('🎮 Entity update received:', message.data);
        // Handle entity-specific updates for 3D rendering
    }

    /**
     * Handle action result from server
     */
    private handleActionResult(message: GameServerBroadcast): void {
        console.log('⚡ Action result:', message.data);
        // Handle action confirmation/results
    }

    /**
     * Handle server error
     */
    private handleServerError(message: GameServerBroadcast): void {
        console.error('🚨 Server error:', message.data);
        this.updateConnectionStatus(`Error: ${message.data.message || 'Unknown'}`, 'error');
    }

    /**
     * Send input to server
     */
    private sendInputToServer(inputType: string, inputData: any): void {
        if (this.isConnected && this.gameServerClient) {
            const clientInput: ClientInput = {
                type: 'keyboard',
                action: inputType,
                data: inputData,
                timestamp: Date.now(),
                clientId: this.clientId
            };
            
            this.sendToServer({
                type: 'client_input',
                input: clientInput
            });
        }
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
     * Override key handling to include server communication
     */
    protected override handleKeyDown(event: KeyboardEvent): void {
        super.handleKeyDown(event);
        
        // Also send input to server for multiplayer sync
        if (this.isConnected) {
            const { inputType, inputData } = this.mapKeyEventToInput(event);
            if (inputType) {
                this.sendInputToServer(inputType, inputData);
            }
        }
    }

    /**
     * Setup connection status indicator
     */
    private setupConnectionStatus(): void {
        if (!this.gameContainer) return;

        // Add connection status to debug panel
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) {
            const statusDiv = document.createElement('div');
            statusDiv.id = 'connection-status';
            statusDiv.innerHTML = `
                <h4>Server Connection</h4>
                <div id="connection-indicator">
                    <span id="connection-status-text">Connecting...</span>
                    <span id="connection-status-dot" class="status-dot connecting"></span>
                </div>
            `;
            
            // Add CSS for status indicator
            const style = document.createElement('style');
            style.textContent = `
                .status-dot {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    margin-left: 5px;
                }
                .status-dot.connecting { background-color: orange; }
                .status-dot.success { background-color: green; }
                .status-dot.error { background-color: red; }
            `;
            document.head.appendChild(style);
            
            debugPanel.appendChild(statusDiv);
            this.connectionStatus = document.getElementById('connection-status-text');
        }
    }

    /**
     * Update connection status display
     */
    private updateConnectionStatus(status: string, type: 'success' | 'error' | 'connecting'): void {
        if (this.connectionStatus) {
            this.connectionStatus.textContent = status;
        }
        
        const statusDot = document.getElementById('connection-status-dot');
        if (statusDot) {
            statusDot.className = `status-dot ${type}`;
        }
    }

    /**
     * Generate unique client ID
     */
    private generateClientId(): void {
        this.clientId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Start heartbeat to maintain connection
     */
    private startHeartbeat(): void {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.sendToServer({
                    type: 'heartbeat',
                    clientId: this.clientId,
                    timestamp: Date.now()
                });
            }
        }, 30000); // 30 second heartbeat
    }

    /**
     * Stop heartbeat
     */
    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Attempt to reconnect to server
     */
    private async attemptReconnection(serverUrl: string): Promise<void> {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('🔌 Max reconnection attempts reached');
            this.updateConnectionStatus('Failed - Max attempts reached', 'error');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
        
        console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        this.updateConnectionStatus(`Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'connecting');
        
        setTimeout(() => {
            this.connectToGameServer(serverUrl);
        }, delay);
    }

    /**
     * Get connection status
     */
    public getConnectionStatus(): {
        connected: boolean;
        clientId: string;
        reconnectAttempts: number;
    } {
        return {
            connected: this.isConnected,
            clientId: this.clientId,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    /**
     * Manually disconnect from server
     */
    public disconnect(): void {
        if (this.gameServerClient) {
            this.gameServerClient.close(1000, 'Client disconnect');
        }
        this.stopHeartbeat();
        this.isConnected = false;
        this.updateConnectionStatus('Disconnected', 'error');
    }

    /**
     * Enhanced cleanup with server disconnection
     */
    public override destroy(): void {
        this.disconnect();
        super.destroy();
    }

    /**
     * Override debug info to include server status
     */
    protected override updateDebugInfo(): void {
        super.updateDebugInfo();
        
        const debugInfo = document.getElementById('debug-info');
        if (debugInfo && this.isConnected) {
            const connectionInfo = `
                <h4>Multiplayer Status</h4>
                <p>Client ID: ${this.clientId.slice(-8)}</p>
                <p>Connected: ${this.isConnected}</p>
                <p>Reconnect attempts: ${this.reconnectAttempts}</p>
            `;
            debugInfo.innerHTML += connectionInfo;
        }
    }
}

// Create enhanced adapter instance
export const enhancedBrowserAdapter = new EnhancedBrowserAdapter();