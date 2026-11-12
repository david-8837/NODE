export type EntrancePhase = 'waiting' | 'entering' | 'complete';

export interface EntranceMotionOptions {
  delay?: number;
  duration?: number;
  offsetY?: number;
  initialScale?: number;
  fadeOnly?: boolean;
}

export function getEntranceMotionProps(
  phase: EntrancePhase | undefined,
  options: EntranceMotionOptions = {}
) {
  const normalizedPhase = phase ?? 'complete';
  const offsetY = options.fadeOnly ? 0 : options.offsetY ?? 10;
  const initialScale = options.initialScale ?? 1;
  const duration = options.duration ?? 0.42;
  const delay = options.delay ?? 0;

  if (normalizedPhase === 'complete') {
    return {
      initial: false as const,
      animate: { opacity: 1, y: 0, scale: 1 },
    };
  }

  if (normalizedPhase === 'waiting') {
    return {
      initial: false as const,
      animate: { opacity: 0, y: offsetY, scale: initialScale },
    };
  }

  return {
    initial: { opacity: 0, y: offsetY, scale: initialScale },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  };
}

export function getKeycapEntranceOptions(index: number): EntranceMotionOptions {
  const safeIndex = Math.max(0, index);
  const row = Math.floor(safeIndex / 3);
  const column = safeIndex % 3;

  return {
    delay: 0.58 + row * 0.11 + column * 0.035,
    duration: 0.37,
    offsetY: 7,
    initialScale: 0.975,
  };
}
