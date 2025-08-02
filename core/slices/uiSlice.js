/**
 * UI Slice - Manages UI state, context, menus, and interface actions
 * Migrated to Redux Toolkit
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
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

const uiSliceRTK = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        changeContext: (state, action) => {
            const { context, data } = action.payload;
            
            // Generate menu items based on context
            let menu = { title: '', items: [] };
            
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
                        items: data?.inventory?.map(item => ({
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

        navigateMenu: (state, action) => {
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

        selectMenuItem: (state, action) => {
            const selectedItem = state.menu.items[state.selectedIndex];
            if (selectedItem) {
                // Store the action to be dispatched - the middleware will handle this
                state.pendingAction = selectedItem.action;
            }
        },

        addLogMessage: (state, action) => {
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

        setHighlightedInteraction: (state, action) => {
            const { interaction } = action.payload;
            state.highlightedInteraction = interaction;
        },

        clearHighlightedInteraction: (state) => {
            state.highlightedInteraction = null;
        },

        setMenuItems: (state, action) => {
            const { title, items } = action.payload;
            state.menu.title = title;
            state.menu.items = items;
        },

        clearPendingAction: (state) => {
            state.pendingAction = null;
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
} = uiSliceRTK.actions;

// Selectors
export const uiSelectors = {
    getCurrentContext: (state) => state.ui.currentContext,
    getSelectedIndex: (state) => state.ui.selectedIndex,
    getMenu: (state) => state.ui.menu,
    getLogMessages: (state) => state.ui.logMessages,
    getHighlightedInteraction: (state) => state.ui.highlightedInteraction,
    isDebugMode: (state) => state.ui.showDebug,
    getSelectedMenuItem: (state) => state.ui.menu.items[state.ui.selectedIndex],
    getPendingAction: (state) => state.ui.pendingAction,
    getRecentLogMessages: (state, count = 10) => state.ui.logMessages.slice(-count)
};

// Export the slice reducer
export default uiSliceRTK.reducer;