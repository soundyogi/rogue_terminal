/**
 * Game Server Redux Middleware
 * Advanced implementation with Koa.js and WebSocket integration for multi-platform gaming
 */

import type { Middleware, PayloadAction } from '@reduxjs/toolkit';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import type { IncomingMessage } from 'http';
import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';

import type {
  RootState,
  GameEntity,
  WorldData,
  ClientInput,
  GameServerState,
  GameServerOptions,
  ConnectedClient,
  GameServerBroadcast,
  Vector3D,
  GameServerMiddlewareInterface
} from '../types.js';

export class GameServerMiddleware implements GameServerMiddlewareInterface {
  private clients: Map<string, ConnectedClient> = new Map();
  private wsServer: WebSocketServer | null = null;
  private httpServer: any = null;
  private koaApp: Koa | null = null;
  private entityIdCounter: number = 0;
  private lastBroadcastState: RootState | null = null;
  private store: any = null; // Will be injected by middleware
  
  constructor(private options: GameServerOptions = {}) {
    this.options = {
      port: 8080,
      enableHTTPAPI: process.env.NODE_ENV === 'development', // Smart defaults
      enableWebSocket: true,
      tickRate: 30, // 30 FPS
      compressionEnabled: true,
      allowedOrigins: ['*'],
      maxClients: 100,
      ...options
    };
  }

  // Redux Middleware Function
  public createMiddleware(): Middleware {
    return (store) => (next) => (action: unknown) => {
      // Store reference for API endpoints
      this.store = store;
      
      // Process action normally
      const result = next(action);
      
      // Get updated state
      const state: RootState = store.getState();
      
      // Broadcast state changes to connected clients if action has correct shape
      if (action && typeof action === 'object' && 'type' in action) {
        this.broadcastStateUpdate(action as PayloadAction<any>, state);
      }
      
      return result;
    };
  }

  public async initialize(): Promise<void> {
    if (this.options.enableWebSocket) {
      await this.setupWebSocketServer();
    }
    
    if (this.options.enableHTTPAPI) {
      await this.setupKoaServer();
      console.log('🌐 HTTP API enabled for debugging');
    } else {
      console.log('⚡ Pure WebSocket mode for maximum performance');
    }
    
    // Start heartbeat for client management
    this.startHeartbeat();
    
    console.log(`🎮 Game Server initialized on port ${this.options.port}`);
  }

