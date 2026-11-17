/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MacropadDevice } from '../src/components/MacropadDevice';
import { INITIAL_LAYER_1 } from '../src/presetLibrary';
import { GRID_MACRO_ENCODER_SLOT, GRID_MACRO_KEY_SLOTS } from '../src/deviceLayout';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('MacropadDevice component', () => {
  it('renders all 9 keycap buttons and the dial row', async () => {
    await act(async () => {
      root.render(
        createElement(MacropadDevice, {
          layer: INITIAL_LAYER_1,
          selectedKey: null,
          selectedEncoderSub: null,
          dragOverTarget: null,
          encoderAngle: 0,
          onSelectKey: vi.fn(),
          onSelectEncoderSub: vi.fn(),
        })
      );
    });

    for (const slotId of GRID_MACRO_KEY_SLOTS) {
      const btn = container.querySelector(`[data-drop-slot="${slotId}"]`);
      expect(btn).not.toBeNull();
    }

    const dial = container.querySelector(`[title^="Dial:"]`);
    expect(dial).not.toBeNull();
  });

  it('triggers onSelectKey when a key is clicked', async () => {
    const onSelectKey = vi.fn();
    await act(async () => {
      root.render(
        createElement(MacropadDevice, {
          layer: INITIAL_LAYER_1,
          selectedKey: null,
          selectedEncoderSub: null,
          dragOverTarget: null,
          encoderAngle: 0,
          onSelectKey,
          onSelectEncoderSub: vi.fn(),
        })
      );
    });

    const keyR1C1 = container.querySelector<HTMLButtonElement>('[data-drop-slot="r1c1"]');
    expect(keyR1C1).not.toBeNull();

    act(() => {
      keyR1C1?.click();
    });
    expect(onSelectKey).toHaveBeenCalledWith('r1c1');
  });

  it('triggers onSelectKey with encoder slot when dial is clicked', async () => {
    const onSelectKey = vi.fn();
    await act(async () => {
      root.render(
        createElement(MacropadDevice, {
          layer: INITIAL_LAYER_1,
          selectedKey: null,
          selectedEncoderSub: null,
          dragOverTarget: null,
          encoderAngle: 0,
          onSelectKey,
          onSelectEncoderSub: vi.fn(),
        })
      );
    });

    const dial = container.querySelector<HTMLElement>('[title^="Dial:"]');
    expect(dial).not.toBeNull();

    act(() => {
      dial?.click();
    });
    expect(onSelectKey).toHaveBeenCalledWith(GRID_MACRO_ENCODER_SLOT);
  });

  it('shows EncoderPopupCapsule when encoder slot is selected', async () => {
    await act(async () => {
      root.render(
        createElement(MacropadDevice, {
          layer: INITIAL_LAYER_1,
          selectedKey: GRID_MACRO_ENCODER_SLOT,
          selectedEncoderSub: 'cw',
          dragOverTarget: null,
          encoderAngle: 0,
          onSelectKey: vi.fn(),
          onSelectEncoderSub: vi.fn(),
        })
      );
    });

    const cwBtn = container.querySelector('[data-drop-encoder-sub="cw"]');
    expect(cwBtn).not.toBeNull();
    const pressBtn = container.querySelector('[data-drop-encoder-sub="press"]');
    expect(pressBtn).not.toBeNull();
    const ccwBtn = container.querySelector('[data-drop-encoder-sub="ccw"]');
    expect(ccwBtn).not.toBeNull();
  });

  it('renders slot numbers when showSlotNumbers is enabled', async () => {
    await act(async () => {
      root.render(
        createElement(MacropadDevice, {
          layer: INITIAL_LAYER_1,
          selectedKey: null,
          selectedEncoderSub: null,
          dragOverTarget: null,
          encoderAngle: 0,
          onSelectKey: vi.fn(),
          onSelectEncoderSub: vi.fn(),
          showSlotNumbers: true,
        })
      );
    });

    for (let i = 1; i <= 9; i++) {
      const slotNum = container.querySelector(`[data-preview-slot-number="${i}"]`);
      expect(slotNum).not.toBeNull();
      expect(slotNum?.textContent).toBe(String(i));
    }
  });

  it('invokes onHoverSlot on mouse enter and mouse leave', async () => {
    const onHoverSlot = vi.fn();
    await act(async () => {
      root.render(
        createElement(MacropadDevice, {
          layer: INITIAL_LAYER_1,
          selectedKey: null,
          selectedEncoderSub: null,
          dragOverTarget: null,
          encoderAngle: 0,
          onSelectKey: vi.fn(),
          onSelectEncoderSub: vi.fn(),
          onHoverSlot,
        })
      );
    });

    const keyR2C2 = container.querySelector<HTMLButtonElement>('[data-drop-slot="r2c2"]');
    expect(keyR2C2).not.toBeNull();

    act(() => {
      const propKey = Object.keys(keyR2C2!).find((k) => k.startsWith('__reactProps'));
      if (propKey) {
        (keyR2C2 as any)[propKey]?.onMouseEnter?.();
      } else {
        keyR2C2?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      }
    });
    expect(onHoverSlot).toHaveBeenCalledWith('r2c2');

    act(() => {
      const propKey = Object.keys(keyR2C2!).find((k) => k.startsWith('__reactProps'));
      if (propKey) {
        (keyR2C2 as any)[propKey]?.onMouseLeave?.();
      } else {
        keyR2C2?.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      }
    });
    expect(onHoverSlot).toHaveBeenCalledWith(null);
  });

  it('applies active pressed visual styling when activePressedSlot matches keycap slot', async () => {
    await act(async () => {
      root.render(
        createElement(MacropadDevice, {
          layer: INITIAL_LAYER_1,
          selectedKey: null,
          selectedEncoderSub: null,
          dragOverTarget: null,
          encoderAngle: 0,
          onSelectKey: vi.fn(),
          onSelectEncoderSub: vi.fn(),
          activePressedSlot: 'r2c2',
        })
      );
    });

    const keyR2C2 = container.querySelector<HTMLButtonElement>('[data-drop-slot="r2c2"]');
    expect(keyR2C2).not.toBeNull();
    expect(keyR2C2?.className).toContain('scale-[0.93]');
    expect(keyR2C2?.className).toContain('shadow-[0_0_20px_rgba(0,81,255,0.95)]');

    const keyR1C1 = container.querySelector<HTMLButtonElement>('[data-drop-slot="r1c1"]');
    expect(keyR1C1?.className).not.toContain('scale-[0.93]');
  });

  it('applies active pressed visual styling to rotary dial when dial trigger is pressed', async () => {
    await act(async () => {
      root.render(
        createElement(MacropadDevice, {
          layer: INITIAL_LAYER_1,
          selectedKey: null,
          selectedEncoderSub: null,
          dragOverTarget: null,
          encoderAngle: 0,
          onSelectKey: vi.fn(),
          onSelectEncoderSub: vi.fn(),
          activePressedSlot: GRID_MACRO_ENCODER_SLOT,
        })
      );
    });

    const dial = container.querySelector<HTMLButtonElement>('[title^="Dial:"]');
    expect(dial).not.toBeNull();
    expect(dial?.className).toContain('scale-[0.93]');
    expect(dial?.className).toContain('shadow-[0_0_20px_rgba(0,81,255,0.95)]');
  });
});
