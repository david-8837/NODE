import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const circuitPythonSource = readFileSync(join(process.cwd(), 'firmware/code.py'), 'utf8');
const mediaMapBody = circuitPythonSource.match(/^MEDIA_MAP\s*=\s*\{([\s\S]*?)^\}/m)?.[1] ?? '';
const mediaBindings = new Map(
  [...mediaMapBody.matchAll(/^\s*"([^"]+)"\s*:\s*ConsumerControlCode\.(\w+),?\s*$/gm)]
    .map(([, binding, consumerCode]) => [binding, consumerCode]),
);

describe('CircuitPython consumer-control binding aliases', () => {
  it.each([
    ['bright up', 'BRIGHTNESS_INCREMENT'],
    ['brightness up', 'BRIGHTNESS_INCREMENT'],
    ['brightness +', 'BRIGHTNESS_INCREMENT'],
    ['bright down', 'BRIGHTNESS_DECREMENT'],
    ['brightness down', 'BRIGHTNESS_DECREMENT'],
    ['brightness -', 'BRIGHTNESS_DECREMENT'],
  ])('maps "%s" to %s', (binding, consumerCode) => {
    expect(mediaBindings.get(binding)).toBe(consumerCode);
  });

  it('sends media bindings as consumer-control events', () => {
    expect(circuitPythonSource).toMatch(/if clean_b in MEDIA_MAP:\s*cc\.send\(MEDIA_MAP\[clean_b\]\)/);
  });
});
