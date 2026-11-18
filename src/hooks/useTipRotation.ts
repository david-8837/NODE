import { useState, useEffect } from 'react';

export interface TipRotationOptions {
  intervalMs?: number;
}

export function useTipRotation(tipCount: number, options: TipRotationOptions = {}) {
  const { intervalMs = 5000 } = options;
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (tipCount <= 1) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tipCount);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [tipCount, intervalMs]);

  const nextTip = () => {
    if (tipCount <= 0) return;
    setTipIndex((prev) => (prev + 1) % tipCount);
  };

  const prevTip = () => {
    if (tipCount <= 0) return;
    setTipIndex((prev) => (prev - 1 + tipCount) % tipCount);
  };

  return {
    tipIndex,
    setTipIndex,
    nextTip,
    prevTip,
  };
}
