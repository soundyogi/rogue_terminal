import { startFixedStep } from './runtime/scheduler';
import { CommandBus, type Command } from './runtime/commands';
import { initializeWorld, getWorld, commands } from './world.becsy';
import { EventEmitter } from 'node:events';

/**
 * ECS Runtime - Clean separation between ECS simulation and Redux UI state
 * 
 * Architecture:
 * - ECS = source of truth for simulation (entities/components/systems)
 * - Command Queue for external events (spawn, move, damage, etc.)
 * - Fixed-step scheduler (60Hz) runs ECS without Redux in hot path
 * - Projections emit lightweight snapshots for Redux UI state
 */
export class ECSRuntime extends EventEmitter {
  private commandBus: CommandBus;
  private stopScheduler?: () => void;
  private isRunning = false;
  private readonly tickRate = 16.67; // 60 FPS

  constructor() {
    super();
    this.commandBus = new CommandBus();
    
    // Listen for command events for debugging
    this.commandBus.on('queued', (cmd: Command) => {
      this.emit('command_queued', cmd);
    });
  }

  async initialize(): Promise<void> {
    await initializeWorld();
    this.emit('initialized');
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    this.stopScheduler = startFixedStep(this.tickRate, (deltaTime) => {
      this.tick(deltaTime);
    });
    
    this.emit('started');
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.stopScheduler) {
      this.stopScheduler();
      this.stopScheduler = undefined;
    }
    
    this.emit('stopped');
  }

  private tick(deltaTime: number): void {
    // 1. Process all queued commands at tick boundary
    const commandsToProcess = this.commandBus.drain();
    
    for (const command of commandsToProcess) {
      try {
        this.executeCommand(command);
      } catch (error) {
        this.emit('command_error', { command, error });
      }
    }

    // 2. Run ECS systems (Becsy handles delta time internally)
    const world = getWorld();
    world.execute();

    // 3. Emit projection for Redux UI state (at lower frequency)
    if (this.shouldEmitProjection()) {
      this.emitProjection();
    }
  }

  private executeCommand(command: Command): void {
    switch (command.t) {
      case 'spawn':
        commands.spawn(command.data);
        break;
      case 'despawn':
        commands.despawn(command.data.id);
        break;
      case 'move':
        commands.move(command.data.id, command.data.x, command.data.y);
        break;
      case 'damage':
        commands.damage(command.data.id, command.data.amount);
        break;
      case 'heal':
        commands.heal(command.data.id, command.data.amount);
        break;
      default:
        throw new Error(`Unknown command type: ${(command as any).t}`);
    }
  }

  private frameCount = 0;
  private shouldEmitProjection(): boolean {
    this.frameCount++;
    // Emit projection at 10Hz (every 6 frames at 60FPS)
    return this.frameCount % 6 === 0;
  }

  private emitProjection(): void {
    const projection = commands.projectForUI();
    this.emit('projection', projection);
  }

  // Public API for command queuing
  queueCommand(command: Command): void {
    this.commandBus.push(command);
  }

  // Convenience methods
  spawnEntity(x: number, y: number, vx = 0, vy = 0, type?: string): void {
    this.queueCommand({ t: 'spawn', data: { x, y, vx, vy, type } });
  }

  despawnEntity(id: string): void {
    this.queueCommand({ t: 'despawn', data: { id } });
  }

  moveEntity(id: string, x: number, y: number): void {
    this.queueCommand({ t: 'move', data: { id, x, y } });
  }

  damageEntity(id: string, amount: number): void {
    this.queueCommand({ t: 'damage', data: { id, amount } });
  }

  healEntity(id: string, amount: number): void {
    this.queueCommand({ t: 'heal', data: { id, amount } });
  }

  // Get current state for debugging/inspection
  getCurrentProjection(): Array<{ id: string; x: number; y: number; health: number; model: string }> {
    return commands.projectForUI();
  }

  getQueueSize(): number {
    return this.commandBus.size();
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
export const ecsRuntime = new ECSRuntime();