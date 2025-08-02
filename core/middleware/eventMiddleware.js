/**
 * Event Middleware - Redux middleware for handling side effects and events
 * Replaces the separate event system with Redux-native middleware
 */

/**
 * Event middleware factory - creates middleware that emits events for specific actions
 * @param {Object} eventMap - Maps action types to event configurations
 * @returns {Function} Redux middleware
 */
export const createEventMiddleware = (eventMap = {}) => {
    const subscribers = new Map();
    
    // Internal event emitter
    const emit = (eventType, data) => {
        const handlers = subscribers.get(eventType) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Error in event handler for ${eventType}:`, error);
            }
        });
    };

    const middleware = (store) => (next) => (action) => {
        // Execute the action first
        const result = next(action);
        
        // Then emit events based on the action
        const eventConfig = eventMap[action.type];
        if (eventConfig) {
            const state = store.getState();
            
            if (typeof eventConfig === 'string') {
                // Simple event name mapping
                emit(eventConfig, { action, state });
            } else if (typeof eventConfig === 'function') {
                // Custom event data transformer
                const eventData = eventConfig(action, state);
                if (eventData) {
                    emit(eventData.type, eventData.data);
                }
            } else if (eventConfig.type) {
                // Event configuration object
                const data = eventConfig.dataTransform 
                    ? eventConfig.dataTransform(action, state)
                    : { action, state };
                emit(eventConfig.type, data);
            }
        }

        return result;
    };

    // Add subscription methods to middleware
    middleware.on = (eventType, handler) => {
        if (!subscribers.has(eventType)) {
            subscribers.set(eventType, []);
        }
        subscribers.get(eventType).push(handler);
        
        // Return unsubscribe function
        return () => {
            const handlers = subscribers.get(eventType);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index !== -1) {
                    handlers.splice(index, 1);
                }
            }
        };
    };

    middleware.off = (eventType, handler) => {
        const handlers = subscribers.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    };

    middleware.emit = emit;

    return middleware;
};

/**
 * Default event mappings for the roguelike engine
 */
export const defaultEventMap = {
    // Player events
    'MOVE_PLAYER': {
        type: 'PLAYER_MOVED',
        dataTransform: (action, state) => ({
            from: { x: state.player.x - action.payload.direction.x, y: state.player.y - action.payload.direction.y },
            to: { x: state.player.x, y: state.player.y },
            direction: action.payload.direction,
            player: state.player
        })
    },
    
    'LEVEL_UP': {
        type: 'PLAYER_LEVELED_UP',
        dataTransform: (action, state) => ({
            newLevel: state.player.level,
            player: state.player
        })
    },
    
    'DAMAGE': (action, state) => {
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
        dataTransform: (action, state) => ({
            enemy: action.payload.enemy,
            player: state.player
        })
    },

    'END_COMBAT': {
        type: 'COMBAT_ENDED',
        dataTransform: (action, state) => ({
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
        dataTransform: (action, state) => ({
            itemId: action.payload.itemId,
            player: state.player
        })
    },

    'USE_ITEM': {
        type: 'ITEM_USED',
        dataTransform: (action, state) => ({
            itemId: action.payload.itemId,
            target: action.payload.target,
            player: state.player
        })
    },

    'EQUIP_ITEM': {
        type: 'ITEM_EQUIPPED',
        dataTransform: (action, state) => ({
            itemId: action.payload.itemId,
            slot: action.payload.slot,
            player: state.player
        })
    },

    // Game events
    'START_GAMBLING_SESSION': {
        type: 'GAMBLING_SESSION_STARTED',
        dataTransform: (action, state) => ({
            gameType: action.payload.gameType,
            bet: action.payload.initialBet
        })
    },

    'END_GAMBLING_SESSION': {
        type: 'GAMBLING_SESSION_ENDED',
        dataTransform: (action, state) => ({
            result: action.payload.result,
            winnings: action.payload.winnings
        })
    },

    'ADVANCE_FLOOR': {
        type: 'FLOOR_ADVANCED',
        dataTransform: (action, state) => ({
            newFloor: state.floor.current
        })
    },

    'UNLOCK_ACHIEVEMENT': {
        type: 'ACHIEVEMENT_UNLOCKED',
        dataTransform: (action, state) => ({
            achievementId: action.payload.achievementId,
            player: state.player
        })
    },

    // UI events
    'CHANGE_CONTEXT': {
        type: 'CONTEXT_CHANGED',
        dataTransform: (action, state) => ({
            from: state.ui.currentContext,
            to: action.payload.context
        })
    }
};

/**
 * Console logging middleware for development
 */
export const loggingEventMiddleware = createEventMiddleware({
    '*': (action, state) => {
        console.log(`Event: ${action.type}`, action.payload);
        return null; // Don't emit an actual event
    }
});

/**
 * Performance monitoring middleware
 */
export const performanceEventMiddleware = createEventMiddleware({
    '*': {
        type: 'PERFORMANCE_METRIC',
        dataTransform: (action, state) => ({
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
export const achievementEventMiddleware = createEventMiddleware({
    'MOVE_PLAYER': (action, state) => {
        // Check for movement-based achievements
        const totalMoves = state.meta?.totalMoves || 0;
        if (totalMoves === 100) {
            return {
                type: 'TRIGGER_ACHIEVEMENT',
                data: { achievementId: 'first_steps', reason: '100 moves' }
            };
        }
        return null;
    },
    
    'END_COMBAT': (action, state) => {
        if (action.payload.victory) {
            const combatsWon = state.meta?.combatsWon || 0;
            if (combatsWon === 1) {
                return {
                    type: 'TRIGGER_ACHIEVEMENT',
                    data: { achievementId: 'first_victory', reason: 'First combat victory' }
                };
            }
        }
        return null;
    }
});
