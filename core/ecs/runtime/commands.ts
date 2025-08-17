import { EventEmitter } from 'node:events';

export type Command = 
  | { t: 'spawn'; data: { x: number; y: number; vx: number; vy: number; type?: string } }
  | { t: 'despawn'; data: { id: string } }
  | { t: 'move'; data: { id: string; x: number; y: number } }
  | { t: 'damage'; data: { id: string; amount: number } }
  | { t: 'heal'; data: { id: string; amount: number } };

export class CommandBus extends EventEmitter {
  private q: Command[] = [];

  push(cmd: Command): void {
    this.q.push(cmd);
    this.emit('queued', cmd);
  }

  drain(): Command[] {
    const commands = this.q;
    this.q = [];
    return commands;
  }

  size(): number {
    return this.q.length;
  }
}