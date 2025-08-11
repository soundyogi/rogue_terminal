/**
 * Input Slice - Manages input context state only (pure Redux)
 * Migrated to Redux Toolkit with TypeScript
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  InputState,
  SetInputContextPayload,
  PushInputContextPayload,
  AddInteractionPayload,
  RemoveInteractionPayload,
  SetInteractionsPayload,
  RootState
} from '../types.js';

const initialState: InputState = {
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
    setInputContext: (state, action: PayloadAction<SetInputContextPayload>) => {
      const { context } = action.payload;
      state.currentContext = context;
      state.contextStack = [context];
    },

    pushInputContext: (state, action: PayloadAction<PushInputContextPayload>) => {
      const { context } = action.payload;
      state.currentContext = context;
      state.contextStack.push(context);
    },

    popInputContext: (state) => {
      if (state.contextStack.length > 1) {
        state.contextStack.pop();
        state.currentContext = state.contextStack[state.contextStack.length - 1]!;
      }
    },

    addInteraction: (state, action: PayloadAction<AddInteractionPayload>) => {
      const { x, y, interaction } = action.payload;
      const key = `${x},${y}`;
      state.interactions[key] = interaction;
    },

    removeInteraction: (state, action: PayloadAction<RemoveInteractionPayload>) => {
      const { x, y } = action.payload;
      const key = `${x},${y}`;
      delete state.interactions[key];
    },

    clearInteractions: (state) => {
      state.interactions = {};
    },

    setInteractions: (state, action: PayloadAction<SetInteractionsPayload>) => {
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

// Typed selectors
export const inputSelectors = {
  getCurrentContext: (state: RootState): string => state.input.currentContext,
  getContextStack: (state: RootState): string[] => state.input.contextStack,
  getInteractions: (state: RootState) => state.input.interactions,
  getInteractionAt: (state: RootState, x: number, y: number) => 
    state.input.interactions[`${x},${y}`],
  hasInteractionAt: (state: RootState, x: number, y: number): boolean => 
    Boolean(state.input.interactions[`${x},${y}`]),
  getContextDepth: (state: RootState): number => state.input.contextStack.length,
  canPopContext: (state: RootState): boolean => state.input.contextStack.length > 1,
  getPreviousContext: (state: RootState): string | null => {
    const stack = state.input.contextStack;
    return stack.length > 1 ? stack[stack.length - 2]! : null;
  },
  getAllInteractionPositions: (state: RootState): Array<{ x: number; y: number }> => {
    return Object.keys(state.input.interactions).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x: x!, y: y! };
    });
  },
  getInteractionCount: (state: RootState): number => 
    Object.keys(state.input.interactions).length,
  isInWorldContext: (state: RootState): boolean => 
    state.input.currentContext === 'world'
};

// Export the slice reducer
export default inputSlice.reducer;