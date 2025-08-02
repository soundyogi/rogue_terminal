/**
 * Action Processing System
 * All game modifications go through actions for consistency and debugging
 */

import { events, EVENT_TYPES } from './events.js';
import { gameState } from './state.js';
import { gameRNG } from './rng.js';

export class ActionProcessor {
    constructor() {
        this.actions = new Map();
        this.middleware = [];
        this.registerDefaultActions();
    }

    /**
     * Register an action handler
     */
    register(actionType, handler) {
        this.actions.set(actionType, handler);
    }

    /**
     * Add middleware to process actions
     */
    use(middleware) {
        this.middleware.push(middleware);
    }

    /**
     * Process an action
     */
    async process(action) {
        try {
            // Apply middleware
            let processedAction = action;
            for (const middleware of this.middleware) {
                processedAction = await middleware(processedAction, gameState.get());
                if (!processedAction) {
                    // Middleware cancelled the action
                    return false;
                }
            }

            // Get the handler
            const handler = this.actions.get(processedAction.type);
            if (!handler) {
                console.warn(`No handler for action type: ${processedAction.type}`);
                return false;
            }

            // Execute the action
            const result = await handler(processedAction, gameState.get());
            
            if (result && result.changes) {
                // Apply state changes
                const success = gameState.update(result.changes);
                
                if (success && result.events) {
                    // Emit additional events
                    result.events.forEach(eventData => {
                        if (typeof eventData === 'string') {
                            events.emit(eventData);
                        } else {
                            events.emit(eventData.type, eventData.data);
                        }
                    });
                }
                
                return success;
            }
            
            return result !== false;
        } catch (error) {
            console.error('Error processing action:', error);
            events.emit(EVENT_TYPES.ERROR, { error, action });
            return false;
        }
    }

    /**
     * Register default actions
     */
    registerDefaultActions() {
        // Movement actions
        this.register('MOVE', this.handleMove.bind(this));
        this.register('MOVE_TO', this.handleMoveTo.bind(this));
        
        // Gambling actions
        this.register('START_GAMBLE', this.handleStartGamble.bind(this));
        this.register('PLACE_BET', this.handlePlaceBet.bind(this));
        this.register('CALL_BLUFF', this.handleCallBluff.bind(this));
        this.register('FOLD', this.handleFold.bind(this));
        
        // Inventory actions
        this.register('PICK_UP_ITEM', this.handlePickUpItem.bind(this));
        this.register('USE_ITEM', this.handleUseItem.bind(this));
        this.register('DROP_ITEM', this.handleDropItem.bind(this));
        
        // Combat actions
        this.register('ATTACK', this.handleAttack.bind(this));
        this.register('DEFEND', this.handleDefend.bind(this));
        this.register('USE_SKILL', this.handleUseSkill.bind(this));
        
        // Game flow actions
        this.register('NEXT_FLOOR', this.handleNextFloor.bind(this));
        this.register('REST', this.handleRest.bind(this));
        this.register('SAVE_GAME', this.handleSaveGame.bind(this));
        this.register('LOAD_GAME', this.handleLoadGame.bind(this));
    }

    /**
     * Handle player movement
     */
    handleMove(action, state) {
        const { direction } = action.payload;
        const moves = {
            'north': { x: 0, y: -1 },
            'south': { x: 0, y: 1 },
            'east': { x: 1, y: 0 },
            'west': { x: -1, y: 0 },
            'northeast': { x: 1, y: -1 },
            'northwest': { x: -1, y: -1 },
            'southeast': { x: 1, y: 1 },
            'southwest': { x: -1, y: 1 }
        };

        const move = moves[direction];
        if (!move) {
            return false;
        }

        const newX = state.player.x + move.x;
        const newY = state.player.y + move.y;

        // Basic bounds checking (would be enhanced with floor layout)
        if (newX < 0 || newX >= 20 || newY < 0 || newY >= 20) {
            return false;
        }

        return {
            changes: [
                { path: 'player.x', value: newX },
                { path: 'player.y', value: newY }
            ],
            events: [
                {
                    type: EVENT_TYPES.PLAYER_MOVE,
                    data: { from: { x: state.player.x, y: state.player.y }, to: { x: newX, y: newY } }
                }
            ]
        };
    }

