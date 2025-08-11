/**
 * UI Slice - Manages UI state, context, menus, and interface actions
 * Migrated to Redux Toolkit with TypeScript
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  UIState,
  ChangeContextPayload,
  NavigateMenuPayload,
  AddLogMessagePayload,
  SetHighlightedInteractionPayload,
  SetMenuItemsPayload,
  MenuItem,
  RootState
} from '../types.js';

const initialState: UIState = {
  currentContext: 'world',
  selectedIndex: 0,
  highlightedInteraction: null,
  logMessages: [],
  menu: {
    title: '',
    items: []
  },
  showDebug: false
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    changeContext: (state, action: PayloadAction<ChangeContextPayload>) => {
      const { context, data } = action.payload;
      
      // Generate menu items based on context
      let menu: { title: string; items: MenuItem[] } = { title: '', items: [] };
      
      switch (context) {
        case 'main_menu':
          menu = {
            title: 'Main Menu',
            items: [
              { label: 'Continue Game', action: { type: 'ui/changeContext', payload: { context: 'world' } } },
              { label: 'Save Game', action: { type: 'game/saveGame' } },
              { label: 'Load Game', action: { type: 'game/loadGame' } },
              { label: 'Quit', action: { type: 'QUIT_GAME' } }
            ]
          };
          break;
          
        case 'inventory':
          menu = {
            title: 'Inventory',
            items: data?.inventory?.map((item: string) => ({
              label: item,
              action: { type: 'inventory/useItem', payload: { itemId: item } }
            })) || []
          };
          break;
          
        case 'gambling':
          menu = {
            title: 'Gambling Games',
            items: [
              { label: 'Coin Flip', action: { type: 'game/startGamblingSession', payload: { gameType: 'coin_flip' } } },
              { label: 'Blackjack', action: { type: 'game/startGamblingSession', payload: { gameType: 'blackjack' } } },
              { label: 'Liar\'s Dice', action: { type: 'game/startGamblingSession', payload: { gameType: 'liars_dice' } } },
              { label: 'Back', action: { type: 'ui/changeContext', payload: { context: 'world' } } }
            ]
          };
          break;
          
        case 'combat':
          menu = {
            title: 'Combat',
            items: [
              { label: 'Attack', action: { type: 'combat/attack' } },
              { label: 'Defend', action: { type: 'combat/defend' } },
              { label: 'Use Item', action: { type: 'ui/changeContext', payload: { context: 'inventory' } } },
              { label: 'Run', action: { type: 'combat/flee' } }
            ]
          };
          break;
          
        default:
          menu = { title: '', items: [] };
      }

      state.currentContext = context;
      state.selectedIndex = 0;
      state.menu = menu;
    },

    navigateMenu: (state, action: PayloadAction<NavigateMenuPayload>) => {
      const { direction } = action.payload;
      const menuItems = state.menu.items;
      
      if (menuItems.length === 0) return;
      
      switch (direction) {
        case 'up':
          state.selectedIndex = state.selectedIndex > 0 ? state.selectedIndex - 1 : menuItems.length - 1;
          break;
        case 'down':
          state.selectedIndex = state.selectedIndex < menuItems.length - 1 ? state.selectedIndex + 1 : 0;
          break;
      }
    },

    selectMenuItem: (state) => {
      const selectedItem = state.menu.items[state.selectedIndex];
      if (selectedItem) {
        // Store the action to be dispatched - the middleware will handle this
        state.pendingAction = selectedItem.action;
      }
    },

    addLogMessage: (state, action: PayloadAction<AddLogMessagePayload>) => {
      const { message, type = 'info' } = action.payload;
      const timestamp = Date.now();
      
      state.logMessages.push({
        id: `msg_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        message,
        type,
        timestamp
      });
      
      // Keep only last 100 messages
      if (state.logMessages.length > 100) {
        state.logMessages = state.logMessages.slice(-100);
      }
    },

    clearLog: (state) => {
      state.logMessages = [];
    },

    toggleDebug: (state) => {
      state.showDebug = !state.showDebug;
    },

    setHighlightedInteraction: (state, action: PayloadAction<SetHighlightedInteractionPayload>) => {
      const { interaction } = action.payload;
      state.highlightedInteraction = interaction;
    },

    clearHighlightedInteraction: (state) => {
      state.highlightedInteraction = null;
    },

    setMenuItems: (state, action: PayloadAction<SetMenuItemsPayload>) => {
      const { title, items } = action.payload;
      state.menu.title = title;
      state.menu.items = items;
    },

    clearPendingAction: (state) => {
      state.pendingAction = undefined;
    }
  }
});

// Export actions
export const {
  changeContext,
  navigateMenu,
  selectMenuItem,
  addLogMessage,
  clearLog,
  toggleDebug,
  setHighlightedInteraction,
  clearHighlightedInteraction,
  setMenuItems,
  clearPendingAction
} = uiSlice.actions;

// Typed selectors
export const uiSelectors = {
  getCurrentContext: (state: RootState): string => state.ui.currentContext,
  getSelectedIndex: (state: RootState): number => state.ui.selectedIndex,
  getMenu: (state: RootState) => state.ui.menu,
  getLogMessages: (state: RootState) => state.ui.logMessages,
  getHighlightedInteraction: (state: RootState) => state.ui.highlightedInteraction,
  isDebugMode: (state: RootState): boolean => state.ui.showDebug,
  getSelectedMenuItem: (state: RootState): MenuItem | undefined => state.ui.menu.items[state.ui.selectedIndex],
  getPendingAction: (state: RootState) => state.ui.pendingAction,
  getRecentLogMessages: (state: RootState, count: number = 10) => state.ui.logMessages.slice(-count),
  getMenuItemCount: (state: RootState): number => state.ui.menu.items.length,
  hasMenuItems: (state: RootState): boolean => state.ui.menu.items.length > 0,
  getMenuTitle: (state: RootState): string => state.ui.menu.title
};

// Export the slice reducer
export default uiSlice.reducer;