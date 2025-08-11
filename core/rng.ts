/**
 * Deterministic Random Number Generator
 * Uses Linear Congruential Generator for reproducible randomness
 * Migrated to TypeScript
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RNGState {
  seed: number;
  current: number;
  hasSpare: boolean;
  spare: number;
}

export type Direction4 = 'north' | 'south' | 'east' | 'west';
export type Direction8 = 'north' | 'northeast' | 'east' | 'southeast' | 'south' | 'southwest' | 'west' | 'northwest';
export type CoinFlipResult = 'heads' | 'tails';

// ============================================================================
// SEEDED RNG CLASS
// ============================================================================

export class SeededRNG {
  private seed: number;
  private current: number;
  private hasSpare: boolean = false;
  private spare: number = 0;
  
  // LCG parameters (from Numerical Recipes)
  private readonly a: number = 1664525;
  private readonly c: number = 1013904223;
  private readonly m: number = Math.pow(2, 32);

  constructor(seed: number = 12345) {
    this.seed = seed;
    this.current = seed;
  }

  /**
   * Generate next random number (0-1)
   */
  next(): number {
    this.current = (this.a * this.current + this.c) % this.m;
    return this.current / this.m;
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  nextInt(min: number = 0, max: number = 1): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random float between min and max
   */
  nextFloat(min: number = 0.0, max: number = 1.0): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Generate random boolean with given probability
   */
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /**
   * Choose random element from array
   */
  choice<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.nextInt(0, array.length - 1)];
  }

  /**
   * Shuffle array in place using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      const temp = result[i]!;
      result[i] = result[j]!;
      result[j] = temp;
    }
    return result;
  }

  /**
   * Generate weighted random choice
   */
  weightedChoice<T>(items: T[], weights: number[]): T {
    if (items.length !== weights.length) {
      throw new Error('Items and weights arrays must have same length');
    }
    if (items.length === 0) {
      throw new Error('Items array cannot be empty');
    }

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = this.nextFloat(0, totalWeight);

    for (let i = 0; i < items.length; i++) {
      const weight = weights[i]!;
      random -= weight;
      if (random <= 0) {
        return items[i]!;
      }
    }

    return items[items.length - 1]!; // Fallback
  }

  /**
   * Roll dice (returns array of results)
   */
  rollDice(count: number, sides: number = 6): number[] {
    const results: number[] = [];
    for (let i = 0; i < count; i++) {
      results.push(this.nextInt(1, sides));
    }
    return results;
  }

  /**
   * Roll single die
   */
  rollDie(sides: number = 6): number {
    return this.nextInt(1, sides);
  }

  /**
   * Generate normal distribution using Box-Muller transform
   */
  nextGaussian(mean: number = 0, stdDev: number = 1): number {
    if (this.hasSpare) {
      this.hasSpare = false;
      return this.spare * stdDev + mean;
    }

    this.hasSpare = true;
    const u = this.next();
    const v = this.next();
    const mag = stdDev * Math.sqrt(-2.0 * Math.log(u));
    this.spare = mag * Math.cos(2.0 * Math.PI * v);
    return mag * Math.sin(2.0 * Math.PI * v) + mean;
  }

  /**
   * Reset RNG to original seed
   */
  reset(): void {
    this.current = this.seed;
    this.hasSpare = false;
  }

  /**
   * Set new seed
   */
  setSeed(seed: number): void {
    this.seed = seed;
    this.current = seed;
    this.hasSpare = false;
  }

  /**
   * Get current state for saving
   */
  getState(): RNGState {
    return {
      seed: this.seed,
      current: this.current,
      hasSpare: this.hasSpare || false,
      spare: this.spare || 0
    };
  }

  /**
   * Restore state from save
   */
  setState(state: RNGState): void {
    this.seed = state.seed;
    this.current = state.current;
    this.hasSpare = state.hasSpare || false;
    this.spare = state.spare || 0;
  }

  /**
   * Create a new RNG with a different seed derived from current state
   */
  fork(): SeededRNG {
    const newSeed = this.nextInt(1, this.m - 1);
    return new SeededRNG(newSeed);
  }
}

