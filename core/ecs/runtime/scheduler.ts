/**
 * Fixed-step scheduler for ECS simulation
 * Ensures consistent physics simulation regardless of frame rate
 */
export function startFixedStep(stepMs: number, tick: (dt: number) => void): () => void {
  let accumulator = 0;
  let lastTime = performance.now();
  let running = true;

  function loop() {
    if (!running) return;
    
    const now = performance.now();
    accumulator += now - lastTime;
    lastTime = now;

    // Process fixed timesteps
    while (accumulator >= stepMs) {
      tick(stepMs / 1000); // Convert to seconds
      accumulator -= stepMs;
    }

    setImmediate(loop);
  }

  loop();

  // Return cleanup function
  return () => {
    running = false;
  };
}