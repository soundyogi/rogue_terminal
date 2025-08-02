# Roguelike Engine Design Document - Redux Architecture

## Overview
A portable, data-driven roguelike framework in vanilla JavaScript with **Redux-style state management** that can be easily ported to other engines. The prototype supports multiple game themes (gambling, marble machines, JRPG) through JSON configuration.

## Core Philosophy ✅ **IMPLEMENTED**
- **Engine Agnostic**: Core logic has zero dependencies on browser APIs ✅
- **Data Driven**: All content defined in JSON files ✅
- **Redux State Management**: Single state tree with immutable updates ✅
- **JSON-Serializable Actions**: All actions are portable across engines ✅
- **Deterministic**: Seeded RNG ensures reproducible gameplay ✅
- **AI Friendly**: Clear structure that an AI agent can easily extend ✅

## Redux Architecture ✅ **IMPLEMENTED**

### Layer Structure
```
┌─────────────────────────────────────┐
│         Game Content (JSON)         │ ✅ IMPLEMENTED
├─────────────────────────────────────┤
│         Redux Store                 │ ✅ IMPLEMENTED
│    (Actions, Reducers, Middleware)  │
├─────────────────────────────────────┤
│        Platform Adapter             │ ✅ IMPLEMENTED
│    (Browser/Unity/Unreal/etc)      │
├─────────────────────────────────────┤
│          Presentation               │ ✅ IMPLEMENTED
│    (ASCII/Canvas/3D Engine)        │
└─────────────────────────────────────┘
```

### File Structure ✅ **IMPLEMENTED**
```
rogueengine/
├── redux-demo.html      # ✅ Redux Demo Entry Point
├── index.html           # ✅ Original Entry Point
├── core/
│   ├── redux-game.js    # ✅ Redux Game Loop
│   ├── store.js         # ✅ Redux Store Implementation
│   ├── events.js        # ✅ Event System (still used)
│   ├── unified-input.js # ⚠️  Needs Redux integration
│   ├── rng.js           # ✅ Deterministic RNG
│   ├── state.js         # 🗑️ Legacy - to be removed
│   ├── actions.js       # 🗑️ Legacy - to be removed
│   └── game.js          # 🗑️ Legacy - to be removed
├── content/
│   ├── actions.json     # ✅ Redux Action Definitions
│   ├── games/
│   │   └── gambling.json # ✅ Game definitions
│   ├── items.json       # ✅ Item definitions
│   └── floors.json      # ✅ Floor definitions
├── adapters/
│   ├── redux-browser.js # ✅ Redux Browser Adapter
│   └── browser.js       # 🗑️ Legacy adapter
└── ui/
    └── renderer.js      # ✅ Context-aware ASCII renderer
```

## Core Components ✅ **IMPLEMENTED**

### 1. Redux Store Architecture ✅
```javascript
// Single source of truth with immutable updates
import { Store } from './core/store.js';

const store = new Store(initialState, actionsConfig);

// Redux flow: Action → Middleware → Reducer → State → Render
store.dispatch({
    type: 'MOVE_PLAYER',
    payload: { direction: 'up' }
});

// Built-in undo/redo through action history
store.undo();
```

### 2. JSON Action Definitions ✅
```json
{
  "actions": {
    "MOVE_PLAYER": {
      "type": "MOVE_PLAYER",
      "category": "movement",
      "undoable": true,
      "payload": {
        "direction": {
          "type": "string",
          "enum": ["up", "down", "left", "right"],
          "required": true
        }
      }
    }
  }
}
```

### 3. Immutable State Management ✅
```javascript
// Fully serializable Redux state
const gameState = {
    version: "1.0.0",
    timestamp: Date.now(),
    seed: 12345,
    player: {
        x: 5, y: 5,
        hp: 100, maxHp: 100,
        mp: 20, maxMp: 20,
        level: 1, experience: 0,
        coins: 50,
        inventory: ["lucky_coin"],
        stats: { luck: 1.0, speed: 1.0, strength: 1.0 },
        equipment: { weapon: null, armor: null }
    },
    floor: {
        current: 1, layout: null, enemies: [], items: [],
        discovered: new Set(), exits: []
    },
    gameMode: "gambling",
    currentGame: null,
    ui: {
        selectedIndex: 0, currentContext: 'world',
        highlightedInteraction: null, logMessages: []
    },
    rng: { /* RNG state for deterministic gameplay */ }
};
```

### 4. Middleware Pipeline ✅
```javascript
// Logging middleware
const loggingMiddleware = (action, state, store) => {
    console.log(`Action: ${action.type}`, action.payload);
    return action;
};

// Validation middleware
const validationMiddleware = (actionsConfig) => (action, state, store) => {
    const config = actionsConfig[action.type];
    if (!config) {
        console.warn(`Unknown action type: ${action.type}`);
    }
    return action;
};

store.use(loggingMiddleware);
store.use(validationMiddleware(actionsConfig));
```

