/**
 * Game Slice - Manages core game state, mode, progression, and meta information
 * Migrated to Redux Toolkit with TypeScript
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  GameState,
  InitializeGamePayload,
  ChangeGameModePayload,
  AdvanceFloorPayload,
  StartGamblingSessionPayload,
  EndGamblingSessionPayload,
  PlaceBetPayload,
  MakeGamblingChoicePayload,
  UpdatePlayTimePayload,
  UnlockAchievementPayload,
  LoadGamePayload,
  RootState
} from '../types.js';

const initialState: GameState = {
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
    initializeGame: (state, action: PayloadAction<InitializeGamePayload>) => {
      const { mode, seed, initialState: initState } = action.payload;
      
      state.seed = seed || Math.floor(Math.random() * 1000000);
      state.gameMode = mode || 'gambling';
      state.timestamp = Date.now();
      
      if (initState) {
        Object.assign(state, initState);
      }
    },

    changeGameMode: (state, action: PayloadAction<ChangeGameModePayload>) => {
      const { mode } = action.payload;
      state.gameMode = mode;
      state.currentGame = null; // Clear any active game session
    },

    advanceFloor: (state, action: PayloadAction<AdvanceFloorPayload>) => {
      const { floorId } = action.payload;
      state.floor.current += 1;
      state.floor.layout = null; // Will be generated based on floor
      state.floor.enemies = [];
      state.floor.items = [];
      state.floor.discovered = new Set();
      state.floor.exits = [];
    },

    startGamblingSession: (state, action: PayloadAction<StartGamblingSessionPayload>) => {
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

    endGamblingSession: (state, action: PayloadAction<EndGamblingSessionPayload>) => {
      const { result, winnings } = action.payload;
      state.currentGame = null;
    },

    placeBet: (state, action: PayloadAction<PlaceBetPayload>) => {
      const { amount, betType } = action.payload;
      
      if (state.currentGame) {
        state.currentGame.bet = amount;
        state.currentGame.betType = betType || 'standard';
      }
    },

    makeGamblingChoice: (state, action: PayloadAction<MakeGamblingChoicePayload>) => {
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

    foldGame: (state) => {
      if (state.currentGame) {
        state.currentGame.folded = true;
        state.currentGame.endTime = Date.now();
      }
    },

    updatePlayTime: (state, action: PayloadAction<UpdatePlayTimePayload>) => {
      const { deltaTime } = action.payload;
      state.meta.totalPlayTime += deltaTime;
    },

    unlockAchievement: (state, action: PayloadAction<UnlockAchievementPayload>) => {
      const { achievementId } = action.payload;
      
      if (!state.meta.achievements.includes(achievementId)) {
        state.meta.achievements.push(achievementId);
      }
    },

    saveGame: (state) => {
      state.meta.lastSaveTime = Date.now();
    },

    loadGame: (state, action: PayloadAction<LoadGamePayload>) => {
      const { saveData } = action.payload;
      
      try {
        const loadedState = JSON.parse(saveData);
        Object.assign(state, loadedState);
        state.timestamp = Date.now();
        
        // Handle non-serializable Set objects
        if (loadedState.floor?.discovered && Array.isArray(loadedState.floor.discovered)) {
          state.floor.discovered = new Set(loadedState.floor.discovered);
        }
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

// Typed selectors
export const gameSelectors = {
  getGameMode: (state: RootState): string => state.game.gameMode,
  getCurrentFloor: (state: RootState): number => state.game.floor.current,
  getCurrentGame: (state: RootState) => state.game.currentGame,
  isGambling: (state: RootState): boolean => state.game.currentGame !== null,
  getGameMeta: (state: RootState) => state.game.meta,
  getPlayTime: (state: RootState): number => state.game.meta.totalPlayTime,
  getAchievements: (state: RootState): string[] => state.game.meta.achievements,
  hasAchievement: (state: RootState, achievementId: string): boolean => 
    state.game.meta.achievements.includes(achievementId),
  getGameSeed: (state: RootState): number => state.game.seed,
  getFloorData: (state: RootState) => state.game.floor,
  getDiscoveredTiles: (state: RootState): Set<string> => state.game.floor.discovered,
  isFloorTileDiscovered: (state: RootState, x: number, y: number): boolean => 
    state.game.floor.discovered.has(`${x},${y}`),
  getGameVersion: (state: RootState): string => state.game.version,
  getGameTimestamp: (state: RootState): number => state.game.timestamp
};

// Export the slice reducer
export default gameSlice.reducer;