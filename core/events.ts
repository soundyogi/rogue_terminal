/**
 * Event System for Roguelike Engine
 * Replaces the missing events.js file referenced in game.js
 */

// ============================================================================
// EVENT TYPE CONSTANTS
// ============================================================================

export const EVENT_TYPES = {
  // Game Events
  GAME_START: 'GAME_START',
  GAME_END: 'GAME_END',
  GAME_UPDATE: 'GAME_UPDATE',
  GAME_SAVE: 'GAME_SAVE',
  GAME_LOAD: 'GAME_LOAD',
  GAME_PAUSE: 'GAME_PAUSE',
  GAME_RESUME: 'GAME_RESUME',
  
  // Player Events
  PLAYER_MOVED: 'PLAYER_MOVED',
  PLAYER_LEVELED_UP: 'PLAYER_LEVELED_UP',
  PLAYER_DIED: 'PLAYER_DIED',
  PLAYER_HEALED: 'PLAYER_HEALED',
  PLAYER_DAMAGED: 'PLAYER_DAMAGED',
  
  // Combat Events
  COMBAT_START: 'COMBAT_START',
  COMBAT_END: 'COMBAT_END',
  COMBAT_TURN: 'COMBAT_TURN',
  COMBAT_ATTACK: 'COMBAT_ATTACK',
  COMBAT_DEFEND: 'COMBAT_DEFEND',
  
  // Inventory Events
  ITEM_PICKED_UP: 'ITEM_PICKED_UP',
  ITEM_DROPPED: 'ITEM_DROPPED',
  ITEM_USED: 'ITEM_USED',
  ITEM_EQUIPPED: 'ITEM_EQUIPPED',
  
  // UI Events
  CONTEXT_CHANGED: 'CONTEXT_CHANGED',
  MENU_NAVIGATED: 'MENU_NAVIGATED',
  MENU_SELECTED: 'MENU_SELECTED',
  
  // Floor Events
  FLOOR_ADVANCED: 'FLOOR_ADVANCED',
  FLOOR_GENERATED: 'FLOOR_GENERATED',
  
  // Gambling Events
  GAMBLING_SESSION_START: 'GAMBLING_SESSION_START',
  GAMBLING_SESSION_END: 'GAMBLING_SESSION_END',
  GAMBLING_BET_PLACED: 'GAMBLING_BET_PLACED',
  GAMBLING_CHOICE_MADE: 'GAMBLING_CHOICE_MADE'
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// ============================================================================
// EVENT DATA INTERFACES
// ============================================================================

export interface GameEventData {
  timestamp: number;
  gameMode?: string;
  seed?: number;
  reason?: string;
  [key: string]: any;
}

export interface PlayerEventData {
  player: {
    x: number;
    y: number;
    hp: number;
    level: number;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface CombatEventData {
  enemy?: any;
  damage?: number;
  result?: string;
  [key: string]: any;
}

export interface InventoryEventData {
  itemId: string;
  slot?: string;
  position?: { x: number; y: number };
  [key: string]: any;
}

export interface UIEventData {
  context?: string;
  direction?: string;
  selectedIndex?: number;
  [key: string]: any;
}

export interface FloorEventData {
  floorNumber: number;
  layout?: any;
  [key: string]: any;
}

export interface GamblingEventData {
  gameType?: string;
  bet?: number;
  choice?: string;
  result?: string;
  [key: string]: any;
}

// ============================================================================
// EVENT EMITTER CLASS
// ============================================================================

export type EventListener<T = any> = (data: T) => void;

class EventEmitter {
  private listeners: Map<string, EventListener[]> = new Map();

  /**
   * Emit an event with data to all registered listeners
   */
  emit<T = any>(eventType: EventType, data: T): void {
    const handlers = this.listeners.get(eventType) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
      }
    });
  }

  /**
   * Register an event listener
   */
  on<T = any>(eventType: EventType, handler: EventListener<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(handler);
    
    // Return unsubscribe function
    return () => {
      this.off(eventType, handler);
    };
  }

  /**
   * Remove an event listener
   */
  off<T = any>(eventType: EventType, handler: EventListener<T>): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Register a one-time event listener
   */
  once<T = any>(eventType: EventType, handler: EventListener<T>): () => void {
    const onceHandler = (data: T) => {
      handler(data);
      this.off(eventType, onceHandler);
    };
    
    return this.on(eventType, onceHandler);
  }

  /**
   * Remove all listeners for a specific event type
   */
  removeAllListeners(eventType?: EventType): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get the number of listeners for an event type
   */
  listenerCount(eventType: EventType): number {
    const handlers = this.listeners.get(eventType);
    return handlers ? handlers.length : 0;
  }

  /**
   * Get all event types that have listeners
   */
  eventNames(): EventType[] {
    return Array.from(this.listeners.keys()) as EventType[];
  }
}

