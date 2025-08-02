/**
 * Redux-based Stateless Input Handler
 *
 * This module provides a pure function, `handleInput`, that translates raw input
 * into a specific, serializable Redux action based on the current game state.
 * It is the single source of truth for interpreting user input.
 */

/**
 * Handles raw input and returns a Redux action object.
 *
 * @param {object} state - The current Redux game state.
 * @param {string} inputType - The type of input ('direction', 'action', 'cancel').
 * @param {object} [inputData={}] - Additional data associated with the input (e.g., { direction: 'up' }).
 * @returns {object|null} A Redux action object or null if no action is warranted.
 */
export const handleInput = (state, inputType, inputData = {}) => {
    const context = state.ui.currentContext;

    switch (context) {
        case 'world':
            return handleWorldInput(state, inputType, inputData);
        case 'main_menu':
        case 'inventory':
        case 'gambling':
            return handleMenuInput(state, inputType, inputData);
        case 'combat':
            // Future: return handleCombatInput(state, inputType, inputData);
            return null;
        default:
            return null;
    }
};

/**
 * Handles input for the 'world' context (player movement, interaction).
 */
const handleWorldInput = (state, inputType, inputData) => {
    switch (inputType) {
        case 'direction':
            // In the world, directional input always translates to movement.
            // The reducer is responsible for validating if the move is possible.
            return { type: 'MOVE_PLAYER', payload: { direction: inputData.direction } };
        case 'action':
            // Check for an interaction at the player's current location.
            const interaction = getInteractionAt(state, state.player.x, state.player.y);
            return interaction ? performInteraction(interaction) : null;
        case 'cancel':
            // Open the main menu.
            return { type: 'CHANGE_CONTEXT', payload: { context: 'main_menu' } };
        default:
            return null;
    }
};

/**
 * Handles input for all menu-based contexts.
 */
const handleMenuInput = (state, inputType, inputData) => {
    const menuItems = state.ui.menu && state.ui.menu.items ? state.ui.menu.items : [];
    const selectedIndex = state.ui.selectedIndex;

    switch (inputType) {
        case 'direction':
            return { type: 'NAVIGATE_MENU', payload: { direction: inputData.direction } };
        case 'action':
            if (menuItems[selectedIndex] && menuItems[selectedIndex].action) {
                // Return the specific action associated with the menu item
                return menuItems[selectedIndex].action;
            }
            return null;
        case 'cancel':
            // Go back to the world context by default
            return { type: 'CHANGE_CONTEXT', payload: { context: 'world' } };
        default:
            return null;
    }
};

/**
 * Checks for any interactive elements at a given coordinate.
 * @returns {object|null} An interaction object or null.
 */
const getInteractionAt = (state, x, y) => {
    // Check for items on the floor
    const item = state.floor.items.find(item => item.x === x && item.y === y);
    if (item) {
        return { type: 'item', data: item };
    }

    // Check for enemies/NPCs
    const enemy = state.floor.enemies.find(enemy => enemy.x === x && enemy.y === y);
    if (enemy) {
        return { type: 'npc', data: enemy };
    }

    // Check for special locations (e.g., stairs, shops)
    // This logic can be expanded or moved to data files.
    if (x === 10 && y === 10) {
        return { type: 'gambling_table', data: { games: ['coin_flip', 'blackjack'] } };
    }
    if (x === 18 && y === 12) {
        return { type: 'stairs', data: { direction: 'down' } };
    }

    return null;
};

/**
 * Translates an interaction object into a specific Redux action.
 * @param {object} interaction - The interaction object from getInteractionAt.
 * @returns {object} A Redux action object.
 */
const performInteraction = (interaction) => {
    switch (interaction.type) {
        case 'item':
            return { type: 'PICK_UP_ITEM', payload: { itemId: interaction.data.id, x: interaction.data.x, y: interaction.data.y } };
        case 'gambling_table':
            return { type: 'CHANGE_CONTEXT', payload: { context: 'gambling', data: interaction.data } };
        case 'stairs':
            return { type: 'ADVANCE_FLOOR' };
        case 'npc':
            // This could be expanded for different NPC types
            return { type: 'CHANGE_CONTEXT', payload: { context: 'dialogue', data: interaction.data } };
        default:
            return null;
    }
};