// ============================================================================
// GAME RNG CLASS
// ============================================================================

/**
 * Utility functions for common gaming random operations
 */
export class GameRNG {
  private rng: SeededRNG;

  constructor(seed?: number) {
    this.rng = new SeededRNG(seed);
  }

  /**
   * Simulate coin flip
   */
  coinFlip(): CoinFlipResult {
    return this.rng.nextBool() ? 'heads' : 'tails';
  }

  /**
   * Roll multiple dice and return total
   */
  rollDiceSum(count: number, sides: number = 6): number {
    return this.rng.rollDice(count, sides).reduce((sum, die) => sum + die, 0);
  }

  /**
   * Check if event happens based on percentage chance
   */
  percentChance(percent: number): boolean {
    return this.rng.nextFloat(0, 100) < percent;
  }

  /**
   * Generate critical hit chance
   */
  criticalHit(baseChance: number = 5): boolean {
    return this.percentChance(baseChance);
  }

  /**
   * Generate loot drop
   */
  lootDrop(dropChance: number = 10): boolean {
    return this.percentChance(dropChance);
  }

  /**
   * Random direction (NSEW)
   */
  randomDirection(): Direction4 {
    return this.rng.choice(['north', 'south', 'east', 'west']) as Direction4;
  }

  /**
   * Random direction (8-way)
   */
  randomDirection8(): Direction8 {
    return this.rng.choice([
      'north', 'northeast', 'east', 'southeast',
      'south', 'southwest', 'west', 'northwest'
    ]) as Direction8;
  }

  /**
   * Generate damage with variance
   */
  damageRoll(baseDamage: number, variance: number = 0.2): number {
    const min = baseDamage * (1 - variance);
    const max = baseDamage * (1 + variance);
    return Math.round(this.rng.nextFloat(min, max));
  }

  /**
   * Get RNG state for saving
   */
  getState(): RNGState {
    return this.rng.getState();
  }

  /**
   * Restore RNG state
   */
  setState(state: RNGState): void {
    this.rng.setState(state);
  }

  /**
   * Access the underlying SeededRNG for advanced operations
   */
  getRNG(): SeededRNG {
    return this.rng;
  }

  /**
   * Set new seed
   */
  setSeed(seed: number): void {
    this.rng.setSeed(seed);
  }

  /**
   * Reset to original seed
   */
  reset(): void {
    this.rng.reset();
  }

  /**
   * Create a fork of this RNG with a different seed
   */
  fork(): GameRNG {
    const forkedRNG = this.rng.fork();
    const newGameRNG = new GameRNG();
    newGameRNG.rng = forkedRNG;
    return newGameRNG;
  }
}

// ============================================================================
// DEFAULT INSTANCE
// ============================================================================

/**
 * Default game RNG instance
 */
export const gameRNG = new GameRNG();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a new seeded RNG instance
 */
export const createRNG = (seed?: number): SeededRNG => new SeededRNG(seed);

/**
 * Create a new game RNG instance
 */
export const createGameRNG = (seed?: number): GameRNG => new GameRNG(seed);

/**
 * Quick random integer between min and max using default RNG
 */
export const randomInt = (min: number, max: number): number => {
  return gameRNG.getRNG().nextInt(min, max);
};

/**
 * Quick random float between min and max using default RNG
 */
export const randomFloat = (min: number, max: number): number => {
  return gameRNG.getRNG().nextFloat(min, max);
};

/**
 * Quick random boolean using default RNG
 */
export const randomBool = (probability: number = 0.5): boolean => {
  return gameRNG.getRNG().nextBool(probability);
};

/**
 * Quick random choice from array using default RNG
 */
export const randomChoice = <T>(array: T[]): T | undefined => {
  return gameRNG.getRNG().choice(array);
};

/**
 * Quick percentage chance check using default RNG
 */
export const percentChance = (percent: number): boolean => {
  return gameRNG.percentChance(percent);
};