    /**
     * Handle move to specific coordinates
     */
    handleMoveTo(action, state) {
        const { x, y } = action.payload;
        
        // Validate coordinates
        if (x < 0 || x >= 20 || y < 0 || y >= 20) {
            return false;
        }

        return {
            changes: [
                { path: 'player.x', value: x },
                { path: 'player.y', value: y }
            ],
            events: [
                {
                    type: EVENT_TYPES.PLAYER_MOVE,
                    data: { from: { x: state.player.x, y: state.player.y }, to: { x, y } }
                }
            ]
        };
    }

    /**
     * Handle starting a gambling game
     */
    handleStartGamble(action, state) {
        const { gameType, bet } = action.payload;
        
        // Validate bet
        if (bet <= 0 || bet > state.player.coins) {
            return false;
        }

        // Create game state
        const gameState = {
            type: gameType,
            bet: bet,
            phase: 'starting',
            data: {}
        };

        return {
            changes: [
                { path: 'currentGame', value: gameState },
                { path: 'player.coins', value: state.player.coins - bet }
            ],
            events: [
                {
                    type: EVENT_TYPES.GAMBLE_STARTED,
                    data: { gameType, bet }
                }
            ]
        };
    }

    /**
     * Handle placing a bet
     */
    handlePlaceBet(action, state) {
        const { amount, betType } = action.payload;
        
        if (!state.currentGame || amount > state.player.coins) {
            return false;
        }

        return {
            changes: [
                { path: 'currentGame.bet', value: state.currentGame.bet + amount },
                { path: 'player.coins', value: state.player.coins - amount }
            ],
            events: [
                {
                    type: EVENT_TYPES.BET_PLACED,
                    data: { amount, betType, totalBet: state.currentGame.bet + amount }
                }
            ]
        };
    }

    /**
     * Handle calling a bluff
     */
    handleCallBluff(action, state) {
        if (!state.currentGame || state.currentGame.type !== 'liars_dice') {
            return false;
        }

        // Simplified bluff resolution
        const opponentBluffing = gameRNG.rng.nextBool(0.4); // 40% chance opponent is bluffing
        const playerWins = opponentBluffing;
        
        const winnings = playerWins ? state.currentGame.bet * 2 : 0;

        return {
            changes: [
                { path: 'player.coins', value: state.player.coins + winnings },
                { path: 'currentGame', value: null }
            ],
            events: [
                {
                    type: EVENT_TYPES.GAMBLE_RESOLVED,
                    data: { 
                        won: playerWins, 
                        winnings, 
                        reason: playerWins ? 'Opponent was bluffing' : 'Opponent was telling truth'
                    }
                }
            ]
        };
    }

    /**
     * Handle folding
     */
    handleFold(action, state) {
        if (!state.currentGame) {
            return false;
        }

        return {
            changes: [
                { path: 'currentGame', value: null }
            ],
            events: [
                {
                    type: EVENT_TYPES.GAMBLE_RESOLVED,
                    data: { won: false, winnings: 0, reason: 'Player folded' }
                }
            ]
        };
    }

    /**
     * Handle picking up an item
     */
    handlePickUpItem(action, state) {
        const { itemId } = action.payload;
        
        // Find item at player location
        const itemIndex = state.floor.items.findIndex(item => 
            item.x === state.player.x && item.y === state.player.y && item.id === itemId
        );
        
        if (itemIndex === -1) {
            return false;
        }

        const item = state.floor.items[itemIndex];

        return {
            changes: [
                { arrayPush: { path: 'player.inventory', value: item.id } },
                { arrayRemove: { path: 'floor.items', value: item } }
            ],
            events: [
                {
                    type: 'ITEM_PICKED_UP',
                    data: { item: item.id }
                }
            ]
        };
    }

    /**
     * Handle using an item
     */
    handleUseItem(action, state) {
        const { itemId } = action.payload;
        
        if (!state.player.inventory.includes(itemId)) {
            return false;
        }

        // Simplified item effects
        const itemEffects = {
            'health_potion': { path: 'player.hp', value: Math.min(state.player.hp + 50, state.player.maxHp) },
            'lucky_coin': { path: 'player.stats.luck', value: state.player.stats.luck + 0.1 }
        };

        const effect = itemEffects[itemId];
        if (!effect) {
            return false;
        }

        return {
            changes: [
                effect,
                { arrayRemove: { path: 'player.inventory', value: itemId } }
            ],
            events: [
                {
                    type: 'ITEM_USED',
                    data: { item: itemId }
                }
            ]
        };
    }

