/**
 * Deterministic Random Number Generator
 * Uses Linear Congruential Generator for reproducible randomness
 */

export class SeededRNG {
    constructor(seed = 12345) {
        this.seed = seed;
        this.current = seed;
        
        // LCG parameters (from Numerical Recipes)
        this.a = 1664525;
        this.c = 1013904223;
        this.m = Math.pow(2, 32);
    }

    /**
     * Generate next random number (0-1)
     */
    next() {
        this.current = (this.a * this.current + this.c) % this.m;
        return this.current / this.m;
    }

    /**
     * Generate random integer between min and max (inclusive)
     */
    nextInt(min = 0, max = 1) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Generate random float between min and max
     */
    nextFloat(min = 0.0, max = 1.0) {
        return this.next() * (max - min) + min;
    }

    /**
     * Generate random boolean with given probability
     */
    nextBool(probability = 0.5) {
        return this.next() < probability;
    }

    /**
     * Choose random element from array
     */
    choice(array) {
        if (array.length === 0) return undefined;
        return array[this.nextInt(0, array.length - 1)];
    }

    /**
     * Shuffle array in place using Fisher-Yates algorithm
     */
    shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /**
     * Generate weighted random choice
     */
    weightedChoice(items, weights) {
        if (items.length !== weights.length) {
            throw new Error('Items and weights arrays must have same length');
        }

        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = this.nextFloat(0, totalWeight);

        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return items[i];
            }
        }

        return items[items.length - 1]; // Fallback
    }

    /**
     * Roll dice (returns array of results)
     */
    rollDice(count, sides = 6) {
        const results = [];
        for (let i = 0; i < count; i++) {
            results.push(this.nextInt(1, sides));
        }
        return results;
    }

    /**
     * Roll single die
     */
    rollDie(sides = 6) {
        return this.nextInt(1, sides);
    }

    /**
     * Generate normal distribution using Box-Muller transform
     */
    nextGaussian(mean = 0, stdDev = 1) {
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
    reset() {
        this.current = this.seed;
        this.hasSpare = false;
    }

    /**
     * Set new seed
     */
    setSeed(seed) {
        this.seed = seed;
        this.current = seed;
        this.hasSpare = false;
    }

    /**
     * Get current state for saving
     */
    getState() {
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
    setState(state) {
        this.seed = state.seed;
        this.current = state.current;
        this.hasSpare = state.hasSpare || false;
        this.spare = state.spare || 0;
    }

    /**
     * Create a new RNG with a different seed derived from current state
     */
    fork() {
        const newSeed = this.nextInt(1, this.m - 1);
        return new SeededRNG(newSeed);
    }
}

// Utility functions for common gaming random operations
export class GameRNG {
    constructor(seed) {
        this.rng = new SeededRNG(seed);
    }

    /**
     * Simulate coin flip
     */
    coinFlip() {
        return this.rng.nextBool() ? 'heads' : 'tails';
    }

    /**
     * Roll multiple dice and return total
     */
    rollDiceSum(count, sides = 6) {
        return this.rng.rollDice(count, sides).reduce((sum, die) => sum + die, 0);
    }

    /**
     * Check if event happens based on percentage chance
     */
    percentChance(percent) {
        return this.rng.nextFloat(0, 100) < percent;
    }

    /**
     * Generate critical hit chance
     */
    criticalHit(baseChance = 5) {
        return this.percentChance(baseChance);
    }

    /**
     * Generate loot drop
     */
    lootDrop(dropChance = 10) {
        return this.percentChance(dropChance);
    }

    /**
     * Random direction (NSEW)
     */
    randomDirection() {
        return this.rng.choice(['north', 'south', 'east', 'west']);
    }

    /**
     * Random direction (8-way)
     */
    randomDirection8() {
        return this.rng.choice([
            'north', 'northeast', 'east', 'southeast',
            'south', 'southwest', 'west', 'northwest'
        ]);
    }

    /**
     * Generate damage with variance
     */
    damageRoll(baseDamage, variance = 0.2) {
        const min = baseDamage * (1 - variance);
        const max = baseDamage * (1 + variance);
        return Math.round(this.rng.nextFloat(min, max));
    }

    /**
     * Get RNG state for saving
     */
    getState() {
        return this.rng.getState();
    }

    /**
     * Restore RNG state
     */
    setState(state) {
        this.rng.setState(state);
    }
}

// Default game RNG instance
export const gameRNG = new GameRNG();
