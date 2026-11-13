import { describe, expect, it } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { buildAgentProfilesPayload } = require('../electron/agentProfileSync.cjs');

describe('Studio to Background Agent profile conversion', () => {
  it('includes profile identities, all layers, host actions, and encoder mappings', () => {
    const multi = {
      label: 'Save / Undo',
      binding: 'Multi Action',
      actionType: 'Multi-step action' as const,
      execution: { kind: 'multi' as const, gestures: { onTap: 'Ctrl + S', doubleTap: 'Ctrl + Z' } },
    };
    const payload = buildAgentProfilesPayload([
      {
        id: 'profile-work',
        name: 'Work',
        color: '#000000',
        layers: [
          {
            r1c1: multi,
            'dial-tl': {
              label: 'Volume', binding: 'Volume', actionType: 'Shortcut',
              encoderActions: {
                cw: { label: 'up', binding: 'volume +' },
                press: { label: 'mute', binding: 'mute' },
                ccw: { label: 'down', binding: 'volume -' },
              },
            },
          } as any,
          { r1c2: { label: 'A', binding: 'a', actionType: 'Basic input' } } as any,
        ],
      },
      {
        id: 'profile-home', name: 'Home', color: '#ffffff',
        layers: [{ r1c3: { label: 'B', binding: 'b', actionType: 'Basic input' } } as any],
      },
    ], 0);

    expect(payload).toMatchObject({
      format: 'node-studio-agent-profiles',
      version: 1,
      activeProfileId: 'profile-work',
      profiles: [
        {
          id: 'profile-work',
          layers: [
            {
              layerIndex: 0,
              slots: {
                r1c1: multi,
                'dial-tl': { label: 'mute', binding: 'mute' },
              },
              dial: {
                cw: { label: 'up', binding: 'volume +' },
                ccw: { label: 'down', binding: 'volume -' },
              },
            },
            { layerIndex: 1, slots: { r1c2: expect.any(Object) }, dial: {} },
          ],
        },
        { id: 'profile-home' },
      ],
    });
    expect(payload.studioRevision).toMatch(/^[0-9a-f]{64}$/);
  });

  it('rejects empty profiles and chooses a safe first profile for an invalid active index', () => {
    expect(() => buildAgentProfilesPayload([], 0)).toThrow('At least one saved profile');
    const profiles = [{ id: 'only', name: 'Only', color: '#000', layers: [{}] as any }];
    expect(buildAgentProfilesPayload(profiles, 50).activeProfileId).toBe('only');
  });
});