    /**
     * Handle attack action
     */
    handleAttack(action, state) {
        const { targetId } = action.payload;
        
        // Find target enemy
        const enemy = state.floor.enemies.find(e => e.id === targetId);
        if (!enemy) {
            return false;
        }

        // Calculate damage
        const baseDamage = state.player.stats.strength * 10;
        const damage = gameRNG.damageRoll(baseDamage, 0.2);
        const newHp = Math.max(0, enemy.hp - damage);

        const changes = [
            { path: `floor.enemies.${state.floor.enemies.indexOf(enemy)}.hp`, value: newHp }
        ];

        const events = [
            {
                type: 'ATTACK_PERFORMED',
                data: { damage, targetId, enemyHp: newHp }
            }
        ];

        // Remove enemy if dead
        if (newHp === 0) {
            changes.push({ arrayRemove: { path: 'floor.enemies', value: enemy } });
            events.push({
                type: 'ENEMY_DEFEATED',
                data: { enemyId: targetId }
            });
        }

        return { changes, events };
    }

    /**
     * Handle going to next floor
     */
    handleNextFloor(action, state) {
        const nextFloor = state.floor.current + 1;

        return {
            changes: [
                { path: 'floor.current', value: nextFloor },
                { path: 'floor.enemies', value: [] },
                { path: 'floor.items', value: [] },
                { path: 'floor.layout', value: null },
                { path: 'floorsCleared', value: state.floorsCleared + 1 }
            ],
            events: [
                {
                    type: 'FLOOR_CHANGED',
                    data: { fromFloor: state.floor.current, toFloor: nextFloor }
                }
            ]
        };
    }

    /**
     * Handle rest action
     */
    handleRest(action, state) {
        const healAmount = Math.floor(state.player.maxHp * 0.25);
        const mpAmount = Math.floor(state.player.maxMp * 0.5);

        return {
            changes: [
                { path: 'player.hp', value: Math.min(state.player.hp + healAmount, state.player.maxHp) },
                { path: 'player.mp', value: Math.min(state.player.mp + mpAmount, state.player.maxMp) }
            ],
            events: [
                {
                    type: 'PLAYER_RESTED',
                    data: { healedHp: healAmount, restoredMp: mpAmount }
                }
            ]
        };
    }

    /**
     * Handle save game
     */
    async handleSaveGame(action, state) {
        try {
            const saveData = gameState.serialize();
            // In a real implementation, this would save to localStorage, file, or server
            console.log('Game saved (demo):', saveData.length, 'bytes');
            
            return {
                changes: [],
                events: [
                    {
                        type: EVENT_TYPES.STATE_SAVED,
                        data: { timestamp: Date.now() }
                    }
                ]
            };
        } catch (error) {
            console.error('Save failed:', error);
            return false;
        }
    }

    /**
     * Handle load game
     */
    async handleLoadGame(action, state) {
        try {
            const { saveData } = action.payload;
            const success = gameState.deserialize(saveData);
            
            if (success) {
                return {
                    changes: [],
                    events: [
                        {
                            type: EVENT_TYPES.STATE_LOADED,
                            data: { timestamp: Date.now() }
                        }
                    ]
                };
            }
            
            return false;
        } catch (error) {
            console.error('Load failed:', error);
            return false;
        }
    }
}

// Middleware examples
export const loggingMiddleware = (action, state) => {
    console.log(`Action: ${action.type}`, action.payload);
    return action;
};

export const validationMiddleware = (action, state) => {
    // Add custom validation logic here
    if (!action.type) {
        console.error('Action missing type');
        return null;
    }
    return action;
};

// Global action processor instance
export const actionProcessor = new ActionProcessor();

// Add default middleware
actionProcessor.use(validationMiddleware);
actionProcessor.use(loggingMiddleware);

// Helper function to dispatch actions
export const dispatch = (type, payload = {}) => {
    return actionProcessor.process({ type, payload });
};