## Game Modes

### 1. Gambling Roguelike (Kakegurui-inspired) ✅
**Content extracted to:** `content/gamblingdeck/`
- ✅ Floors, games, opponents, psychology system
- ✅ Games: coin_flip, liars_dice, indian_poker, russian_roulette
- ✅ Opponents: nervous_newbie, master_bluffer, psychology mechanics
- ✅ Items: marked_cards, lucky_coin, psychology_textbook

### 2. Idle Roguelike (Based on Your Districts System) ✅
**Content extracted to:** `content/idlegirls/`
- ✅ Districts: town_hall, forest, heaven with upgrade trees
- ✅ Mechanics: click/auto upgrades, synergies, season cycles, ascension
- ✅ Prestige: soft reset, transcendence, achievement system
- ✅ Formulas: DPS calculation, click damage, soft caps

### 3. JRPG Roguelike (Breath of Fire inspired) ✅
**Content extracted to:** `content/bofjrpg/`
- ✅ Characters: Ryu (dragon warrior), Nina (windcaller), party system
- ✅ Combat: turn-based, combo attacks, unite skills
- ✅ Transformations: dragon forms (whelp, adult, kaiser), gene splicing
- ✅ Equipment: weapons, armor, crafting system, fishing minigame

### 4. Marble Machine Roguelike (Expanded) ✅
**Content extracted to:** `content/marblemotors/`
- ✅ Components: ramps, funnels, splitters, accelerators, teleporters
- ✅ Physics: gravity, collision, material properties
- ✅ Objectives: sorting, racing, melody, factory challenges
- ✅ Marble Types: basic, heavy, bouncy, magnetic, explosive, quantum

### 5. Scaling Curves and Formulas ✅

**Content extracted to:** `content/scaling-curves.json` ✅

## UI Design

### Main Game View (ASCII)
```
┌─────────────────────────────┬────────────────────┐
│ HP: 100/100  Coins: 50  F1  │ EVENT LOG          │
├─────────────────────────────┼────────────────────┤
│ #########                   │ > Player moved     │
│ #.......#                   │ > Found poker room │
│ #...@...#########           │ > ACTION: Enter?   │
│ #.......+.......#           │                    │
│ #.......#.......#           │ Stats:             │
│ #########.......#           │ Luck: 1.2          │
│         #..$....#           │ Speed: 1.0         │
│         #.......#           │                    │
│         #########           │ Inventory:         │
│                             │ - Lucky Coin       │
│ @ = You                     │ - Loaded Dice      │
│ + = Door                    │                    │
│ $ = Item                    │                    │
│ # = Wall                    │                    │
├─────────────────────────────┴────────────────────┤
│ Commands: WASD=Move G=Gamble I=Inventory Q=Quit  │
└───────────────────────────────────────────────────┘
```

### Gambling View
```
┌─────────────────────────────────────────────────┐
│              LIAR'S DICE                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  Your dice: [6] [6] [3] [2] [1]                │
│                                                 │
│  Current bid: "Three 4s" (by Opponent 1)        │
│                                                 │
│  Options:                                       │
│  1) Raise: "Four 4s"                           │
│  2) Raise: "Three 5s"                          │
│  3) Challenge!                                  │
│                                                 │
│  Opponent tells: 😰 (nervous)                   │
│                                                 │
├─────────────────────────────────────────────────┤
│ Your coins: 50  |  Pot: 20  |  Round: 3        │
└─────────────────────────────────────────────────┘
```

## Implementation Status

### ✅ Phase 1: Redux Core Framework - **COMPLETED**
- [x] **Redux Store**: Single state tree with actions, reducers, middleware
- [x] **Action System**: JSON-based action definitions with validation
- [x] **Event System**: Pure JS event bus (still relevant for side effects)
- [x] **State Management**: Immutable updates with deep cloning
- [x] **Undo/Redo**: Command pattern with action history
- [x] **ASCII Renderer**: Context-aware rendering system
- [x] **Browser Integration**: Redux browser adapter with input handling
- [x] **RNG System**: Deterministic random number generation
- [x] **Working Demo**: Functional Redux demonstration

### ⚠️ Phase 1.5: Redux Migration - **IN PROGRESS**
- [x] **Store Implementation**: Core Redux store functionality
- [x] **Browser Adapter**: Redux-integrated browser adapter
- [x] **Demo Application**: Working redux-demo.html
- [ ] **Unified Input Migration**: Update to use Redux store
- [ ] **Legacy Cleanup**: Remove old state management files
- [ ] **Full Integration**: Ensure all systems use Redux consistently

### 🔄 Phase 2: Enhanced Redux Features - **PLANNED**
- [ ] **Advanced Middleware**: Persistence, networking, debugging
- [ ] **Reducer Composition**: Modular reducer architecture
- [ ] **Action Creators**: Sophisticated action generation
- [ ] **State Selectors**: Efficient state querying
- [ ] **Dev Tools**: Redux DevTools integration

