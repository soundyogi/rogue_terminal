/**
 * Core Type Definitions for Roguelike Engine
 * Comprehensive TypeScript interfaces for all Redux state and actions
 */

import type { PayloadAction } from '@reduxjs/toolkit';

// ============================================================================
// ROOT STATE INTERFACE
// ============================================================================

export interface RootState {
  game: GameState;
  player: PlayerState;
  ui: UIState;
  inventory: InventoryState;
  combat: CombatState;
  input: InputState;
}

// ============================================================================
// GAME STATE TYPES
// ============================================================================

export interface GameState {
  version: string;
  timestamp: number;
  seed: number;
  gameMode: string;
  currentGame: GameSession | null;
  floor: FloorState;
  meta: GameMetaState;
}

export interface FloorState {
  current: number;
  layout: any | null;
  enemies: any[];
  items: any[];
  discovered: Set<string>; // Non-serializable - needs special handling
  exits: any[];
}

export interface GameMetaState {
  totalPlayTime: number;
  gamesPlayed: number;
  lastSaveTime: number | null;
  achievements: string[];
}

export interface GameSession {
  type: string;
  bet: number;
  opponent: any | null;
  round: number;
  startTime: number;
  history: GameHistoryEntry[];
  folded?: boolean;
  endTime?: number;
  betType?: string;
}

export interface GameHistoryEntry {
  choice: string;
  data: any;
  timestamp: number;
}

// ============================================================================
// PLAYER STATE TYPES
// ============================================================================

export interface PlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  experience: number;
  coins: number;
  inventory: string[];
  stats: PlayerStats;
  equipment: PlayerEquipment;
}

export interface PlayerStats {
  luck: number;
  speed: number;
  strength: number;
}

