/**
 * Main entry point for the Roguelike Engine - Redux Version
 * This file initializes and starts the Redux-based game
 * Terminal-only version for testing TypeScript migration
 */

// For TypeScript module importing from JavaScript files
import { game } from './core/game.js';
import { movePlayer } from './core/slices/playerSlice.js';
import { changeContext } from './core/slices/uiSlice.js';

// Simple terminal renderer for testing
const terminalRenderer = {
    render: (state: any) => {
        console.clear();
        console.log('=== ROGUELIKE ENGINE (TERMINAL) ===');
        console.log(`Player: (${state.player.x}, ${state.player.y})`);
        console.log(`HP: ${state.player.hp}/${state.player.maxHp}`);
        console.log(`Level: ${state.player.level} | XP: ${state.player.experience}`);
        console.log(`Coins: ${state.player.coins}`);
        console.log(`Context: ${state.ui.currentContext}`);
        console.log(`Floor: ${state.game.floor.current}`);
        console.log('=====================================');
    }
};

// Simple actions config for testing
const testActionsConfig = {
    'MOVE_PLAYER': { category: 'movement', undoable: true },
    'CHANGE_CONTEXT': { category: 'ui', undoable: false }
};

async function main() {
    try {
        console.log('Starting Roguelike Engine (Terminal Mode)...');
        
        // Initialize game with simple renderer
        const initialized = await game.initialize(terminalRenderer, testActionsConfig);
        
        if (!initialized) {
            throw new Error('Failed to initialize game');
        }
        
        // Start the game
        game.start();
        
        console.log('Roguelike Engine started successfully!');
        console.log('Testing basic functionality...');
        
        // Test some basic actions
        setTimeout(() => {
            console.log('\n--- Testing player movement ---');
            game.dispatch(movePlayer({ direction: 'right' }));
        }, 1000);
        
        setTimeout(() => {
            console.log('\n--- Testing context change ---');
            game.dispatch(changeContext({ context: 'inventory' }));
        }, 2000);
        
        setTimeout(() => {
            console.log('\n--- Testing complete! ---');
            game.stop();
        }, 3000);
        
    } catch (error) {
        console.error('Failed to start Roguelike Engine:', error);
    }
}

// Run directly in terminal
main();