type CounterConfig = {
  from?: number;
  to: number;
  duration?: number;
  easing?: (value: number) => number;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
};

const defaultEasing = (value: number): number => 1 - Math.pow(1 - value, 4);

export function animateCount({
  from = 0,
  to,
  duration = 900,
  easing = defaultEasing,
  onUpdate,
  onComplete,
}: CounterConfig): () => void {
  if (duration <= 0 || from === to) {
    onUpdate(to);
    onComplete?.();
    return () => undefined;
  }

  let frame = 0;
  const start = performance.now();

  const tick = (time: number) => {
    const progress = Math.min(1, (time - start) / duration);
    const eased = easing(progress);
    const value = from + (to - from) * eased;

    onUpdate(progress >= 1 ? to : value);

    if (progress < 1) {
      frame = requestAnimationFrame(tick);
      return;
    }

    onComplete?.();
  };

  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
  };
}
