/**
 * Input handling thunks for Redux Toolkit
 * Replaces the old inputSlice action creators
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { movePlayer } from './slices/playerSlice.js';
import { changeContext, navigateMenu, selectMenuItem } from './slices/uiSlice.js';
import { startCombat, flee } from './slices/combatSlice.js';

/**
 * Handle input based on current context (thunk)
 */
export const handleInput = createAsyncThunk(
    'input/handleInput',
    async ({ inputType, inputData = {} }, { dispatch, getState }) => {
        const state = getState();
        const context = state.ui.currentContext;
        
        // Direct action dispatch based on context and input type
        switch (context) {
            case 'world':
                if (inputType === 'direction') {
                    dispatch(movePlayer({ direction: inputData.direction }));
                } else if (inputType === 'action') {
                    // Handle world interactions at player position
                    const { x, y } = { x: state.player.x, y: state.player.y };
                    const interaction = state.input.interactions[`${x},${y}`];
                    if (interaction) {
                        if (interaction.action === 'CHANGE_CONTEXT') {
                            dispatch(changeContext(interaction.payload));
                        } else if (interaction.action === 'ADVANCE_FLOOR') {
                            dispatch({ type: 'game/advanceFloor', payload: {} });
                        }
                    }
                } else if (inputType === 'cancel') {
                    dispatch(changeContext({ context: 'main_menu' }));
                }
                break;
                
            case 'main_menu':
            case 'inventory':
            case 'gambling':
                if (inputType === 'direction') {
                    dispatch(navigateMenu({ direction: inputData.direction }));
                } else if (inputType === 'action') {
                    dispatch(selectMenuItem());
                } else if (inputType === 'cancel') {
                    dispatch(changeContext({ context: 'world' }));
                }
                break;
                
            case 'combat':
                if (inputType === 'direction') {
                    dispatch(navigateMenu({ direction: inputData.direction }));
                } else if (inputType === 'action') {
                    dispatch(selectMenuItem());
                } else if (inputType === 'cancel') {
                    dispatch(flee({}));
                }
                break;
                
            default:
                console.warn('Unknown input context:', context);
        }
        
        return { inputType, inputData, context };
    }
);

/**
 * Handle action selection (when user presses action key)
 */
export const handleAction = createAsyncThunk(
    'input/handleAction',
    async (_, { dispatch, getState }) => {
        return await dispatch(handleInput({ inputType: 'action' }));
    }
);

/**
 * Handle directional input
 */
export const handleDirection = createAsyncThunk(
    'input/handleDirection',
    async ({ direction }, { dispatch, getState }) => {
        return await dispatch(handleInput({ inputType: 'direction', inputData: { direction } }));
    }
);

/**
 * Handle cancel input
 */
export const handleCancel = createAsyncThunk(
    'input/handleCancel',
    async (_, { dispatch, getState }) => {
        return await dispatch(handleInput({ inputType: 'cancel' }));
    }
);
