export type CounterOptions = {
  from?: number;
  to: number;
  duration?: number;
  reducedMotion?: boolean;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
};

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

export function animateCounter({
  from = 0,
  to,
  duration = 720,
  reducedMotion = false,
  onUpdate,
  onComplete,
}: CounterOptions): () => void {
  if (reducedMotion || duration <= 0) {
    onUpdate(to);
    onComplete?.();
    return () => {};
  }

  let frame = 0;
  const start = performance.now();
  const delta = to - from;

  const tick = (now: number): void => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(progress);
    onUpdate(from + delta * eased);

    if (progress < 1) {
      frame = requestAnimationFrame(tick);
      return;
    }

    onUpdate(to);
    onComplete?.();
  };

  frame = requestAnimationFrame(tick);

  return () => cancelAnimationFrame(frame);
}
