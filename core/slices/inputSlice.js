/**
 * Input Slice - Manages input context state only (pure Redux)
 * Migrated to Redux Toolkit
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    currentContext: 'world',
    contextStack: ['world'], // For nested contexts (like submenu)
    interactions: {
        // Static world interactions - could be moved to content files
        '10,10': { type: 'gambling_table', action: 'CHANGE_CONTEXT', payload: { context: 'gambling' } },
        '18,12': { type: 'stairs', action: 'ADVANCE_FLOOR' }
    }
};

const inputSlice = createSlice({
    name: 'input',
    initialState,
    reducers: {
        setInputContext: (state, action) => {
            const { context } = action.payload;
            state.currentContext = context;
            state.contextStack = [context];
        },

        pushInputContext: (state, action) => {
            const { context } = action.payload;
            state.currentContext = context;
            state.contextStack.push(context);
        },

        popInputContext: (state) => {
            if (state.contextStack.length > 1) {
                state.contextStack.pop();
                state.currentContext = state.contextStack[state.contextStack.length - 1];
            }
        },

        addInteraction: (state, action) => {
            const { x, y, interaction } = action.payload;
            const key = `${x},${y}`;
            state.interactions[key] = interaction;
        },

        removeInteraction: (state, action) => {
            const { x, y } = action.payload;
            const key = `${x},${y}`;
            delete state.interactions[key];
        },

        clearInteractions: (state) => {
            state.interactions = {};
        },

        setInteractions: (state, action) => {
            const { interactions } = action.payload;
            state.interactions = interactions;
        },

        resetInputState: (state) => {
            state.currentContext = 'world';
            state.contextStack = ['world'];
            state.interactions = {
                '10,10': { type: 'gambling_table', action: 'CHANGE_CONTEXT', payload: { context: 'gambling' } },
                '18,12': { type: 'stairs', action: 'ADVANCE_FLOOR' }
            };
        }
    }
});

// Export actions
export const {
    setInputContext,
    pushInputContext,
    popInputContext,
    addInteraction,
    removeInteraction,
    clearInteractions,
    setInteractions,
    resetInputState
} = inputSlice.actions;

// Selectors
export const inputSelectors = {
    getCurrentContext: (state) => state.input.currentContext,
    getContextStack: (state) => state.input.contextStack,
    getInteractions: (state) => state.input.interactions,
    getInteractionAt: (state, x, y) => state.input.interactions[`${x},${y}`],
    hasInteractionAt: (state, x, y) => Boolean(state.input.interactions[`${x},${y}`]),
    getContextDepth: (state) => state.input.contextStack.length,
    canPopContext: (state) => state.input.contextStack.length > 1,
    getPreviousContext: (state) => {
        const stack = state.input.contextStack;
        return stack.length > 1 ? stack[stack.length - 2] : null;
    }
};

// Export the slice reducer
export default inputSlice.reducer;