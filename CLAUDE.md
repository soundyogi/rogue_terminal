# CLAUDE.md - Roguelike Engine Documentation

## In Progress: Migration to Redux Toolkit

**Current Goal:** Migrate the custom Redux implementation to the official Redux Toolkit to improve maintainability, align with industry standards, and provide a solid foundation for future development, including a potential server-based architecture.

---

## 🎯 MISSION: Redux Toolkit Migration

We are currently in the process of migrating the engine to use **Redux Toolkit**. This will involve:
- Replacing the custom `Store` class with `configureStore`.
- Refactoring all slices to use `createSlice`.
- Converting the custom `effects` system into standard Redux thunks.
- Updating all related components and tests.

---

## Codebase Index

This document provides a comprehensive overview of the entire codebase for the Redux-based roguelike engine.

### 1. Project Structure

```
.
├── adapters/
│   └── redux-browser.js
├── content/
│   ├── actions.json
│   ├── bofjrpg/
│   │   ├── characters.json
│   │   ├── combat.json
│   │   └── transformations.json
│   ├── gamblingdeck/
│   │   ├── floors.json
│   │   ├── games.json
│   │   ├── items.json
│   │   └── opponents.json
│   ├── games/
│   │   └── gambling.json
│   ├── idlegirls/
│   │   ├── districts.json
│   │   ├── prestige.json
│   │   └── upgrades.json
│   ├── items.json
│   ├── marblemotors/
│   │   ├── components.json
│   │   ├── objectives.json
│   │   └── physics.json
│   └── scaling-curves.json
├── core/
│   ├── game.js
│   ├── middleware/
│   │   ├── eventMiddleware.js
│   │   └── thunkMiddleware.js
│   ├── rng.js
│   ├── slices/
│   │   ├── combatSlice.js
│   │   ├── gameSlice.js
│   │   ├── inputSlice.js
│   │   ├── inventorySlice.js
│   │   ├── playerSlice.js
│   │   └── uiSlice.js
│   └── store.js
├── test/
│   └── store-e2e.test.js
├── ui/
│   └── renderer.js
├── .gitignore
├── AGENT.md
├── bun.lock
├── CLAUDE.md
├── index.html
├── index.ts
├── package.json
├── README.md
└── tsconfig.json
```

### 2. Core Components

#### `core/store.js`
- **Purpose:** Implements a custom, Redux-inspired store.
- **Key Features:**
    - Manages the application state.
    - Registers slices and their reducers.
    - Applies a middleware chain (thunk, event, logging).
    - Handles action dispatching and state updates.
    - Includes a simple history mechanism for undo functionality.
- **Dependencies:** All 6 slices, `thunkMiddleware`, `eventMiddleware`, `gameRNG`.

#### `core/game.js`
- **Purpose:** A legacy component that acts as the main game instance.
- **Key Features:**
    - Initializes the Redux store.
    - Subscribes the renderer to store updates.
    - Contains the main game loop (`start`, `stop`, `update`).
    - Exposes methods for saving and loading the game state.
- **Dependencies:** `store.js`, `renderer.js`, `events.js` (legacy).

#### `core/rng.js`
- **Purpose:** Provides a seeded random number generator for deterministic randomness.
- **Key Features:**
    - `SeededRNG` class for generating random numbers.
    - `GameRNG` class with common game-related randomization functions (dice rolls, coin flips, etc.).
- **Dependencies:** None.

### 3. Middleware

#### `core/middleware/thunkMiddleware.js`
- **Purpose:** Allows action creators to return functions (thunks) for async operations.
- **Key Features:**
    - A standard, correct implementation of Redux thunk middleware.
- **Dependencies:** None.

#### `core/middleware/eventMiddleware.js`
- **Purpose:** A Redux-native event system that emits events based on actions.
- **Key Features:**
    - `createEventMiddleware` factory for creating the middleware.
    - `defaultEventMap` defines which actions trigger which events.
- **Dependencies:** None.

### 4. Slices

All slices follow a consistent structure: `name`, `initialState`, `actions`, `reducers`, `effects`, and `selectors`.

#### `core/slices/playerSlice.js`
- **Manages:** Player position, stats, health, level, and experience.

#### `core/slices/uiSlice.js`
- **Manages:** UI context, menus, log messages, and other interface state.

#### `core/slices/gameSlice.js`
- **Manages:** Core game state, game mode, floor progression, and meta-information.

#### `core/slices/inventorySlice.js`
- **Manages:** Player inventory, equipment, and item-related actions.

#### `core/slices/combatSlice.js`
- **Manages:** Battle state, attacks, turns, and combat-related data.

#### `core/slices/inputSlice.js`
- **Manages:** Input context and translates user input into Redux actions.

### 5. UI and Adapters

#### `ui/renderer.js`
- **Purpose:** Renders the game state as ASCII art in the browser or console.
- **Key Features:**
    - `ASCIIRenderer` class.
    - Renders the game world, sidebar, and menus based on the Redux state.
- **Dependencies:** `events.js` (legacy).

#### `adapters/redux-browser.js`
- **Purpose:** Connects the Redux game engine to a web browser.
- **Key Features:**
    - Initializes the game and renderer.
    - Sets up DOM elements and input listeners.
    - Translates browser events (key presses, clicks) into Redux actions.
- **Dependencies:** `game.js`, `renderer.js`, `inputSlice.js`.

### 6. Entry Point and Testing

#### `index.ts`
- **Purpose:** The main entry point for the application.
- **Key Features:**
    - Initializes and starts the `ReduxBrowserAdapter`.
- **Dependencies:** `redux-browser.js`.

#### `test/store-e2e.test.js`
- **Purpose:** End-to-end tests for the Redux store and slices.
- **Key Features:**
    - Uses `tape` for testing.
    - Verifies slice integration, effects, selectors, and core game flows.
- **Dependencies:** `store.js`, all slices.

### 7. Content
The `content/` directory contains all the game data in JSON format, organized by game mode. This includes actions, items, characters, and more, making the engine highly data-driven.
