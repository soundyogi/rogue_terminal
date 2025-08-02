/**
 * Inventory Slice - Manages items, equipment, and inventory operations
 * Migrated to Redux Toolkit
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    items: ["lucky_coin"],
    equipment: {
        weapon: null,
        armor: null,
        accessory1: null,
        accessory2: null
    },
    capacity: 20,
    lastUsedItem: null
};

const inventorySlice = createSlice({
    name: 'inventory',
    initialState,
    reducers: {
        pickUpItem: (state, action) => {
            const { itemId, x, y } = action.payload;
            
            // Check if inventory has space
            if (state.items.length >= state.capacity) {
                return; // Inventory full
            }
            
            // Add item to inventory
            state.items.push(itemId);
        },

        dropItem: (state, action) => {
            const { itemId, x, y } = action.payload;
            
            const itemIndex = state.items.indexOf(itemId);
            if (itemIndex > -1) {
                state.items.splice(itemIndex, 1);
            }
        },

        useItem: (state, action) => {
            const { itemId } = action.payload;
            
            const itemIndex = state.items.indexOf(itemId);
            if (itemIndex > -1) {
                state.lastUsedItem = itemId;
                // Note: Item consumption logic should be handled by effects/thunks
                // Some items are consumable, others are not
            }
        },

        equipItem: (state, action) => {
            const { itemId, slot } = action.payload;
            
            const itemIndex = state.items.indexOf(itemId);
            if (itemIndex > -1 && state.equipment.hasOwnProperty(slot)) {
                // If something is already equipped in that slot, add it back to inventory
                if (state.equipment[slot]) {
                    state.items.push(state.equipment[slot]);
                }
                
                // Remove item from inventory and equip it
                state.items.splice(itemIndex, 1);
                state.equipment[slot] = itemId;
            }
        },

        unequipItem: (state, action) => {
            const { slot } = action.payload;
            
            if (state.equipment[slot] && state.items.length < state.capacity) {
                const item = state.equipment[slot];
                state.equipment[slot] = null;
                state.items.push(item);
            }
        },

        addItem: (state, action) => {
            const { itemId, quantity = 1 } = action.payload;
            
            for (let i = 0; i < quantity && state.items.length < state.capacity; i++) {
                state.items.push(itemId);
            }
        },

        removeItem: (state, action) => {
            const { itemId, quantity = 1 } = action.payload;
            
            for (let i = 0; i < quantity; i++) {
                const itemIndex = state.items.indexOf(itemId);
                if (itemIndex > -1) {
                    state.items.splice(itemIndex, 1);
                } else {
                    break;
                }
            }
        },

        sortInventory: (state) => {
            state.items.sort();
        },

        expandInventory: (state, action) => {
            const { additionalSlots } = action.payload;
            state.capacity += additionalSlots;
        },

        clearInventory: (state) => {
            state.items = [];
            state.equipment = {
                weapon: null,
                armor: null,
                accessory1: null,
                accessory2: null
            };
            state.lastUsedItem = null;
        },

        setInventoryItems: (state, action) => {
            const { items } = action.payload;
            state.items = items;
        }
    }
});

// Export actions
export const {
    pickUpItem,
    dropItem,
    useItem,
    equipItem,
    unequipItem,
    addItem,
    removeItem,
    sortInventory,
    expandInventory,
    clearInventory,
    setInventoryItems
} = inventorySlice.actions;

// Selectors
export const inventorySelectors = {
    getItems: (state) => state.inventory.items,
    getEquipment: (state) => state.inventory.equipment,
    getCapacity: (state) => state.inventory.capacity,
    getLastUsedItem: (state) => state.inventory.lastUsedItem,
    getItemCount: (state, itemId) => state.inventory.items.filter(item => item === itemId).length,
    hasItem: (state, itemId) => state.inventory.items.includes(itemId),
    isInventoryFull: (state) => state.inventory.items.length >= state.inventory.capacity,
    getAvailableSlots: (state) => state.inventory.capacity - state.inventory.items.length,
    getEquippedItem: (state, slot) => state.inventory.equipment[slot],
    isItemEquipped: (state, itemId) => Object.values(state.inventory.equipment).includes(itemId)
};

// Export the slice reducer
export default inventorySlice.reducer;