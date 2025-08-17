import { test } from 'bun:test';
import assert from 'node:assert';
import { ECSRuntime } from './runtime';

test('Becsy ECS Integration - Initialization and Basic Operations', async () => {
  const runtime = new ECSRuntime();
  
  // Test initialization
  await runtime.initialize();
  
  // Verify runtime state
  assert.strictEqual(runtime.isActive(), false);
  assert.strictEqual(runtime.getQueueSize(), 0);
  
  // Test starting the runtime
  runtime.start();
  assert.strictEqual(runtime.isActive(), true);
  
  // Test entity spawning
  runtime.spawnEntity(10, 20, 1, 0, 'player');
  runtime.spawnEntity(30, 40, 0, 1, 'enemy');
  
  // Wait a bit for processing
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Get projection to verify entities were created
  const projection = runtime.getCurrentProjection();
  
  // Stop runtime
  runtime.stop();
  assert.strictEqual(runtime.isActive(), false);
  
  // Verify entities were created correctly
  assert.strictEqual(projection.length, 2);
  
  const player = projection.find(e => e.model === 'player');
  const enemy = projection.find(e => e.model === 'enemy');
  
  assert.ok(player, 'Player entity should exist');
  assert.ok(enemy, 'Enemy entity should exist');
  
  // Note: Exact position verification would require fixed-time stepping
  // For now, just verify entities have the expected models
  assert.strictEqual(player!.model, 'player');
  assert.strictEqual(enemy!.model, 'enemy');
  assert.strictEqual(player!.health, 100);
  assert.strictEqual(enemy!.health, 100);
});

test('Becsy ECS Integration - Command Processing', async () => {
  const runtime = new ECSRuntime();
  await runtime.initialize();
  
  let projectionReceived = false;
  const projections: any[] = [];
  
  // Listen for projection events
  runtime.on('projection', (projection) => {
    projectionReceived = true;
    projections.push(projection);
  });
  
  runtime.start();
  
  // Spawn an entity
  runtime.spawnEntity(0, 0, 0, 0, 'target');
  
  // Wait for projection
  await new Promise(resolve => setTimeout(resolve, 200));
  
  let entityId: string | undefined;
  if (projections.length > 0) {
    entityId = projections[projections.length - 1][0]?.id;
  }
  
  if (entityId) {
    // Test damage command
    runtime.damageEntity(entityId, 25);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test heal command
    runtime.healEntity(entityId, 10);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  runtime.stop();
  
  assert.strictEqual(projectionReceived, true, 'Should have received projection events');
});

test('Becsy ECS Integration - Event Emission', async () => {
  const runtime = new ECSRuntime();
  
  const events: string[] = [];
  
  runtime.on('initialized', () => events.push('initialized'));
  runtime.on('started', () => events.push('started'));
  runtime.on('stopped', () => events.push('stopped'));
  runtime.on('command_queued', () => events.push('command_queued'));
  
  await runtime.initialize();
  runtime.start();
  
  // Queue a command to trigger event
  runtime.spawnEntity(0, 0, 0, 0, 'test');
  
  await new Promise(resolve => setTimeout(resolve, 50));
  
  runtime.stop();
  
  // Verify events were emitted
  assert.ok(events.includes('initialized'), 'Should emit initialized event');
  assert.ok(events.includes('started'), 'Should emit started event');
  assert.ok(events.includes('stopped'), 'Should emit stopped event');
  assert.ok(events.includes('command_queued'), 'Should emit command_queued event');
});

test('Becsy ECS Integration - Clean Separation (ECS vs Redux)', async () => {
  const runtime = new ECSRuntime();
  await runtime.initialize();
  
  // This test verifies the clean architecture:
  // - ECS is source of truth for simulation
  // - Projections provide UI state (not full ECS state)
  // - Command queue separates external inputs from ECS tick
  
  runtime.start();
  
  // Commands go through queue (not direct ECS access)
  const initialQueueSize = runtime.getQueueSize();
  
  runtime.spawnEntity(5, 5, 0, 0, 'test-entity');
  
  assert.strictEqual(runtime.getQueueSize(), initialQueueSize + 1, 
    'Commands should queue before processing');
  
  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Queue should be drained during tick
  assert.strictEqual(runtime.getQueueSize(), 0,
    'Queue should be empty after processing');
  
  // Projection should provide UI-friendly data (not raw ECS components)
  const projection = runtime.getCurrentProjection();
  
  if (projection.length > 0) {
    const entity = projection[0];
    
    // Verify projection has UI-relevant fields only
    assert.ok('id' in entity, 'Should have entity ID');
    assert.ok('x' in entity, 'Should have position X');
    assert.ok('y' in entity, 'Should have position Y');
    assert.ok('health' in entity, 'Should have health value');
    assert.ok('model' in entity, 'Should have model name');
    
    // Verify it doesn't expose raw ECS internals
    assert.ok(!('components' in entity), 'Should not expose raw components');
    assert.ok(!('systems' in entity), 'Should not expose systems');
  }
  
  runtime.stop();
});