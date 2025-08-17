import { World, System, component, field, Type, system } from '@lastolivegames/becsy';
import type { Command } from './runtime/commands';

// Core Game Components
@component 
class Position {
  @field.float64 declare x: number;
  @field.float64 declare y: number;
  @field.float64 declare z: number;
}

@component
class Velocity {
  @field.float64 declare vx: number;
  @field.float64 declare vy: number;
}

@component
class Health {
  @field.int32 declare current: number;
  @field.int32 declare max: number;
}

@component
class NetworkEntity {
  @field.dynamicString(50) declare entityId: string;
  @field({ type: Type.boolean, default: false }) declare needsBroadcast: boolean;
}

@component
class RenderData {
  @field.dynamicString(32) declare model: string;
  @field({ type: Type.boolean, default: true }) declare visible: boolean;
  @field.float64 declare scale: number;
}

// Core Systems
@system
class MovementSystem extends System {
  entities = this.query(q => q.current.with(Position).write.and.with(Velocity).read);

  override execute(): void {
    for (const entity of this.entities.current) {
      const velocity = entity.read(Velocity);
      const position = entity.write(Position);
      
      position.x += velocity.vx * this.delta;
      position.y += velocity.vy * this.delta;
    }
  }
}

@system
class NetworkSystem extends System {
  networkEntities = this.query(q => q.current.with(NetworkEntity).write);

  override execute(): void {
    // Mark entities that need broadcasting
    for (const entity of this.networkEntities.current) {
      const networkComp = entity.write(NetworkEntity);
      networkComp.needsBroadcast = true;
    }
  }
}

// Command Processing System - owns queries for entity operations
@system(s => s.inAnyOrderWith(MovementSystem))
class CommandSystem extends System {
  networkEntities = this.query(q => q.current.with(NetworkEntity).read);
  networkPosition = this.query(q => q.current.with(NetworkEntity).read.and.with(Position).write);
  networkHealth = this.query(q => q.current.with(NetworkEntity).read.and.with(Health).write);
  
  override execute(): void {
    // This system doesn't run during world.execute(), it's used for command processing
  }
  
  findEntityById(id: string) {
    for (const entity of this.networkEntities.current) {
      const networkComp = entity.read(NetworkEntity);
      if (networkComp.entityId === id) {
        return entity;
      }
    }
    return null;
  }
  
  findPositionEntityById(id: string) {
    for (const entity of this.networkPosition.current) {
      const networkComp = entity.read(NetworkEntity);
      if (networkComp.entityId === id) {
        return entity;
      }
    }
    return null;
  }
  
  findHealthEntityById(id: string) {
    for (const entity of this.networkHealth.current) {
      const networkComp = entity.read(NetworkEntity);
      if (networkComp.entityId === id) {
        return entity;
      }
    }
    return null;
  }
}

// Projection System - owns query for UI state
@system
class ProjectionSystem extends System {
  projectionEntities = this.query(q =>
    q.current.with(Position).read
      .and.with(Health).read
      .and.with(NetworkEntity).read
      .and.with(RenderData).read
  );
  
  override execute(): void {
    // This system doesn't run during world.execute(), it's used for UI projection
  }
  
  getProjection(limit = 200): Array<{ id: string; x: number; y: number; health: number; model: string }> {
    const results: Array<{ id: string; x: number; y: number; health: number; model: string }> = [];
    
    let count = 0;
    for (const entity of this.projectionEntities.current) {
      if (count >= limit) break;
      
      const position = entity.read(Position);
      const health = entity.read(Health);
      const network = entity.read(NetworkEntity);
      const render = entity.read(RenderData);
      
      results.push({
        id: network.entityId,
        x: position.x,
        y: position.y,
        health: health.current,
        model: render.model
      });
      
      count++;
    }
    
    return results;
  }
}

// Singleton systems that we can access directly
let commandSystemInstance: CommandSystem;
let projectionSystemInstance: ProjectionSystem;

// System Manager - captures system instances during initialization
@system
class SystemManager extends System {
  private commandSystem = this.attach(CommandSystem);
  private projectionSystem = this.attach(ProjectionSystem);
  
  override initialize(): void {
    // Capture system instances for external access
    commandSystemInstance = this.commandSystem;
    projectionSystemInstance = this.projectionSystem;
  }
  
  override execute(): void {
    // This system doesn't run during world.execute()
  }
}

// World instance
let world: World;

export const initializeWorld = async () => {
  world = await World.create({
    defs: [Position, Velocity, Health, NetworkEntity, RenderData, MovementSystem, NetworkSystem, CommandSystem, ProjectionSystem, SystemManager]
  });
  
  return world;
};

export const getWorld = () => world;

// Command handlers - use the captured system instances
export const commands = {
  spawn({ x, y, vx, vy, type }: { x: number; y: number; vx: number; vy: number; type?: string }) {
    const entityId = `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    world.createEntity(
      Position, { x, y, z: 0 },
      Velocity, { vx, vy },
      Health, { current: 100, max: 100 },
      NetworkEntity, { entityId, needsBroadcast: true },
      RenderData, { model: type || 'default', visible: true, scale: 1.0 }
    );
    
    return entityId;
  },

  despawn(id: string) {
    const entity = commandSystemInstance.findEntityById(id);
    if (entity) {
      entity.delete();
    }
  },

  move(id: string, x: number, y: number) {
    const entity = commandSystemInstance.findPositionEntityById(id);
    if (entity) {
      const position = entity.write(Position);
      position.x = x;
      position.y = y;
    }
  },

  damage(id: string, amount: number) {
    const entity = commandSystemInstance.findHealthEntityById(id);
    if (entity) {
      const health = entity.write(Health);
      health.current = Math.max(0, health.current - amount);
    }
  },

  heal(id: string, amount: number) {
    const entity = commandSystemInstance.findHealthEntityById(id);
    if (entity) {
      const health = entity.write(Health);
      health.current = Math.min(health.max, health.current + amount);
    }
  },

  // UI Projection - gets lightweight data for Redux UI state
  projectForUI(limit = 200): Array<{ id: string; x: number; y: number; health: number; model: string }> {
    return projectionSystemInstance.getProjection(limit);
  }
};

export { Position, Velocity, Health, NetworkEntity, RenderData, MovementSystem, NetworkSystem, CommandSystem, ProjectionSystem, SystemManager };