export interface PlayerEquipment {
  weapon: string | null;
  armor: string | null;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface UIState {
  currentContext: string;
  selectedIndex: number;
  highlightedInteraction: any;
  logMessages: LogMessage[];
  menu: MenuState;
  showDebug: boolean;
  pendingAction?: any;
}

export interface LogMessage {
  id: string;
  message: string;
  type: string;
  timestamp: number;
}

export interface MenuState {
  title: string;
  items: MenuItem[];
}

export interface MenuItem {
  label: string;
  action: any;
}

// ============================================================================
// INVENTORY STATE TYPES
// ============================================================================

export interface InventoryState {
  items: string[];
  equipment: InventoryEquipment;
  capacity: number;
  lastUsedItem: string | null;
}

export interface InventoryEquipment {
  weapon: string | null;
  armor: string | null;
  accessory1: string | null;
  accessory2: string | null;
}

// ============================================================================
// COMBAT STATE TYPES
// ============================================================================

export interface CombatState {
  inCombat: boolean;
  currentEnemy: Enemy | null;
  combatLog: string[];
  playerTurn: boolean;
  turnCount: number;
  lastAction: string | null;
  damageDealt: number;
  damageTaken: number;
  experience: number;
}

export interface Enemy {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
}

// ============================================================================
// INPUT STATE TYPES
// ============================================================================

export interface InputState {
  currentContext: string;
  contextStack: string[];
  interactions: Record<string, Interaction>;
}

export interface Interaction {
  type: string;
  action: string;
  payload?: any;
}

// ============================================================================
// ACTION PAYLOAD TYPES
// ============================================================================

// Game Action Payloads
export interface InitializeGamePayload {
  mode?: string;
  seed?: number;
  initialState?: any;
}

export interface ChangeGameModePayload {
  mode: string;
}

export interface AdvanceFloorPayload {
  floorId?: number;
}

export interface StartGamblingSessionPayload {
  gameType: string;
  initialBet: number;
  opponent?: any;
}

export interface EndGamblingSessionPayload {
  result: string;
  winnings?: number;
}

export interface PlaceBetPayload {
  amount: number;
  betType?: string;
}

export interface MakeGamblingChoicePayload {
  choice: string;
  data: any;
}

export interface UpdatePlayTimePayload {
  deltaTime: number;
}

export interface UnlockAchievementPayload {
  achievementId: string;
}

export interface LoadGamePayload {
  saveData: string;
}

// Player Action Payloads
export interface MovePlayerPayload {
  direction: 'up' | 'down' | 'left' | 'right';
}

export interface MovePlayerToPayload {
  x: number;
  y: number;
}

export interface UpdateStatsPayload {
  stats: Partial<PlayerStats>;
}

export interface GainExperiencePayload {
  amount: number;
}

export interface HealPayload {
  amount: number;
}

export interface DamagePayload {
  amount: number;
}

export interface AddToInventoryPayload {
  item: string;
}

export interface RemoveFromInventoryPayload {
  item: string;
}

export interface EquipItemPayload {
  slot: keyof PlayerEquipment;
  item: string;
}

export interface AddCoinsPayload {
  amount: number;
}

export interface SpendCoinsPayload {
  amount: number;
}

// UI Action Payloads
export interface ChangeContextPayload {
  context: string;
  data?: any;
}

export interface NavigateMenuPayload {
  direction: 'up' | 'down' | 'left' | 'right';
}

export interface AddLogMessagePayload {
  message: string;
  type?: string;
}

export interface SetHighlightedInteractionPayload {
  interaction: any;
}

export interface SetMenuItemsPayload {
  title: string;
  items: MenuItem[];
}

// Inventory Action Payloads
export interface PickUpItemPayload {
  itemId: string;
  x: number;
  y: number;
}

export interface DropItemPayload {
  itemId: string;
  x: number;
  y: number;
}

export interface UseItemPayload {
  itemId: string;
}

export interface EquipItemInventoryPayload {
  itemId: string;
  slot: keyof InventoryEquipment;
}

export interface UnequipItemPayload {
  slot: keyof InventoryEquipment;
}

export interface AddItemPayload {
  itemId: string;
  quantity?: number;
}

export interface RemoveItemPayload {
  itemId: string;
  quantity?: number;
}

export interface ExpandInventoryPayload {
  additionalSlots: number;
}

export interface SetInventoryItemsPayload {
  items: string[];
}

// Combat Action Payloads
export interface StartCombatPayload {
  enemy: Enemy;
}

export interface EndCombatPayload {
  result: string;
  experience?: number;
  loot?: string[];
}

export interface AttackPayload {
  damage: number;
  critical?: boolean;
}

export interface DefendPayload {
  // No specific payload needed
}

export interface UseSkillPayload {
  skillName: string;
  effect: string;
}

export interface FleePayload {
  success?: boolean;
}

export interface EnemyActionPayload {
  actionType: 'attack' | 'defend' | 'skill';
  damage?: number;
  effect?: string;
}

export interface TakeDamagePayload {
  amount: number;
  source?: string;
}

export interface DealDamagePayload {
  amount: number;
  target?: string;
}

export interface AddCombatLogPayload {
  message: string;
}

export interface SetPlayerTurnPayload {
  isPlayerTurn: boolean;
}

// Input Action Payloads
export interface SetInputContextPayload {
  context: string;
}

export interface PushInputContextPayload {
  context: string;
}

export interface AddInteractionPayload {
  x: number;
  y: number;
  interaction: Interaction;
}

export interface RemoveInteractionPayload {
  x: number;
  y: number;
}

export interface SetInteractionsPayload {
  interactions: Record<string, Interaction>;
}

// ============================================================================
// EVENT SYSTEM TYPES
// ============================================================================

export type EventHandler<T = any> = (data: T) => void;

export interface EventResult {
  type: string;
  data: any;
}

export interface EventConfigObject {
  type: string;
  dataTransform?: (action: PayloadAction<any>, state: RootState) => any;
}

export type EventMapValue = 
  | string 
  | ((action: PayloadAction<any>, state: RootState) => EventResult | null) 
  | EventConfigObject;

export interface EventMap {
  [actionType: string]: EventMapValue;
}

export interface EnhancedEventMiddleware {
  (store: any): (next: any) => (action: any) => any;
  on: <T = any>(eventType: string, handler: EventHandler<T>) => () => void;
  off: <T = any>(eventType: string, handler: EventHandler<T>) => void;
  emit: <T = any>(eventType: string, data: T) => void;
}

// ============================================================================
// INPUT SYSTEM TYPES
// ============================================================================

export interface HandleInputPayload {
  inputType: string;
  inputData?: any;
}

export interface HandleDirectionPayload {
  direction: 'up' | 'down' | 'left' | 'right';
}

// ============================================================================
// BROWSER ADAPTER TYPES
// ============================================================================

export interface ReduxBrowserAdapterOptions {
  containerId?: string;
}

export interface KeyEventMapping {
  inputType: string | null;
  inputData?: any;
}

export interface ActionsConfig {
  [key: string]: {
    category: string;
    undoable: boolean;
  };
}

// ============================================================================
// RENDERER INTERFACE
// ============================================================================

export interface Renderer {
  render: (state: RootState) => void;
}

// ============================================================================
// GAME CONTROLLER TYPES
// ============================================================================

export interface GameController {
  running: boolean;
  renderer: Renderer | null;
  actionsConfig: ActionsConfig | null;
  store: any;
  initialize: (renderer: Renderer, actionsConfig: ActionsConfig) => Promise<boolean>;
  start: () => void;
  stop: () => void;
  update: (deltaTime: number) => void;
  getState: () => RootState | null;
  dispatch: (action: any) => any;
  subscribe: (callback: () => void) => () => void;
  undo: () => boolean;
  save: () => RootState | null;
  load: (savedState: RootState) => boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// ============================================================================
// SERIALIZATION HELPERS
// ============================================================================

export interface SerializableFloorState {
  current: number;
  layout: any | null;
  enemies: any[];
  items: any[];
  discovered: string[]; // Serialized Set as array
  exits: any[];
}

export const serializeFloorState = (floor: FloorState): SerializableFloorState => ({
  ...floor,
  discovered: Array.from(floor.discovered)
});

export const deserializeFloorState = (serializedFloor: SerializableFloorState): FloorState => ({
  ...serializedFloor,
  discovered: new Set(serializedFloor.discovered)
});

// ============================================================================
// STORE TYPES
// ============================================================================

// App dispatch type will be inferred from the store
export type AppDispatch = any; // Will be overridden in store.ts

// Enhanced store interface for legacy compatibility
export interface EnhancedStore {
  events: {
    emit: (eventType: string, data: any) => void;
  };
  getSlice: (sliceName: keyof RootState) => any;
  history: any[];
  maxHistorySize: number;
  addToHistory: (state: RootState) => void;
  undo: () => void;
}

// ============================================================================
// GAME SERVER MIDDLEWARE TYPES
// ============================================================================

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface GameServerOptions {
  port?: number;
  enableHTTPAPI?: boolean;
  enableWebSocket?: boolean;
  tickRate?: number;
  compressionEnabled?: boolean;
  allowedOrigins?: string[];
  maxClients?: number;
}

export interface ConnectedClient {
  id: string;
  ws: any; // WebSocket type
  type: 'unreal' | 'unity' | 'web' | 'terminal';
  lastPing: number;
  subscriptions: Set<string>; // What state changes they want
}

export interface GameEntity {
  id: string;
  type: 'player' | 'enemy' | 'item' | 'environment';
  position: Vector3D;
  model: string;
  animation?: {
    name: string;
    time: number;
    speed: number;
    loop: boolean;
  };
  metadata: {
    health?: number;
    maxHealth?: number;
    level?: number;
    name: string;
    interactive: boolean;
    properties?: any;
  };
  lastUpdated: number;
}

export interface WorldData {
  floorLevel: number;
  boundaries: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  lighting: {
    ambient: string;
    directional: Vector3D;
  };
  environment: {
    skybox: string;
    fog: boolean;
    fogColor?: string;
  };
}

export interface GameServerState {
  sessionId: string;
  gameState: RootState;
  entities: GameEntity[];
  worldData: WorldData;
  frameId: number;
  timestamp: number;
  lastAction?: {
    type: string;
    payload: any;
  };
}

export interface ClientInput {
  type: 'keyboard' | 'mouse' | 'gamepad' | 'touch';
  action: string;
  data: any;
  timestamp: number;
  clientId: string;
}

export interface ClientSubscription {
  actions?: string[];      // Which Redux actions to listen for
  stateSlices?: string[];  // Which state slices to receive updates for
  entityTypes?: string[];  // Which entity types to track
  frequency?: number;      // Update frequency in Hz (max)
}

export interface GameServerBroadcast {
  type: 'state_update' | 'entity_update' | 'action_result' | 'error';
  data: any;
  frameId: number;
  timestamp: number;
  clientId?: string;
}

// Enhanced Entity System for 3D Engines
export interface Enhanced3DEntity extends GameEntity {
  physics?: {
    velocity: Vector3D;
    acceleration: Vector3D;
    mass: number;
    friction: number;
  };
  rendering?: {
    material: string;
    shader: string;
    lightmapIndex?: number;
    castShadows: boolean;
    receiveShadows: boolean;
  };
  collision?: {
    type: 'box' | 'sphere' | 'mesh';
    bounds: Vector3D;
    trigger: boolean;
  };
}

// ============================================================================
// GAME SERVER MIDDLEWARE INTERFACE
// ============================================================================

export interface GameServerMiddlewareInterface {
  createMiddleware(): any; // Redux Middleware type
  initialize(): Promise<void>;
  broadcastStateUpdate(action: PayloadAction<any>, state: RootState): void;
  getConnectedClients(): Map<string, ConnectedClient>;
  closeAllConnections(): Promise<void>;
}
// ============================================================================
// UI PORTABILITY AND RENDER TARGET TYPES
// ============================================================================

// Core rendering interfaces for portable UI system
export interface RenderData {
  type: 'world' | 'menu' | 'gambling' | 'dialog';
  screen: ScreenBuffer;
  metadata: RenderMetadata;
}

export interface ScreenBuffer {
  width: number;
  height: number;
  cells: ScreenCell[][];
}

export interface ScreenCell {
  char: string;
  style?: CellStyle;
  interactive?: boolean;
  id?: string;
}

export interface CellStyle {
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
}

export interface RenderCapabilities {
  colors: boolean;
  mouse: boolean;
  unicode: boolean;
  streaming: boolean;
}

export interface RenderMetadata {
  context: string;
  commands: string[];
  debug?: any;
  timestamp: number;
}

// Enhanced render target interface
export interface RenderTarget {
  render(renderData: RenderData): void;
  render(state: RootState): void;
  render(input: RenderData | RootState): void;
  clear(): void;
  getCapabilities(): RenderCapabilities;
}

// Enhanced input system for portable UI
export interface InputEvent {
  type: 'keyboard' | 'mouse' | 'touch' | 'stream';
  source: string;
  data: InputEventData;
  timestamp: number;
}

export interface InputEventData {
  key?: string;
  code?: string;
  position?: { x: number; y: number };
  button?: number;
  modifiers?: string[];
}

export interface InputAdapter {
  initialize(): void;
  onInput(callback: (event: InputEvent) => void): void;
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

// Enhanced browser adapter types
export interface EnhancedBrowserAdapter extends InputAdapter {
  initialize(containerId?: string): Promise<boolean>;
  setRenderTarget(target: RenderTarget): void;
  start(): void;
  stop(): void;
}

export interface BrowserAdapterOptions extends ReduxBrowserAdapterOptions {
  streamingEnabled?: boolean;
  debugMode?: boolean;
  touchSupport?: boolean;
}

// Stream renderer types for WebSocket/HTTP streaming
export interface StreamRenderer extends RenderTarget {
  startStream(endpoint: string): Promise<void>;
  sendUpdate(data: RenderData): void;
  onClientConnect(callback: (clientId: string) => void): void;
}

// Terminal renderer types for console output
export interface TerminalRenderer extends RenderTarget {
  supportsColors(): boolean;
  setColorMode(enabled: boolean): void;
}


// Portable UI factory types
export interface RendererFactory {
  createRenderer(type: 'browser' | 'terminal' | 'stream', options?: any): RenderTarget;
  getSupportedRenderers(): string[];
}