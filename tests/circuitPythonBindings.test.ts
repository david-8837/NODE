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

  it('keeps default and omitted dial actions unassigned', () => {
    const defaultConfigLiteral = circuitPythonSource.match(/^DEFAULT_CONFIG = (\{[\s\S]*?^\})/m)?.[1];
    expect(defaultConfigLiteral).toBeDefined();
    const defaultConfig = JSON.parse(defaultConfigLiteral!) as {
      layers: Array<Record<string, {
        label: string;
        binding: string;
        encoderActions: Record<'cw' | 'press' | 'ccw', { label: string; binding: string }>;
      }>>;
    };
    expect(defaultConfig.layers[0]?.['dial-tl']).toMatchObject({
      label: '',
      binding: 'blank',
      encoderActions: {
        cw: { label: '', binding: 'blank' },
        press: { label: '', binding: 'blank' },
        ccw: { label: '', binding: 'blank' },
      },
    });
    expect(circuitPythonSource).toMatch(/cw_action = enc_actions\.get\("cw", \{\}\)\.get\("binding", "blank"\)/);
    expect(circuitPythonSource).toMatch(/ccw_action = enc_actions\.get\("ccw", \{\}\)\.get\("binding", "blank"\)/);
    expect(circuitPythonSource).toMatch(/press_action = enc_actions\.get\("press", \{\}\)\.get\("binding", "blank"\)/);
    expect(circuitPythonSource).not.toMatch(/\.get\("binding", "(?:volume \+|volume -|play)"\)/);
  });
});
