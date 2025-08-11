/**
 * Player Slice - Manages player state, actions, and side effects
 * Migrated to Redux Toolkit with TypeScript
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  PlayerState,
  MovePlayerPayload,
  MovePlayerToPayload,
  UpdateStatsPayload,
  GainExperiencePayload,
  HealPayload,
  DamagePayload,
  AddToInventoryPayload,
  RemoveFromInventoryPayload,
  EquipItemPayload,
  AddCoinsPayload,
  SpendCoinsPayload,
  RootState
} from '../types.js';

const initialState: PlayerState = {
  x: 5,
  y: 5,
  hp: 100,
  maxHp: 100,
  mp: 20,
  maxMp: 20,
  level: 1,
  experience: 0,
  coins: 50,
  inventory: ["lucky_coin"],
  stats: { luck: 1.0, speed: 1.0, strength: 1.0 },
  equipment: { weapon: null, armor: null }
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    movePlayer: (state, action: PayloadAction<MovePlayerPayload>) => {
      const { direction } = action.payload;
      const moves = { 
        up: {x: 0, y: -1}, 
        down: {x: 0, y: 1}, 
        left: {x: -1, y: 0}, 
        right: {x: 1, y: 0} 
      };
      const move = moves[direction];
      if (!move) return;

      const newX = state.x + move.x;
      const newY = state.y + move.y;

      // Basic bounds check (TODO: use floor data for proper collision)
      if (newX < 0 || newX >= 20 || newY < 0 || newY >= 20) return;

      state.x = newX;
      state.y = newY;
    },

    movePlayerTo: (state, action: PayloadAction<MovePlayerToPayload>) => {
      const { x, y } = action.payload;
      if (x < 0 || x >= 20 || y < 0 || y >= 20) return;

      state.x = x;
      state.y = y;
    },

    updateStats: (state, action: PayloadAction<UpdateStatsPayload>) => {
      const { stats } = action.payload;
      Object.assign(state.stats, stats);
    },

    gainExperience: (state, action: PayloadAction<GainExperiencePayload>) => {
      const { amount } = action.payload;
      state.experience += amount;
    },

    levelUp: (state) => {
      state.level += 1;
      state.experience = 0;
      state.hp = state.maxHp;
      state.mp = state.maxMp;
    },

    heal: (state, action: PayloadAction<HealPayload>) => {
      const { amount } = action.payload;
      state.hp = Math.min(state.hp + amount, state.maxHp);
    },

    damage: (state, action: PayloadAction<DamagePayload>) => {
      const { amount } = action.payload;
      state.hp = Math.max(state.hp - amount, 0);
    },

    addToInventory: (state, action: PayloadAction<AddToInventoryPayload>) => {
      const { item } = action.payload;
      if (!state.inventory.includes(item)) {
        state.inventory.push(item);
      }
    },

    removeFromInventory: (state, action: PayloadAction<RemoveFromInventoryPayload>) => {
      const { item } = action.payload;
      const index = state.inventory.indexOf(item);
      if (index > -1) {
        state.inventory.splice(index, 1);
      }
    },

    equipItem: (state, action: PayloadAction<EquipItemPayload>) => {
      const { slot, item } = action.payload;
      if (state.equipment.hasOwnProperty(slot)) {
        state.equipment[slot] = item;
      }
    },

    addCoins: (state, action: PayloadAction<AddCoinsPayload>) => {
      const { amount } = action.payload;
      state.coins += amount;
    },

    spendCoins: (state, action: PayloadAction<SpendCoinsPayload>) => {
      const { amount } = action.payload;
      if (state.coins >= amount) {
        state.coins -= amount;
      }
    }
  }
});

// Export actions
export const {
  movePlayer,
  movePlayerTo,
  updateStats,
  gainExperience,
  levelUp,
  heal,
  damage,
  addToInventory,
  removeFromInventory,
  equipItem,
  addCoins,
  spendCoins
} = playerSlice.actions;

// Typed selectors
export const playerSelectors = {
  getPlayer: (state: RootState): PlayerState => state.player,
  getPosition: (state: RootState): { x: number; y: number } => ({ x: state.player.x, y: state.player.y }),
  getStats: (state: RootState) => state.player.stats,
  getInventory: (state: RootState): string[] => state.player.inventory,
  isAlive: (state: RootState): boolean => state.player.hp > 0,
  getHealthPercentage: (state: RootState): number => state.player.hp / state.player.maxHp,
  getManaPercentage: (state: RootState): number => state.player.mp / state.player.maxMp,
  getCoins: (state: RootState): number => state.player.coins,
  getLevel: (state: RootState): number => state.player.level,
  getExperience: (state: RootState): number => state.player.experience,
  getEquipment: (state: RootState) => state.player.equipment
};

// Export the slice reducer
export default playerSlice.reducer;