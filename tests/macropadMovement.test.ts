import { describe, expect, it } from 'vitest';
import { clampMacropadOffsetToArea } from '../src/macropadMovement';

describe('macropad movement bounds', () => {
  it('keeps the device offset within the available layout area', () => {
    expect(
      clampMacropadOffsetToArea(
        { x: 200, y: -120 },
        { left: 0, top: 0, right: 400, bottom: 300 },
        { left: 20, top: 30, right: 380, bottom: 270 },
        { left: -110, top: -80, right: 110, bottom: 80 }
      )
    ).toEqual({ x: 70, y: -40 });
  });

  it('centers an oversized macropad when no drag range is available', () => {
    expect(
      clampMacropadOffsetToArea(
        { x: 50, y: 50 },
        { left: 0, top: 0, right: 100, bottom: 80 },
        { left: 0, top: 0, right: 100, bottom: 80 },
        { left: -110, top: -80, right: 110, bottom: 80 }
      )
    ).toEqual({ x: 0, y: 0 });
  });
});
