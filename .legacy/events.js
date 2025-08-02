/**
 * Event System - Core event bus for the roguelike engine
 * Pure JavaScript with no external dependencies
 */

export class EventBus {
    constructor() {
        this.listeners = new Map();
        this.recording = [];
        this.isRecording = false;
    }

    /**
     * Register an event listener
     * @param {string} eventType - The type of event to listen for
     * @param {Function} callback - The callback function to execute
     * @param {Object} options - Options like once, priority
     */
    on(eventType, callback, options = {}) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        
        const listener = {
            callback,
            once: options.once || false,
            priority: options.priority || 0,
            id: this.generateListenerId()
        };
        
        this.listeners.get(eventType).push(listener);
        
        // Sort by priority (higher priority first)
        this.listeners.get(eventType).sort((a, b) => b.priority - a.priority);
        
        return listener.id; // Return ID for removal
    }

    /**
     * Register a one-time event listener
     * @param {string} eventType - The type of event to listen for
     * @param {Function} callback - The callback function to execute
     */
    once(eventType, callback) {
        return this.on(eventType, callback, { once: true });
    }

    /**
     * Remove an event listener
     * @param {string} eventType - The type of event
     * @param {string} listenerId - The ID returned from on()
     */
    off(eventType, listenerId) {
        if (!this.listeners.has(eventType)) return;
        
        const listeners = this.listeners.get(eventType);
        const index = listeners.findIndex(l => l.id === listenerId);
        
        if (index !== -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * Emit an event to all registered listeners
     * @param {string} eventType - The type of event to emit
     * @param {*} data - The data to pass to listeners
     * @param {Object} options - Options like bubbles, cancelable
     */
    emit(eventType, data = null, options = {}) {
        const event = {
            type: eventType,
            data: data,
            timestamp: Date.now(),
            cancelled: false,
            defaultPrevented: false,
            preventDefault: function() { this.defaultPrevented = true; },
            stopPropagation: function() { this.cancelled = true; }
        };

        // Record event if recording is enabled
        if (this.isRecording) {
            this.recording.push({
                type: eventType,
                data: JSON.parse(JSON.stringify(data)), // Deep clone
                timestamp: event.timestamp
            });
        }

        // Emit to wildcard listeners first
        if (this.listeners.has('*')) {
            this._emitToListeners('*', event);
        }

        // Emit to specific event listeners
        if (this.listeners.has(eventType) && !event.cancelled) {
            this._emitToListeners(eventType, event);
        }

        return !event.defaultPrevented;
    }

    /**
     * Internal method to emit to a specific set of listeners
     * @private
     */
    _emitToListeners(eventType, event) {
        const listeners = this.listeners.get(eventType);
        if (!listeners) return;

        // Create a copy to avoid issues if listeners are modified during execution
        const listenersToExecute = [...listeners];

        for (let i = 0; i < listenersToExecute.length; i++) {
            const listener = listenersToExecute[i];
            
            try {
                listener.callback(event);
            } catch (error) {
                console.error(`Error in event listener for ${eventType}:`, error);
                // Continue executing other listeners even if one fails
            }

            // Remove one-time listeners
            if (listener.once) {
                this.off(eventType, listener.id);
            }

            // Stop if propagation was stopped
            if (event.cancelled) {
                break;
            }
        }
    }

    /**
     * Start recording all events for debugging/replay
     */
    startRecording() {
        this.isRecording = true;
        this.recording = [];
    }

    /**
     * Stop recording events
     */
    stopRecording() {
        this.isRecording = false;
    }

    /**
     * Get the recorded events
     */
    getRecording() {
        return [...this.recording]; // Return a copy
    }

    /**
     * Clear the recorded events
     */
    clearRecording() {
        this.recording = [];
    }

    /**
     * Replay a sequence of events
     * @param {Array} eventSequence - Array of events to replay
     */
    replay(eventSequence) {
        eventSequence.forEach(event => {
            this.emit(event.type, event.data);
        });
    }

    /**
     * Generate a unique listener ID
     * @private
     */
    generateListenerId() {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Remove all listeners for a specific event type
     * @param {string} eventType - The event type to clear
     */
    removeAllListeners(eventType) {
        if (eventType) {
            this.listeners.delete(eventType);
        } else {
            this.listeners.clear();
        }
    }

    /**
     * Get the number of listeners for an event type
     * @param {string} eventType - The event type to check
     */
    listenerCount(eventType) {
        const listeners = this.listeners.get(eventType);
        return listeners ? listeners.length : 0;
    }

    /**
     * Get all event types that have listeners
     */
    eventNames() {
        return Array.from(this.listeners.keys());
    }
}

// Create a default event bus instance
export const events = new EventBus();

// Common event types used throughout the game
export const EVENT_TYPES = {
    // Core game events
    GAME_START: 'GAME_START',
    GAME_PAUSE: 'GAME_PAUSE',
    GAME_RESUME: 'GAME_RESUME',
    GAME_END: 'GAME_END',
    
    // State events
    STATE_CHANGED: 'STATE_CHANGED',
    STATE_LOADED: 'STATE_LOADED',
    STATE_SAVED: 'STATE_SAVED',
    
    // Player events
    PLAYER_MOVE: 'PLAYER_MOVE',
    PLAYER_ACTION: 'PLAYER_ACTION',
    PLAYER_LEVEL_UP: 'PLAYER_LEVEL_UP',
    PLAYER_DIED: 'PLAYER_DIED',
    
    // Gambling events
    GAMBLE_STARTED: 'GAMBLE_STARTED',
    GAMBLE_RESOLVED: 'GAMBLE_RESOLVED',
    DICE_ROLLED: 'DICE_ROLLED',
    CARDS_DEALT: 'CARDS_DEALT',
    BET_PLACED: 'BET_PLACED',
    
    // UI events
    RENDER_REQUEST: 'RENDER_REQUEST',
    UI_UPDATE: 'UI_UPDATE',
    INPUT_RECEIVED: 'INPUT_RECEIVED',
    
    // System events
    ERROR: 'ERROR',
    WARNING: 'WARNING',
    DEBUG: 'DEBUG'
};
