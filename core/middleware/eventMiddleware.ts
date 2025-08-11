/**
 * Event Middleware - Redux middleware for handling side effects and events
 * Replaces the separate event system with Redux-native middleware
 */

import type { PayloadAction, Middleware } from '@reduxjs/toolkit';
import type { 
  RootState,
  EventMap, 
  EventMapValue, 
  EventConfigObject, 
  EventHandler, 
  EventResult,
  EnhancedEventMiddleware 
} from '../types.js';

/**
 * Event middleware factory - creates middleware that emits events for specific actions
 * @param eventMap - Maps action types to event configurations
 * @returns Redux middleware with event emission capabilities
 */
export const createEventMiddleware = (eventMap: EventMap = {}): EnhancedEventMiddleware => {
    const subscribers = new Map<string, EventHandler[]>();
    
    // Internal event emitter
    const emit = <T = any>(eventType: string, data: T): void => {
        const handlers = subscribers.get(eventType) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in event handler for ${eventType}:`, error);
            }
        });
    };

    const middleware: Middleware<{}, RootState> = (store) => (next) => (action: any) => {
        // Execute the action first
        const result = next(action);
        
        // Cast action to PayloadAction for type safety in event handling
        const typedAction = action as PayloadAction<any>;
        
        // Then emit events based on the action
        const eventConfig: EventMapValue | undefined = eventMap[typedAction.type];
        if (eventConfig) {
            const state = store.getState();
            
            if (typeof eventConfig === 'string') {
                // Simple event name mapping
                emit(eventConfig, { action: typedAction, state });
            } else if (typeof eventConfig === 'function') {
                // Custom event data transformer
                const eventData: EventResult | null = eventConfig(typedAction, state);
                if (eventData) {
                    emit(eventData.type, eventData.data);
                }
            } else if (eventConfig.type) {
                // Event configuration object
                const configObj = eventConfig as EventConfigObject;
                const data = configObj.dataTransform 
                    ? configObj.dataTransform(typedAction, state)
                    : { action: typedAction, state };
                emit(configObj.type, data);
            }
        }

        return result;
    };

    // Add subscription methods to middleware
    const enhancedMiddleware = middleware as EnhancedEventMiddleware;

    enhancedMiddleware.on = <T = any>(eventType: string, handler: EventHandler<T>): (() => void) => {
        if (!subscribers.has(eventType)) {
            subscribers.set(eventType, []);
        }
        subscribers.get(eventType)!.push(handler as EventHandler);
        
        // Return unsubscribe function
        return (): void => {
            const handlers = subscribers.get(eventType);
            if (handlers) {
                const index = handlers.indexOf(handler as EventHandler);
                if (index !== -1) {
                    handlers.splice(index, 1);
                }
            }
        };
    };

    enhancedMiddleware.off = <T = any>(eventType: string, handler: EventHandler<T>): void => {
        const handlers = subscribers.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler as EventHandler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    };

    enhancedMiddleware.emit = emit;

    return enhancedMiddleware;
};

/**
 * Default event mappings for the roguelike engine
 */
export const defaultEventMap: EventMap = {
    // Player events
    'MOVE_PLAYER': {
        type: 'PLAYER_MOVED',
        dataTransform: (action: PayloadAction<any>, state: RootState) => ({
            from: { 
                x: state.player.x - action.payload.direction.x, 
                y: state.player.y - action.payload.direction.y 
            },
            to: { x: state.player.x, y: state.player.y },
            direction: action.payload.direction,
            player: state.player
        })
    },
    
    'LEVEL_UP': {
        type: 'PLAYER_LEVELED_UP',
        dataTransform: (action: PayloadAction<any>, state: RootState) => ({
            newLevel: state.player.level,
            player: state.player
        })
    },
    
    'DAMAGE': (action: PayloadAction<any>, state: RootState): EventResult | null => {
        if (state.player.hp <= 0) {
            return {
                type: 'PLAYER_DIED',
                data: { player: state.player }
            };
        }
        return null;
    },

    // Combat events
    'START_COMBAT': {
        type: 'COMBAT_STARTED',
        dataTransform: (action: PayloadAction<any>, state: RootState) => ({
            enemy: action.payload.enemy,
            player: state.player
        })
    },

    'END_COMBAT': {
        type: 'COMBAT_ENDED',
        dataTransform: (action: PayloadAction<any>, state: RootState) => ({
            victory: action.payload.victory,
            rewards: action.payload.rewards,
            player: state.player,
            combatStats: {
                damageDealt: state.combat.damageDealt,
                damageTaken: state.combat.damageTaken,
                turnCount: state.combat.turnCount
            }
        })
    },

    // Inventory events
    'PICK_UP_ITEM': {
        type: 'ITEM_PICKED_UP',
        dataTransform: (action: PayloadAction<any>, state: RootState) => ({
            itemId: action.payload.itemId,
            player: state.player
        })
    },

    'USE_ITEM': {
        type: 'ITEM_USED',
        dataTransform: (action: PayloadAction<any>, state: RootState) => ({
            itemId: action.payload.itemId,
            target: action.payload.target,
            player: state.player
        })
    },

    'EQUIP_ITEM': {
        type: 'ITEM_EQUIPPED',
        dataTransform: (action: PayloadAction<any>, state: RootState) => ({
            itemId: action.payload.itemId,
            slot: action.payload.slot,
            player: state.player
        })
    },

    // Game events
    'START_GAMBLING_SESSION': {
        type: 'GAMBLING_SESSION_STARTED',
        dataTransform: (action: PayloadAction<any>, state: RootState) => ({
            gameType: action.payload.gameType,
            bet: action.payload.initialBet
        })
    },

    'END_GAMBLING_SESSION': {
        type: 'GAMBLING_SESSION_ENDED',
        dataTransform: (action: PayloadAction<any>, state: RootState) => ({
            result: action.payload.result,
            winnings: action.payload.winnings
        })
    },

    'ADVANCE_FLOOR': {
        type: 'FLOOR_ADVANCED',
        dataTransform: (action: PayloadAction<any>, state: RootState) => ({
            newFloor: state.game.floor.current
        })
    },

    'UNLOCK_ACHIEVEMENT': {
        type: 'ACHIEVEMENT_UNLOCKED',
        dataTransform: (action: PayloadAction<any>, state: RootState) => ({
            achievementId: action.payload.achievementId,
            player: state.player
        })
    },

    // UI events
    'CHANGE_CONTEXT': {
        type: 'CONTEXT_CHANGED',
        dataTransform: (action: PayloadAction<any>, state: RootState) => ({
            from: state.ui.currentContext,
            to: action.payload.context
        })
    }
};

/**
 * Console logging middleware for development
 */
export const loggingEventMiddleware: EnhancedEventMiddleware = createEventMiddleware({
    '*': (action: PayloadAction<any>, state: RootState): EventResult | null => {
        console.log(`Event: ${action.type}`, action.payload);
        return null; // Don't emit an actual event
    }
});

/**
 * Performance monitoring middleware
 */
export const performanceEventMiddleware: EnhancedEventMiddleware = createEventMiddleware({
    '*': {
        type: 'PERFORMANCE_METRIC',
        dataTransform: (action: PayloadAction<any>, state: RootState) => ({
            actionType: action.type,
            timestamp: Date.now(),
            stateSize: JSON.stringify(state).length,
            actionSize: JSON.stringify(action).length
        })
    }
});

/**
 * Achievement system middleware
 */
export const achievementEventMiddleware: EnhancedEventMiddleware = createEventMiddleware({
    'MOVE_PLAYER': (action: PayloadAction<any>, state: RootState): EventResult | null => {
        // Check for movement-based achievements
        // Note: totalMoves would need to be added to GameMetaState for full functionality
        // For now, use a simple achievement trigger
        if (state.player.x === 10 && state.player.y === 10) {
            return {
                type: 'TRIGGER_ACHIEVEMENT',
                data: { achievementId: 'first_steps', reason: 'Reached position (10,10)' }
            };
        }
        return null;
    },
    
    'END_COMBAT': (action: PayloadAction<any>, state: RootState): EventResult | null => {
        if (action.payload.victory) {
            // Note: combatsWon would need to be added to GameMetaState for full functionality
            // For now, trigger achievement if player has high level (indicating combat experience)
            if (state.player.level >= 2) {
                return {
                    type: 'TRIGGER_ACHIEVEMENT',
                    data: { achievementId: 'first_victory', reason: 'Combat victory' }
                };
            }
        }
        return null;
    }
});
