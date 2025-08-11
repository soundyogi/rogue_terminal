/**
 * Combat Slice - Manages battles, attacks, and combat state
 * Migrated to Redux Toolkit with TypeScript
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  CombatState,
  StartCombatPayload,
  EndCombatPayload,
  AttackPayload,
  DefendPayload,
  UseSkillPayload,
  FleePayload,
  EnemyActionPayload,
  TakeDamagePayload,
  DealDamagePayload,
  AddCombatLogPayload,
  SetPlayerTurnPayload,
  RootState
} from '../types.js';

const initialState: CombatState = {
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
    startCombat: (state, action: PayloadAction<StartCombatPayload>) => {
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

    endCombat: (state, action: PayloadAction<EndCombatPayload>) => {
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

    attack: (state, action: PayloadAction<AttackPayload>) => {
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

    defend: (state, action: PayloadAction<DefendPayload>) => {
      if (!state.playerTurn) return;
      
      state.combatLog.push('You defend, reducing incoming damage!');
      state.lastAction = 'defend';
      state.playerTurn = false;
    },

    useSkill: (state, action: PayloadAction<UseSkillPayload>) => {
      const { skillName, effect } = action.payload;
      
      if (!state.playerTurn) return;
      
      state.combatLog.push(`Used skill: ${skillName}!`);
      state.lastAction = 'skill';
      state.playerTurn = false;
    },

    flee: (state, action: PayloadAction<FleePayload>) => {
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

    enemyAction: (state, action: PayloadAction<EnemyActionPayload>) => {
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

    takeDamage: (state, action: PayloadAction<TakeDamagePayload>) => {
      const { amount, source = 'enemy' } = action.payload;
      
      state.damageTaken += amount;
      state.combatLog.push(`Took ${amount} damage from ${source}!`);
    },

    dealDamage: (state, action: PayloadAction<DealDamagePayload>) => {
      const { amount, target = 'enemy' } = action.payload;
      
      state.damageDealt += amount;
      if (state.currentEnemy && target === 'enemy') {
        state.currentEnemy.hp = Math.max(0, state.currentEnemy.hp - amount);
      }
    },

    addCombatLog: (state, action: PayloadAction<AddCombatLogPayload>) => {
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

    setPlayerTurn: (state, action: PayloadAction<SetPlayerTurnPayload>) => {
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

// Typed selectors
export const combatSelectors = {
  isInCombat: (state: RootState): boolean => state.combat.inCombat,
  getCurrentEnemy: (state: RootState) => state.combat.currentEnemy,
  getCombatLog: (state: RootState): string[] => state.combat.combatLog,
  isPlayerTurn: (state: RootState): boolean => state.combat.playerTurn,
  getTurnCount: (state: RootState): number => state.combat.turnCount,
  getLastAction: (state: RootState): string | null => state.combat.lastAction,
  getDamageDealt: (state: RootState): number => state.combat.damageDealt,
  getDamageTaken: (state: RootState): number => state.combat.damageTaken,
  getCombatExperience: (state: RootState): number => state.combat.experience,
  getRecentCombatLog: (state: RootState, count: number = 5): string[] => 
    state.combat.combatLog.slice(-count),
  isEnemyAlive: (state: RootState): boolean => 
    state.combat.currentEnemy !== null && state.combat.currentEnemy.hp > 0,
  getEnemyHealthPercentage: (state: RootState): number => {
    if (!state.combat.currentEnemy) return 0;
    return state.combat.currentEnemy.hp / state.combat.currentEnemy.maxHp;
  },
  getCombatStats: (state: RootState) => ({
    damageDealt: state.combat.damageDealt,
    damageTaken: state.combat.damageTaken,
    turnCount: state.combat.turnCount,
    experience: state.combat.experience
  }),
  isCombatOver: (state: RootState): boolean => 
    state.combat.lastAction === 'combat_ended' || state.combat.lastAction === 'fled'
};

// Export the slice reducer
export default combatSlice.reducer;