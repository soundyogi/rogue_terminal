# Roguelike Engine

A TypeScript-based multi-genre game engine built with Redux Toolkit, featuring gambling mechanics, RPG elements, and idle game systems.

## 🎮 Features

- **Multi-Genre Gaming**: Supports gambling, RPG, and idle game mechanics
- **TypeScript + Redux Toolkit**: Fully typed state management with industry-standard patterns
- **Data-Driven Design**: JSON-configured actions, items, floors, and game content
- **Comprehensive Testing**: 22 tests covering all core functionality
- **Terminal & Browser Modes**: Flexible rendering for different platforms

## 🚀 Quick Start

### Install dependencies:
```bash
bun install
```

### Run the terminal demo:
```bash
bun run index.ts
```

### Run tests:
```bash
bun test
# or
bun run test:e2e
```

### Development:
```bash
bun run dev
```

## 🏗️ Architecture

- **Core Engine**: TypeScript-based game logic with Redux Toolkit state management
- **Event System**: Comprehensive middleware for game events and actions
- **Game Data**: JSON schemas for items, floors, enemies, and scaling curves
- **Modular Design**: Separate slices for player, combat, inventory, UI, and game state

## 📁 Project Structure

```
core/
├── types.ts          # TypeScript interfaces and types
├── store.ts          # Redux Toolkit store configuration
├── game.ts           # Main game controller
├── events.ts         # Event system
├── slices/           # Redux slices for different game systems
└── middleware/       # Custom Redux middleware

data/
├── actions.json      # Game action definitions
├── items.json        # Item database
├── scaling-curves.json # Mathematical progression formulas
└── [game-modes]/     # Game-specific data (gambling, RPG, etc.)
```

## 🎯 Game Modes

- **Gambling**: Card games, dice games, betting mechanics
- **RPG**: Combat, inventory, character progression
- **Idle**: Offline progression, automation, prestige systems

## 🧪 Testing

The engine includes comprehensive end-to-end tests covering:
- Redux Toolkit integration
- State management
- Action creators
- Game logic validation

## 🛠️ Built With

- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [Redux Toolkit](https://redux-toolkit.js.org/) - State management
- [Bun](https://bun.sh) - Fast JavaScript runtime and package manager
- [Tape](https://github.com/tape-testing/tape) - Simple testing framework

This project was created using `bun init` and migrated to TypeScript with Redux Toolkit integration.
