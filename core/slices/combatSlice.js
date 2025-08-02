/**
 * Combat Slice - Manages battles, attacks, and combat state
 * Migrated to Redux Toolkit
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    inCombat: false,
    currentEnemy: null,
    combatLog: [],
    playerTurn: true,
    turnCount: 0,
    lastAction: null,
    damageDealt: 0,
    damageTaken: 0,
    experience: 0
};

const combatSlice = createSlice({
    name: 'combat',
    initialState,
    reducers: {
        startCombat: (state, action) => {
            const { enemy } = action.payload;
            
            state.inCombat = true;
            state.currentEnemy = enemy;
            state.playerTurn = true;
            state.turnCount = 0;
            state.combatLog = [`Combat started with ${enemy.name}!`];
            state.damageDealt = 0;
            state.damageTaken = 0;
            state.experience = 0;
            state.lastAction = null;
        },

        endCombat: (state, action) => {
            const { result, experience = 0, loot = [] } = action.payload;
            
            state.combatLog.push(`Combat ended: ${result}`);
            if (experience > 0) {
                state.combatLog.push(`Gained ${experience} experience!`);
            }
            if (loot.length > 0) {
                state.combatLog.push(`Found: ${loot.join(', ')}`);
            }
            
            // Don't reset immediately - let the UI show results
            state.lastAction = 'combat_ended';
        },

        clearCombat: (state) => {
            state.inCombat = false;
            state.currentEnemy = null;
            state.combatLog = [];
            state.playerTurn = true;
            state.turnCount = 0;
            state.lastAction = null;
            state.damageDealt = 0;
            state.damageTaken = 0;
            state.experience = 0;
        },

        attack: (state, action) => {
            const { damage, critical = false } = action.payload;
            
            if (!state.playerTurn || !state.currentEnemy) return;
            
            const logMessage = critical 
                ? `Critical hit! Dealt ${damage} damage to ${state.currentEnemy.name}!`
                : `Attacked ${state.currentEnemy.name} for ${damage} damage!`;
            
            state.combatLog.push(logMessage);
            state.damageDealt += damage;
            state.lastAction = 'attack';
            
            // Apply damage to enemy
            if (state.currentEnemy) {
                state.currentEnemy.hp = Math.max(0, state.currentEnemy.hp - damage);
            }
            
            state.playerTurn = false;
        },

        defend: (state, action) => {
            if (!state.playerTurn) return;
            
            state.combatLog.push('You defend, reducing incoming damage!');
            state.lastAction = 'defend';
            state.playerTurn = false;
        },

        useSkill: (state, action) => {
            const { skillName, effect } = action.payload;
            
            if (!state.playerTurn) return;
            
            state.combatLog.push(`Used skill: ${skillName}!`);
            state.lastAction = 'skill';
            state.playerTurn = false;
        },

        flee: (state, action) => {
            const { success = true } = action.payload;
            
            if (success) {
                state.combatLog.push('Successfully fled from combat!');
                state.inCombat = false;
                state.currentEnemy = null;
                state.lastAction = 'fled';
            } else {
                state.combatLog.push('Failed to flee!');
                state.lastAction = 'flee_failed';
                state.playerTurn = false;
            }
        },

        enemyAction: (state, action) => {
            const { actionType, damage = 0, effect } = action.payload;
            
            if (state.playerTurn || !state.currentEnemy) return;
            
            switch (actionType) {
                case 'attack':
                    state.combatLog.push(`${state.currentEnemy.name} attacks for ${damage} damage!`);
                    state.damageTaken += damage;
                    break;
                case 'defend':
                    state.combatLog.push(`${state.currentEnemy.name} defends!`);
                    break;
                case 'skill':
                    state.combatLog.push(`${state.currentEnemy.name} uses ${effect}!`);
                    break;
                default:
                    state.combatLog.push(`${state.currentEnemy.name} does something mysterious...`);
            }
            
            state.lastAction = `enemy_${actionType}`;
        },

        takeDamage: (state, action) => {
            const { amount, source = 'enemy' } = action.payload;
            
            state.damageTaken += amount;
            state.combatLog.push(`Took ${amount} damage from ${source}!`);
        },

        dealDamage: (state, action) => {
            const { amount, target = 'enemy' } = action.payload;
            
            state.damageDealt += amount;
            if (state.currentEnemy && target === 'enemy') {
                state.currentEnemy.hp = Math.max(0, state.currentEnemy.hp - amount);
            }
        },

        addCombatLog: (state, action) => {
            const { message } = action.payload;
            state.combatLog.push(message);
            
            // Keep log manageable
            if (state.combatLog.length > 50) {
                state.combatLog = state.combatLog.slice(-50);
            }
        },

        clearCombatLog: (state) => {
            state.combatLog = [];
        },

        endTurn: (state) => {
            state.playerTurn = !state.playerTurn;
            if (state.playerTurn) {
                state.turnCount += 1;
            }
        },

        setPlayerTurn: (state, action) => {
            const { isPlayerTurn } = action.payload;
            state.playerTurn = isPlayerTurn;
        }
    }
});

// Export actions
export const {
    startCombat,
    endCombat,
    clearCombat,
    attack,
    defend,
    useSkill,
    flee,
    enemyAction,
    takeDamage,
    dealDamage,
    addCombatLog,
    clearCombatLog,
    endTurn,
    setPlayerTurn
} = combatSlice.actions;

// Selectors
export const combatSelectors = {
    isInCombat: (state) => state.combat.inCombat,
    getCurrentEnemy: (state) => state.combat.currentEnemy,
    getCombatLog: (state) => state.combat.combatLog,
    isPlayerTurn: (state) => state.combat.playerTurn,
    getTurnCount: (state) => state.combat.turnCount,
    getLastAction: (state) => state.combat.lastAction,
    getDamageDealt: (state) => state.combat.damageDealt,
    getDamageTaken: (state) => state.combat.damageTaken,
    getCombatExperience: (state) => state.combat.experience,
    getRecentCombatLog: (state, count = 5) => state.combat.combatLog.slice(-count),
    isEnemyAlive: (state) => state.combat.currentEnemy && state.combat.currentEnemy.hp > 0,
    getEnemyHealthPercentage: (state) => {
        if (!state.combat.currentEnemy) return 0;
        return state.combat.currentEnemy.hp / state.combat.currentEnemy.maxHp;
    }
};

// Export the slice reducer
export default combatSlice.reducer;