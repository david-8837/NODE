/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import DeviceConnectionGate from '../src/DeviceConnectionGate';
import geometry from '../src/microPadGeometry.json';
import { homeMicroPadMarkup, syncDeviceArtwork } from '../windows-installer/deviceMarkup.mjs';

let container: HTMLDivElement;
let root: Root;
const rootDir = path.resolve(__dirname, '..');

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function renderGate(connected = false) {
  await act(async () => {
    root.render(createElement(DeviceConnectionGate, {
      status: {
        state: connected ? 'connected' : 'disconnected',
        deviceActiveLayer: 0,
        activeProfileSlot: 0,
        layerCount: 4,
      },
      onRetry: () => {},
    }));
  });
  const svg = container.querySelector<SVGSVGElement>('[aria-label="Micro Pad illustration"]');
  expect(svg).not.toBeNull();
  return svg!;
}

const numberAttr = (element: Element, name: string) => Number(element.getAttribute(name));

describe('home-screen Micro Pad shape in grey/white artwork', () => {
  it('derives the tall enclosure and inset frame from the home-screen dimensions', () => {
    const home = readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf8');
    // MacropadDevice: 172px shell, 12px padding, 16px-radius inner plate, 6px
    // padding/gap, a 42px top row and three 42px key rows with 3px gaps.
    expect(home).toContain('w-[172px] bg-[#050505] rounded-[24px] p-[12px]');
    expect(home).toContain('bg-[#151515] rounded-[16px] p-[6px] flex flex-col gap-[6px]');
    expect(home).toContain('grid grid-cols-3 grid-rows-3 gap-[3px] place-items-center');
    const contentWidth = 172 - 2 * 12 - 2 * 6;
    const columnWidth = (contentWidth - 2 * 3) / 3;
    const plateHeight = 2 * 6 + 42 + 6 + 3 * 42 + 2 * 3;
    expect(geometry.height).toBe(plateHeight + 2 * 12);
    expect(geometry.plate.height).toBe(plateHeight);
    expect(geometry.keys.columns[0]).toBeCloseTo(18 + (columnWidth - 42) / 2, 8);
    expect(geometry.keys.columns[1]).toBeCloseTo(18 + columnWidth + 3 + (columnWidth - 42) / 2, 8);
    expect(geometry.keys.rows).toEqual([66, 111, 156]);
  });

  it('renders nine square keys below the light/dial row, not an extra top-left key', async () => {
    const svg = await renderGate();
    expect(svg.getAttribute('viewBox')).toBe('0 0 172 216');
    expect(svg.getAttribute('data-pad-shape')).toBe('home-screen');
    const keys = [...svg.querySelectorAll('[data-part="key"]')];
    expect(keys).toHaveLength(9);
    for (const key of keys) {
      expect(numberAttr(key, 'width')).toBe(42);
      expect(numberAttr(key, 'height')).toBe(42);
      expect(numberAttr(key, 'rx')).toBe(5);
      expect(numberAttr(key, 'y')).toBeGreaterThanOrEqual(66);
    }
    const light = svg.querySelector('[data-part="status-light"]')!;
    const dial = svg.querySelector('[data-part="dial"]')!;
    expect(numberAttr(light, 'cx')).toBe(geometry.indicator.cx);
    expect(numberAttr(light, 'cy')).toBe(39);
    expect(numberAttr(dial, 'cx')).toBeCloseTo(geometry.dial.cx, 8);
    expect(numberAttr(dial, 'cy')).toBe(39);
    expect(numberAttr(dial, 'r')).toBe(19.5);
    expect(numberAttr(light, 'cx')).toBeLessThan(numberAttr(dial, 'cx'));
  });

  it('keeps the same geometry when the connection becomes active', async () => {
    const disconnected = await renderGate();
    const before = [...disconnected.querySelectorAll('[data-part]')].map((part) =>
      [...part.attributes].filter((attr) => attr.name !== 'stroke' && attr.name !== 'fill')
        .map((attr) => `${attr.name}=${attr.value}`).join(' ')
    );
    await act(async () => {
      root.render(createElement(DeviceConnectionGate, {
        status: { state: 'connected', deviceActiveLayer: 0, activeProfileSlot: 0, layerCount: 4 },
        onRetry: () => {},
      }));
    });
    const connected = container.querySelector('[aria-label="Micro Pad illustration"]')!;
    const after = [...connected.querySelectorAll('[data-part]')].map((part) =>
      [...part.attributes].filter((attr) => attr.name !== 'stroke' && attr.name !== 'fill')
        .map((attr) => `${attr.name}=${attr.value}`).join(' ')
    );
    expect(after).toEqual(before);
  });

  it('uses the identical device markup in the header and welcome sidebar', () => {
    for (const name of ['installer-header.svg', 'installer-sidebar.svg']) {
      const svg = readFileSync(path.join(rootDir, 'windows-installer', name), 'utf8');
      expect(svg).toContain(homeMicroPadMarkup(geometry));
      expect(syncDeviceArtwork(svg, geometry)).toBe(svg);
      expect((svg.match(/data-part="key"/g) ?? [])).toHaveLength(9);
      expect(svg).not.toMatch(/#0051ff|#c9ced8|#f4f6fa/i);
    }
  });
});