  private async setupWebSocketServer(): Promise<void> {
    this.httpServer = createServer();
    this.wsServer = new WebSocketServer({ 
      server: this.httpServer,
      perMessageDeflate: this.options.compressionEnabled
    });
    
    this.wsServer.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      // Check client limit
      if (this.clients.size >= (this.options.maxClients || 100)) {
        ws.close(1008, 'Server full');
        return;
      }

      const clientId = this.generateClientId();
      const clientType = this.detectClientType(req);
      
      const client: ConnectedClient = {
        id: clientId,
        ws,
        type: clientType,
        lastPing: Date.now(),
        subscriptions: new Set(['all']) // Default: subscribe to all updates
      };
      
      this.clients.set(clientId, client);
      
      console.log(`📱 ${clientType} client connected: ${clientId} (${this.clients.size}/${this.options.maxClients})`);
      
      // Send initial game state
      this.sendInitialState(client);
      
      ws.on('message', (data: any) => {
        this.handleClientMessage(clientId, data);
      });
      
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`📱 Client disconnected: ${clientId} (${this.clients.size} remaining)`);
      });
      
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = Date.now();
        }
      });

      ws.on('error', (error: Error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });
    
    this.httpServer.listen(this.options.port);
  }

  private async setupKoaServer(): Promise<void> {
    this.koaApp = new Koa();
    const router = new Router();
    
    // Middleware
    this.koaApp.use(cors({
      origin: this.options.allowedOrigins?.[0] || '*'
    }));
    this.koaApp.use(bodyParser());
    
    // API Routes for Unreal Engine 5 Blueprint integration
    router.get('/api/gamestate', this.handleGetGameState.bind(this));
    router.post('/api/input', this.handlePostInput.bind(this));
    router.get('/api/entities', this.handleGetEntities.bind(this));
    router.get('/api/models', this.handleGetModels.bind(this));
    router.post('/api/subscribe', this.handleSubscribe.bind(this));
    router.get('/api/clients', this.handleGetClients.bind(this));
    
    // Health check
    router.get('/health', (ctx: Koa.Context) => {
      ctx.body = { 
        status: 'healthy', 
        clients: this.clients.size,
        maxClients: this.options.maxClients,
        uptime: process.uptime(),
        websocket: !!this.wsServer,
        tickRate: this.options.tickRate
      };
    });
    
    this.koaApp.use(router.routes());
    this.koaApp.use(router.allowedMethods());
    
    // Mount Koa on existing server if WebSocket is enabled
    if (this.httpServer) {
      this.httpServer.on('request', this.koaApp.callback());
    } else {
      // Create separate HTTP server for API only
      this.httpServer = createServer(this.koaApp.callback());
      this.httpServer.listen(this.options.port);
    }
  }

  // Core broadcast logic - triggered by Redux middleware
  public broadcastStateUpdate(action: PayloadAction<any>, state: RootState): void {
    if (this.clients.size === 0) return;
    
    // Only broadcast if state actually changed and clients care about this action
    if (this.stateHasChanged(state) && this.shouldBroadcastAction(action.type)) {
      const gameServerState = this.convertToGameServerState(action, state);
      const message = this.createBroadcastMessage(action.type, gameServerState);
      
      // Broadcast to all connected clients based on their subscriptions
      this.clients.forEach((client) => {
        if (this.shouldBroadcastToClient(client, action.type)) {
          this.sendToClient(client, message);
        }
      });
      
      this.lastBroadcastState = state;
    }
  }

  private convertToGameServerState(action: PayloadAction<any>, state: RootState): GameServerState {
    return {
      sessionId: 'default', // TODO: Multi-session support
      gameState: state,
      entities: this.convertStateToEntities(state),
      worldData: this.createWorldData(state),
      frameId: ++this.entityIdCounter,
      timestamp: Date.now(),
      lastAction: {
        type: action.type,
        payload: action.payload
      }
    };
  }

  private convertStateToEntities(state: RootState): GameEntity[] {
    const entities: GameEntity[] = [];
    
    // Player entity
    entities.push({
      id: 'player',
      type: 'player',
      position: { 
        x: state.player.x * 2, // Scale for 3D world
        y: 0,
        z: state.player.y * 2 
      },
      model: 'Characters/Player/Player_Model',
      animation: this.getPlayerAnimation(state),
      metadata: {
        health: state.player.hp,
        maxHealth: state.player.maxHp,
        level: state.player.level,
        name: 'Player',
        interactive: false
      },
      lastUpdated: Date.now()
    });
    
    // Floor items
    state.game.floor.items.forEach((item: any, index: number) => {
      entities.push({
        id: `item_${index}`,
        type: 'item',
        position: { x: item.x * 2, y: 0.5, z: item.y * 2 },
        model: this.getItemModel(item),
        metadata: {
          name: item.name || 'Unknown Item',
          interactive: true,
          properties: item
        },
        lastUpdated: Date.now()
      });
    });
    
    // Enemies
    state.game.floor.enemies.forEach((enemy: any, index: number) => {
      entities.push({
        id: `enemy_${index}`,
        type: 'enemy',
        position: { x: enemy.x * 2, y: 0, z: enemy.y * 2 },
        model: this.getEnemyModel(enemy),
        animation: { name: 'idle', time: 0, speed: 1, loop: true },
        metadata: {
          health: enemy.hp,
          maxHealth: enemy.maxHp,
          name: enemy.name,
          interactive: true
        },
        lastUpdated: Date.now()
      });
    });
    
    return entities;
  }

  private createWorldData(state: RootState): WorldData {
    return {
      floorLevel: state.game.floor.current,
      boundaries: {
        minX: -50,
        maxX: 50,
        minZ: -50,
        maxZ: 50
      },
      lighting: {
        ambient: '#404040',
        directional: { x: -0.5, y: -1, z: -0.5 }
      },
      environment: {
        skybox: 'Environment/Skyboxes/Dungeon',
        fog: true,
        fogColor: '#202020'
      }
    };
  }

  // Koa.js API Handlers
  private async handleGetGameState(ctx: Koa.Context): Promise<void> {
    const state = this.getCurrentState();
    
    if (!state) {
      ctx.status = 404;
      ctx.body = { error: 'No active game state' };
      return;
    }
    
    ctx.body = this.convertToGameServerState({ type: 'GET_STATE', payload: {} }, state);
  }

  private async handlePostInput(ctx: Koa.Context): Promise<void> {
    const input = (ctx.request as any).body as ClientInput;
    
    // Validate input
    if (!input.type || !input.action) {
      ctx.status = 400;
      ctx.body = { error: 'Invalid input format' };
      return;
    }
    
    // Convert to Redux action and dispatch
    const reduxAction = this.convertInputToReduxAction(input);
    
    if (this.store) {
      this.store.dispatch(reduxAction);
      ctx.body = { success: true, action: reduxAction.type };
    } else {
      ctx.status = 500;
      ctx.body = { error: 'Game server not properly initialized' };
    }
  }

  private async handleGetEntities(ctx: Koa.Context): Promise<void> {
    const state = this.getCurrentState();
    
    if (!state) {
      ctx.status = 404;
      ctx.body = { error: 'No active game state' };
      return;
    }
    
    ctx.body = {
      entities: this.convertStateToEntities(state),
      timestamp: Date.now()
    };
  }

  private async handleGetModels(ctx: Koa.Context): Promise<void> {
    ctx.body = {
      characters: [
        'Characters/Player/Player_Model',
        'Characters/Enemies/Goblin_Model',
        'Characters/Enemies/Orc_Model',
        'Characters/NPCs/Merchant_Model'
      ],
      items: [
        'Items/Coins/GoldCoin_Model',
        'Items/Weapons/Sword_Model',
        'Items/Armor/Shield_Model',
        'Items/Potions/HealthPotion_Model'
      ],
      environment: [
        'Environment/Walls/StoneWall_Model',
        'Environment/Floors/StoneFloor_Model',
        'Environment/Doors/WoodenDoor_Model',
        'Environment/Stairs/StairsUp_Model'
      ]
    };
  }

  private async handleSubscribe(ctx: Koa.Context): Promise<void> {
    // Handle client subscription management via HTTP
    ctx.body = { message: 'Subscription management via WebSocket preferred' };
  }

  private async handleGetClients(ctx: Koa.Context): Promise<void> {
    const clientInfo = Array.from(this.clients.values()).map(client => ({
      id: client.id,
      type: client.type,
      subscriptions: Array.from(client.subscriptions),
      lastPing: client.lastPing,
      connected: client.ws.readyState === WebSocket.OPEN
    }));
    
    ctx.body = {
      clients: clientInfo,
      totalClients: this.clients.size,
      maxClients: this.options.maxClients
    };
  }

  // WebSocket Message Handlers
  private handleClientMessage(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'input':
          this.handleClientInput(client, message.data);
          break;
        case 'subscribe':
          this.handleClientSubscription(client, message.data);
          break;
        case 'ping':
          client.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        default:
          console.warn(`Unknown message type from ${clientId}:`, message.type);
      }
    } catch (error) {
      console.error(`Error parsing message from ${clientId}:`, error);
    }
  }

  private handleClientInput(client: ConnectedClient, inputData: ClientInput): void {
    // Convert client input to Redux action
    const reduxAction = this.convertInputToReduxAction(inputData);
    
    if (this.store) {
      this.store.dispatch(reduxAction);
      console.log(`Input from ${client.type} client processed:`, reduxAction.type);
    } else {
      console.warn('No store available for input processing');
    }
  }

  private handleClientSubscription(client: ConnectedClient, subscriptionData: any): void {
    if (subscriptionData.actions) {
      client.subscriptions.clear();
      subscriptionData.actions.forEach((action: string) => {
        client.subscriptions.add(action);
      });
    }
    
    // Send confirmation
    client.ws.send(JSON.stringify({
      type: 'subscription_updated',
      subscriptions: Array.from(client.subscriptions)
    }));
  }

  private convertInputToReduxAction(input: ClientInput): PayloadAction<any> {
    // Map client inputs to Redux actions
    const actionMap: Record<string, string> = {
      'move_up': 'player/movePlayer',
      'move_down': 'player/movePlayer',
      'move_left': 'player/movePlayer',
      'move_right': 'player/movePlayer',
      'interact': 'ui/handleAction',
      'open_menu': 'ui/changeContext',
      'attack': 'combat/attack',
      'use_item': 'inventory/useItem'
    };
    
    const actionType = actionMap[input.action] || 'unknown/action';
    
    return {
      type: actionType,
      payload: this.convertInputPayload(input)
    };
  }

  private convertInputPayload(input: ClientInput): any {
    switch (input.action) {
      case 'move_up':
        return { direction: 'up' };
      case 'move_down':
        return { direction: 'down' };
      case 'move_left':
        return { direction: 'left' };
      case 'move_right':
        return { direction: 'right' };
      default:
        return input.data || {};
    }
  }

  // Utility Methods
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private detectClientType(req: any): 'unreal' | 'unity' | 'web' | 'terminal' {
    const userAgent = req.headers['user-agent'] || '';
    
    if (userAgent.includes('UnrealEngine')) return 'unreal';
    if (userAgent.includes('Unity')) return 'unity';
    if (userAgent.includes('Mozilla')) return 'web';
    
    return 'terminal';
  }

  private startHeartbeat(): void {
    setInterval(() => {
      const now = Date.now();
      
      this.clients.forEach((client, clientId) => {
        if (now - client.lastPing > 30000) { // 30 second timeout
          client.ws.terminate();
          this.clients.delete(clientId);
          console.log(`🔌 Client timeout: ${clientId}`);
        } else if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      });
    }, 10000); // Check every 10 seconds
  }

  private stateHasChanged(state: RootState): boolean {
    // Simple comparison - in production, use deep equality check or selective comparison
    return JSON.stringify(state) !== JSON.stringify(this.lastBroadcastState);
  }

  private shouldBroadcastAction(actionType: string): boolean {
    // Filter out actions that don't need broadcasting
    const ignoredActions = ['ui/addLogMessage', 'game/updatePlayTime'];
    return !ignoredActions.includes(actionType);
  }

  private shouldBroadcastToClient(client: ConnectedClient, actionType: string): boolean {
    return client.subscriptions.has('all') || client.subscriptions.has(actionType);
  }

  private sendInitialState(client: ConnectedClient): void {
    const state = this.getCurrentState();
    if (state) {
      const gameServerState = this.convertToGameServerState({ type: 'INITIAL_STATE', payload: {} }, state);
      const message = this.createBroadcastMessage('initial_state', gameServerState);
      this.sendToClient(client, message);
    }
  }

  private createBroadcastMessage(type: string, data: any): GameServerBroadcast {
    return {
      type: 'state_update',
      data,
      frameId: this.entityIdCounter,
      timestamp: Date.now()
    };
  }

  private sendToClient(client: ConnectedClient, message: GameServerBroadcast): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending to client ${client.id}:`, error);
      }
    }
  }

  private getCurrentState(): RootState | null {
    if (this.store && typeof this.store.getState === 'function') {
      return this.store.getState();
    }
    console.warn('🔍 DEBUG - No store available or getState not a function');
    return null;
  }

  private getPlayerAnimation(state: RootState): any {
    // Determine animation based on player state
    if (state.combat.inCombat) {
      return { name: 'combat_idle', time: 0, speed: 1, loop: true };
    }
    return { name: 'idle', time: 0, speed: 1, loop: true };
  }

  private getItemModel(item: any): string {
    // Map item types to 3D models
    const modelMap: Record<string, string> = {
      'coin': 'Items/Coins/GoldCoin_Model',
      'sword': 'Items/Weapons/Sword_Model',
      'potion': 'Items/Potions/HealthPotion_Model'
    };
    return modelMap[item.type] || 'Items/Generic/GenericItem_Model';
  }

  private getEnemyModel(enemy: any): string {
    // Map enemy types to 3D models
    const modelMap: Record<string, string> = {
      'goblin': 'Characters/Enemies/Goblin_Model',
      'orc': 'Characters/Enemies/Orc_Model',
      'skeleton': 'Characters/Enemies/Skeleton_Model'
    };
    return modelMap[enemy.type] || 'Characters/Enemies/Generic_Model';
  }

  // Public interface methods
  public getConnectedClients(): Map<string, ConnectedClient> {
    return new Map(this.clients);
  }

  public async closeAllConnections(): Promise<void> {
    console.log('🔌 Closing all client connections...');
    
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close(1001, 'Server shutting down');
      }
    });
    
    this.clients.clear();
    
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    if (this.httpServer) {
      this.httpServer.close();
    }
    
    console.log('🔌 All connections closed');
  }
}

// Factory function for easy integration
export const createGameServerMiddleware = (options?: GameServerOptions) => {
  const gameServer = new GameServerMiddleware(options);
  
  // Initialize server asynchronously
  gameServer.initialize().catch(error => {
    console.error('Failed to initialize game server:', error);
  });
  
  return gameServer.createMiddleware();
};

// Export default for easy importing
export default GameServerMiddleware;