/**
 * Inventory Slice - Manages items, equipment, and inventory operations
 * Migrated to Redux Toolkit with TypeScript
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  InventoryState,
  PickUpItemPayload,
  DropItemPayload,
  UseItemPayload,
  EquipItemInventoryPayload,
  UnequipItemPayload,
  AddItemPayload,
  RemoveItemPayload,
  ExpandInventoryPayload,
  SetInventoryItemsPayload,
  RootState
} from '../types.js';

const initialState: InventoryState = {
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
    pickUpItem: (state, action: PayloadAction<PickUpItemPayload>) => {
      const { itemId, x, y } = action.payload;
      
      // Check if inventory has space
      if (state.items.length >= state.capacity) {
        return; // Inventory full
      }
      
      // Add item to inventory
      state.items.push(itemId);
    },

    dropItem: (state, action: PayloadAction<DropItemPayload>) => {
      const { itemId, x, y } = action.payload;
      
      const itemIndex = state.items.indexOf(itemId);
      if (itemIndex > -1) {
        state.items.splice(itemIndex, 1);
      }
    },

    useItem: (state, action: PayloadAction<UseItemPayload>) => {
      const { itemId } = action.payload;
      
      const itemIndex = state.items.indexOf(itemId);
      if (itemIndex > -1) {
        state.lastUsedItem = itemId;
        // Note: Item consumption logic should be handled by effects/thunks
        // Some items are consumable, others are not
      }
    },

    equipItem: (state, action: PayloadAction<EquipItemInventoryPayload>) => {
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

    unequipItem: (state, action: PayloadAction<UnequipItemPayload>) => {
      const { slot } = action.payload;
      
      if (state.equipment[slot] && state.items.length < state.capacity) {
        const item = state.equipment[slot];
        state.equipment[slot] = null;
        state.items.push(item);
      }
    },

    addItem: (state, action: PayloadAction<AddItemPayload>) => {
      const { itemId, quantity = 1 } = action.payload;
      
      for (let i = 0; i < quantity && state.items.length < state.capacity; i++) {
        state.items.push(itemId);
      }
    },

    removeItem: (state, action: PayloadAction<RemoveItemPayload>) => {
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

    expandInventory: (state, action: PayloadAction<ExpandInventoryPayload>) => {
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

    setInventoryItems: (state, action: PayloadAction<SetInventoryItemsPayload>) => {
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

// Typed selectors
export const inventorySelectors = {
  getItems: (state: RootState): string[] => state.inventory.items,
  getEquipment: (state: RootState) => state.inventory.equipment,
  getCapacity: (state: RootState): number => state.inventory.capacity,
  getLastUsedItem: (state: RootState): string | null => state.inventory.lastUsedItem,
  getItemCount: (state: RootState, itemId: string): number => 
    state.inventory.items.filter(item => item === itemId).length,
  hasItem: (state: RootState, itemId: string): boolean => 
    state.inventory.items.includes(itemId),
  isInventoryFull: (state: RootState): boolean => 
    state.inventory.items.length >= state.inventory.capacity,
  getAvailableSlots: (state: RootState): number => 
    state.inventory.capacity - state.inventory.items.length,
  getEquippedItem: (state: RootState, slot: keyof InventoryState['equipment']): string | null => 
    state.inventory.equipment[slot],
  isItemEquipped: (state: RootState, itemId: string): boolean => 
    Object.values(state.inventory.equipment).includes(itemId),
  getInventoryUtilization: (state: RootState): number => 
    state.inventory.items.length / state.inventory.capacity,
  getUniqueItems: (state: RootState): string[] => 
    Array.from(new Set(state.inventory.items)),
  getEquippedItemsCount: (state: RootState): number => 
    Object.values(state.inventory.equipment).filter(item => item !== null).length
};

// Export the slice reducer
export default inventorySlice.reducer;