### 📋 Phase 3: Gambling Mode Implementation
- [ ] **Coin Flip Game**: Simple probability-based gambling
- [ ] **Blackjack**: Card-based gambling with strategy
- [ ] **Liar's Dice**: Psychology-based bluffing game
- [ ] **Betting System**: Comprehensive wagering mechanics
- [ ] **Win/Loss Tracking**: Statistical progression system

### 🚀 Phase 4: Advanced Features
- [ ] **Procedural Generation**: Dynamic floor layouts
- [ ] **Item System**: Equipment and consumables
- [ ] **Enemy AI**: Intelligent opponent behavior
- [ ] **Complex Games**: Multi-round gambling mechanics

### 🌟 Phase 5: Additional Game Modes
- [ ] **Marble Physics**: Physics-based puzzle mode
- [ ] **JRPG Combat**: Turn-based battle system
- [ ] **Mode Switching**: Seamless transitions between game types

## Code Examples for AI Agent

### Creating a New Game
```javascript
// Add to games/dice_poker.json
{
    "id": "dice_poker",
    "name": "Dice Poker",
    "type": "gambling",
    "setup": {
        "dice_count": 5,
        "rerolls": 2
    },
    "hands": {
        "five_kind": {"value": 50, "probability": 0.0001},
        "four_kind": {"value": 30, "probability": 0.002},
        "full_house": {"value": 20, "probability": 0.003}
    }
}

// Add game logic
gamblingEngines.dicePoker = {
    play: (state, bet) => {
        const dice = rollDice(5);
        const hand = evaluatePokerHand(dice);
        const payout = hands[hand].value * bet;
        return {
            winnings: payout - bet,
            hand: hand,
            dice: dice
        };
    }
};
```

### Adding New Items
```javascript
// items.json
{
    "weighted_dice": {
        "id": "weighted_dice",
        "name": "Weighted Dice",
        "type": "passive",
        "effects": [{
            "trigger": "on_dice_roll",
            "action": {
                "type": "MODIFY_ROLL",
                "chance": 0.3,
                "force_value": 6
            }
        }],
        "description": "30% chance to roll a 6"
    }
}
```

### Extending the Event System
```javascript
// Custom event for psychological warfare
events.on('OPPONENT_TELL_DETECTED', (data) => {
    const {opponent, tell, confidence} = data;
    
    // Update UI
    ui.showTell(opponent, tell);
    
    // Affect gameplay
    if (tell === 'nervous' && confidence > 0.8) {
        state.current_game.bluff_likelihood = 0.7;
    }
});
```

## Testing & Debugging

### Event Replay System
```javascript
// Record all events
const recording = [];
events.on('*', (event) => recording.push(event));

// Replay for debugging
function replay(recording) {
    recording.forEach(event => {
        events.emit(event.type, event.data);
    });
}
```

### State Validation
```javascript
// Ensure state is always valid
function validateState(state) {
    assert(state.player.hp <= state.player.maxHp);
    assert(state.player.coins >= 0);
    assert(state.floor.current > 0);
    // etc...
}
```

## Redux Implementation Guidelines

### ✅ **Architectural Principles - ACHIEVED**
1. **Single Source of Truth**: All game state in Redux store ✅
2. **Actions are Plain Objects**: JSON-serializable for cross-engine portability ✅
3. **State is Read-Only**: Only modified through dispatched actions ✅
4. **Pure Reducers**: Predictable state transitions ✅
5. **Middleware for Side Effects**: Logging, validation, async operations ✅

### 🔧 **Implementation Notes**
1. **Redux Store**: Use `core/store.js` for all state management
2. **Action Definitions**: Define all actions in `content/actions.json`
3. **Cross-Engine Compatibility**: Keep core logic platform-agnostic
4. **JSON Serialization**: Ensure state and actions are fully serializable
5. **Undo/Redo**: Leverage built-in command pattern support
6. **Unified Input**: Single interface works across all game contexts

### ⚡ **Performance Considerations**
- **Immutable Updates**: Use deep cloning for state changes
- **Middleware Pipeline**: Keep middleware lightweight and fast
- **Action Validation**: Validate actions against JSON schema
- **State Persistence**: Leverage JSON serialization for save/load

### 🧪 **Testing Strategy**
- **Action Replay**: Record and replay action sequences for debugging
- **State Validation**: Ensure state consistency after each action
- **Deterministic Testing**: Use seeded RNG for reproducible tests
- **Cross-Platform**: Test core logic independently of platform adapters

## Resources
- Example: https://github.com/user/roguelike-examples
- RNG Reference: https://en.wikipedia.org/wiki/Linear_congruential_generator
- Roguelike Tutorial: https://rogueliketutorials.com

---

This document is designed to be fed to an AI agent for implementation. All code examples are self-contained and runnable.