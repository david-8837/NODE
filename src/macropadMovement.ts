export interface MovementOffset {
  x: number;
  y: number;
}

export interface MovementRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Unit edges measured from the center of its translation anchor. */
export interface MovementUnitBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function clampAxis(
  value: number,
  start: number,
  end: number,
  center: number,
  unitStart: number,
  unitEnd: number
): number {
  const min = start - center - unitStart;
  const max = end - center - unitEnd;

  // If the available area is smaller than the unit, keep it centered and
  // immobile on this axis rather than letting it drift farther outside.
  if (max < min) {
    return (start + end) / 2 - center - (unitStart + unitEnd) / 2;
  }

  return Math.min(max, Math.max(min, value));
}

/** Clamp the macropad's translate offset so its full movable unit stays in an area. */
export function clampMacropadOffsetToArea(
  offset: MovementOffset,
  parent: MovementRect,
  area: MovementRect,
  unit: MovementUnitBounds
): MovementOffset {
  const centerX = (parent.left + parent.right) / 2;
  const centerY = (parent.top + parent.bottom) / 2;

  return {
    x: clampAxis(offset.x, area.left, area.right, centerX, unit.left, unit.right),
    y: clampAxis(offset.y, area.top, area.bottom, centerY, unit.top, unit.bottom),
  };
}