// ============================================================================
// GLOBAL EVENT EMITTER INSTANCE
// ============================================================================

export const events = new EventEmitter();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Emit a game event
 */
export const emitGameEvent = (eventType: EventType, data: GameEventData) => {
  events.emit(eventType, { ...data, timestamp: Date.now() });
};

/**
 * Emit a player event
 */
export const emitPlayerEvent = (eventType: EventType, data: PlayerEventData) => {
  events.emit(eventType, { ...data, timestamp: Date.now() });
};

/**
 * Emit a combat event
 */
export const emitCombatEvent = (eventType: EventType, data: CombatEventData) => {
  events.emit(eventType, { ...data, timestamp: Date.now() });
};

/**
 * Emit an inventory event
 */
export const emitInventoryEvent = (eventType: EventType, data: InventoryEventData) => {
  events.emit(eventType, { ...data, timestamp: Date.now() });
};

/**
 * Emit a UI event
 */
export const emitUIEvent = (eventType: EventType, data: UIEventData) => {
  events.emit(eventType, { ...data, timestamp: Date.now() });
};

/**
 * Emit a floor event
 */
export const emitFloorEvent = (eventType: EventType, data: FloorEventData) => {
  events.emit(eventType, { ...data, timestamp: Date.now() });
};

/**
 * Emit a gambling event
 */
export const emitGamblingEvent = (eventType: EventType, data: GamblingEventData) => {
  events.emit(eventType, { ...data, timestamp: Date.now() });
};

// ============================================================================
// DEFAULT EVENT HANDLERS
// ============================================================================

/**
 * Set up default event logging for debugging
 */
export const setupDefaultEventLogging = (debug: boolean = false) => {
  if (debug) {
    // Log all events in debug mode
    Object.values(EVENT_TYPES).forEach(eventType => {
      events.on(eventType, (data) => {
        console.log(`[EVENT] ${eventType}:`, data);
      });
    });
  }
};

/**
 * Set up common event handlers
 */
export const setupCommonEventHandlers = () => {
  // Player death handler
  events.on(EVENT_TYPES.PLAYER_DIED, (data: PlayerEventData) => {
    console.log('Game Over! Player has died.');
    emitGameEvent(EVENT_TYPES.GAME_END, { 
      timestamp: Date.now(),
      reason: 'player_death'
    });
  });

  // Level up celebration
  events.on(EVENT_TYPES.PLAYER_LEVELED_UP, (data: PlayerEventData) => {
    console.log(`Level up! Player reached level ${data.player.level}`);
  });

  // Combat start/end logging
  events.on(EVENT_TYPES.COMBAT_START, (data: CombatEventData) => {
    console.log(`Combat started with ${data.enemy?.name || 'unknown enemy'}`);
  });

  events.on(EVENT_TYPES.COMBAT_END, (data: CombatEventData) => {
    console.log(`Combat ended: ${data.result || 'unknown result'}`);
  });
};

// ============================================================================
// EXPORTS
// ============================================================================

export default events;
export { EventEmitter };