/**
 * Player Slice - Manages player state, actions, and side effects
 * Migrated to Redux Toolkit
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
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
        movePlayer: (state, action) => {
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

        movePlayerTo: (state, action) => {
            const { x, y } = action.payload;
            if (x < 0 || x >= 20 || y < 0 || y >= 20) return;

            state.x = x;
            state.y = y;
        },

        updateStats: (state, action) => {
            const { stats } = action.payload;
            Object.assign(state.stats, stats);
        },

        gainExperience: (state, action) => {
            const { amount } = action.payload;
            state.experience += amount;
        },

        levelUp: (state, action) => {
            state.level += 1;
            state.experience = 0;
            state.hp = state.maxHp;
            state.mp = state.maxMp;
        },

        heal: (state, action) => {
            const { amount } = action.payload;
            state.hp = Math.min(state.hp + amount, state.maxHp);
        },

        damage: (state, action) => {
            const { amount } = action.payload;
            state.hp = Math.max(state.hp - amount, 0);
        },

        addToInventory: (state, action) => {
            const { item } = action.payload;
            if (!state.inventory.includes(item)) {
                state.inventory.push(item);
            }
        },

        removeFromInventory: (state, action) => {
            const { item } = action.payload;
            const index = state.inventory.indexOf(item);
            if (index > -1) {
                state.inventory.splice(index, 1);
            }
        },

        equipItem: (state, action) => {
            const { slot, item } = action.payload;
            if (state.equipment.hasOwnProperty(slot)) {
                state.equipment[slot] = item;
            }
        },

        addCoins: (state, action) => {
            const { amount } = action.payload;
            state.coins += amount;
        },

        spendCoins: (state, action) => {
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

// Selectors
export const playerSelectors = {
    getPlayer: (state) => state.player,
    getPosition: (state) => ({ x: state.player.x, y: state.player.y }),
    getStats: (state) => state.player.stats,
    getInventory: (state) => state.player.inventory,
    isAlive: (state) => state.player.hp > 0,
    getHealthPercentage: (state) => state.player.hp / state.player.maxHp,
    getManaPercentage: (state) => state.player.mp / state.player.maxMp,
    getCoins: (state) => state.player.coins,
    getLevel: (state) => state.player.level,
    getExperience: (state) => state.player.experience,
    getEquipment: (state) => state.player.equipment
};

// Export the slice reducer
export default playerSlice.reducer;