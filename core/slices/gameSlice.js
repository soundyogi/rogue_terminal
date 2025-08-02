/**
 * Game Slice - Manages core game state, mode, progression, and meta information
 * Migrated to Redux Toolkit
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    version: "1.0.0",
    timestamp: Date.now(),
    seed: 12345,
    gameMode: "gambling",
    currentGame: null,
    floor: {
        current: 1,
        layout: null,
        enemies: [],
        items: [],
        discovered: new Set(),
        exits: []
    },
    meta: {
        totalPlayTime: 0,
        gamesPlayed: 0,
        lastSaveTime: null,
        achievements: []
    }
};

const gameSlice = createSlice({
    name: 'game',
    initialState,
    reducers: {
        initializeGame: (state, action) => {
            const { mode, seed, initialState: initState } = action.payload;
            
            state.seed = seed || Math.floor(Math.random() * 1000000);
            state.gameMode = mode || 'gambling';
            state.timestamp = Date.now();
            
            if (initState) {
                Object.assign(state, initState);
            }
        },

        changeGameMode: (state, action) => {
            const { mode } = action.payload;
            state.gameMode = mode;
            state.currentGame = null; // Clear any active game session
        },

        advanceFloor: (state, action) => {
            const { floorId } = action.payload;
            state.floor.current += 1;
            state.floor.layout = null; // Will be generated based on floor
            state.floor.enemies = [];
            state.floor.items = [];
            state.floor.discovered = new Set();
            state.floor.exits = [];
        },

        startGamblingSession: (state, action) => {
            const { gameType, initialBet, opponent } = action.payload;
            
            state.currentGame = {
                type: gameType,
                bet: initialBet,
                opponent: opponent || null,
                round: 1,
                startTime: Date.now(),
                history: []
            };
            
            state.meta.gamesPlayed += 1;
        },

        endGamblingSession: (state, action) => {
            const { result, winnings } = action.payload;
            state.currentGame = null;
        },

        placeBet: (state, action) => {
            const { amount, betType } = action.payload;
            
            if (state.currentGame) {
                state.currentGame.bet = amount;
                state.currentGame.betType = betType || 'standard';
            }
        },

        makeGamblingChoice: (state, action) => {
            const { choice, data } = action.payload;
            
            if (state.currentGame) {
                state.currentGame.history.push({
                    choice: choice,
                    data: data,
                    timestamp: Date.now()
                });
                state.currentGame.round += 1;
            }
        },

        foldGame: (state, action) => {
            if (state.currentGame) {
                state.currentGame.folded = true;
                state.currentGame.endTime = Date.now();
            }
        },

        updatePlayTime: (state, action) => {
            const { deltaTime } = action.payload;
            state.meta.totalPlayTime += deltaTime;
        },

        unlockAchievement: (state, action) => {
            const { achievementId } = action.payload;
            
            if (!state.meta.achievements.includes(achievementId)) {
                state.meta.achievements.push(achievementId);
            }
        },

        saveGame: (state, action) => {
            state.meta.lastSaveTime = Date.now();
        },

        loadGame: (state, action) => {
            const { saveData } = action.payload;
            
            try {
                const loadedState = JSON.parse(saveData);
                Object.assign(state, loadedState);
                state.timestamp = Date.now();
            } catch (error) {
                console.error('Failed to load game:', error);
            }
        }
    }
});

// Export actions
export const {
    initializeGame,
    changeGameMode,
    advanceFloor,
    saveGame,
    loadGame,
    updatePlayTime,
    unlockAchievement,
    startGamblingSession,
    endGamblingSession,
    placeBet,
    makeGamblingChoice,
    foldGame
} = gameSlice.actions;

// Selectors
export const gameSelectors = {
    getGameMode: (state) => state.game.gameMode,
    getCurrentFloor: (state) => state.game.floor.current,
    getCurrentGame: (state) => state.game.currentGame,
    isGambling: (state) => state.game.currentGame !== null,
    getGameMeta: (state) => state.game.meta,
    getPlayTime: (state) => state.game.meta.totalPlayTime,
    getAchievements: (state) => state.game.meta.achievements,
    hasAchievement: (state, achievementId) => state.game.meta.achievements.includes(achievementId),
    getGameSeed: (state) => state.game.seed,
    getFloorData: (state) => state.game.floor
};

// Export the slice reducer
export default gameSlice.reducer;