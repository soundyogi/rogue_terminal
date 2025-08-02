/**
 * Main entry point for the Roguelike Engine - Redux Version
 * This file initializes and starts the Redux-based game
 */

import { renderer } from './ui/renderer.js';
import { reduxBrowserAdapter } from './adapters/redux-browser.js';

// For TypeScript module importing from JavaScript files
import { game } from './core/game.js';

async function main() {
    try {
        console.log('Starting Roguelike Engine (Redux)...');
        
        // Initialize Redux browser adapter
        const browserAdapter = new ReduxBrowserAdapter();
        await browserAdapter.initialize();
        
        // Start the game
        await browserAdapter.start();
        
        console.log('Roguelike Engine (Redux) started successfully!');
        console.log('Use WASD to move, ENTER/Z for action, ESC for menu, Q to quit');
        
    } catch (error) {
        console.error('Failed to start Roguelike Engine:', error);
    }
}

// Start the game when the page loads
if (typeof window !== 'undefined') {
    // Browser environment
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
} else {
    // Node/Bun environment - run directly
    main();
}