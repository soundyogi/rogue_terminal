/**
 * Redux Toolkit Store E2E Tests
 * End-to-end testing of the Redux Toolkit implementation
 */

import test from 'tape';
import store from '../core/store.js';
import { movePlayer } from '../core/slices/playerSlice.js';
import { changeContext } from '../core/slices/uiSlice.js';
import { pickUpItem } from '../core/slices/inventorySlice.js';
import { startCombat } from '../core/slices/combatSlice.js';
import type { RootState } from '../core/types.js';

test('Redux Toolkit Store - Integration', async (t) => {
    t.plan(12);

    // Test store initialization
    t.ok(store, 'Store initializes successfully');

    // Test initial state from slices
    const state: RootState = store.getState();
    t.ok(state.player, 'Player slice state exists');
    t.ok(state.ui, 'UI slice state exists');
    t.ok(state.input, 'Input slice state exists');
    t.ok(state.game, 'Game slice state exists');
    t.equal(state.player.x, 5, 'Player starts at correct x position');
    t.equal(state.player.y, 5, 'Player starts at correct y position');

    // Test player movement action
    store.dispatch(movePlayer({ direction: 'right' }));
    const stateAfterMove: RootState = store.getState();
    t.equal(stateAfterMove.player.x, 6, 'Player moved right correctly');

    // Test UI context change
    store.dispatch(changeContext({ context: 'inventory' }));
    const stateAfterContext: RootState = store.getState();
    t.equal(stateAfterContext.ui.currentContext, 'inventory', 'UI context changed correctly');

    // Test inventory action
    store.dispatch(pickUpItem({ itemId: 'health_potion', x: 6, y: 5 }));
    const stateAfterPickup: RootState = store.getState();
    t.ok(stateAfterPickup.inventory.items.includes('health_potion'), 'Item added to inventory');

    // Test combat action
    store.dispatch(startCombat({ 
        enemy: { name: 'Goblin', hp: 30, maxHp: 30, attack: 5 } 
    }));
    const stateAfterCombat: RootState = store.getState();
    t.equal(stateAfterCombat.combat.inCombat, true, 'Combat started correctly');
    t.equal(stateAfterCombat.ui.currentContext, 'inventory', 'UI context remains as set (Redux Toolkit behavior)');

    console.log('✅ All Redux Toolkit tests passed!');
});

test('Redux Toolkit Store - Action Creators', async (t) => {
    t.plan(6);

    // Test that action creators generate proper actions
    const moveAction = movePlayer({ direction: 'up' });
    t.equal(moveAction.type, 'player/movePlayer', 'Move action has correct type');
    t.deepEqual(moveAction.payload, { direction: 'up' }, 'Move action has correct payload');

    const contextAction = changeContext({ context: 'combat' });
    t.equal(contextAction.type, 'ui/changeContext', 'Context action has correct type');
    t.deepEqual(contextAction.payload, { context: 'combat' }, 'Context action has correct payload');

    const combatAction = startCombat({ enemy: { name: 'Test', hp: 10, maxHp: 10, attack: 5 } });
    t.equal(combatAction.type, 'combat/startCombat', 'Combat action has correct type');
    t.ok(combatAction.payload.enemy, 'Combat action has enemy payload');

    console.log('✅ All action creator tests passed!');
});

test('Redux Toolkit Store - Selectors', async (t) => {
    t.plan(4);

    const state: RootState = store.getState();
    
    // Test direct state access (Redux Toolkit style)
    t.equal(state.player.level, 1, 'Player level accessible via state');
    t.equal(state.game.gameMode, 'gambling', 'Game mode accessible via state');
    t.equal(state.ui.currentContext, 'inventory', 'UI context accessible via state');
    t.equal(state.combat.inCombat, true, 'Combat state accessible via state');

    console.log('✅ All selector tests passed!');
});

console.log('🎮 Redux Toolkit migration test suite completed!');
