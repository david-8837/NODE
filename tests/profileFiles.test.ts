import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  createProfileExport,
  createProfileFileTools,
  MAX_PROFILE_FILE_BYTES,
  mergeImportedProfiles,
  parseProfileFile,
  type ParsedProfileFile,
} from '../src/profileFiles';

const profile = {
  id: 'edit-profile',
  name: 'Editor layout',
  color: '#123456',
  layers: [{
    r1c1: {
      label: 'Save',
      binding: 'Ctrl+S',
      actionType: 'Shortcut',
      iconId: 'device-floppy',
      execution: { kind: 'shortcut', value: 'Ctrl + S' },
    },
    'dial-tl': {
      label: 'Dial',
      binding: 'Volume',
      actionType: 'Basic input',
      encoderActions: {
        cw: {
          label: 'Vol+',
          binding: 'volume +',
          execution: { kind: 'shortcut', value: 'volume +' },
        },
        ccw: { label: 'Vol-', binding: 'volume -' },
        press: { label: 'Mute', binding: 'mute' },
      },
    },
  }],
};

const customItems = {
  Action: [{
    id: 'act-save',
    main: 'Save project',
    binding: 'Ctrl+S',
    macropadLabel: 'Save',
    iconId: 'device-floppy',
    execution: {
      kind: 'sequence',
      steps: [
        { kind: 'key', key: 'Ctrl + S', mode: 'press-release', delayAfterMs: 10 },
        { kind: 'text', text: 'done', interKeyDelayMs: 1 },
        { kind: 'wait', durationMs: 20 },
      ],
    },
  }],
  'Multi-A': [{ id: 'multi-build', main: 'Build and run', listLabel: 'Build' }],
  'Smart-A': [{ id: 'smart-open', main: 'Open editor', top: 'Open' }],
};

describe('profile file import and export', () => {
  it('exports a versioned profile with its custom actions and round-trips the complete profile', () => {
    const text = createProfileExport(profile, customItems);
    const parsed = parseProfileFile(text);

    expect(JSON.parse(text)).toMatchObject({ format: 'node-studio-profile', version: 1 });
    expect(parsed).toEqual({ profiles: [profile], activeProfileIndex: 0, customItems });
  });

  it('round-trips the installed preset marker on a profile layer', () => {
    const markedProfile = {
      ...profile,
      layers: [{ ...profile.layers[0], presetId: 'chatgpt' }],
    };
    const parsed = parseProfileFile(createProfileExport(markedProfile));
    const parsedLayers = parsed.profiles[0].layers as Array<Record<string, unknown>>;

    expect(parsedLayers[0].presetId).toBe('chatgpt');
    expect(() => parseProfileFile(JSON.stringify({
      ...markedProfile,
      layers: [{ ...markedProfile.layers[0], presetId: 42 }],
    }))).toThrow('invalid preset id');
  });

  it('imports the legacy raw profile JSON format', () => {
    const parsed = parseProfileFile(JSON.stringify(profile));
    expect(parsed.profiles).toHaveLength(1);
    expect(parsed.profiles[0]).toMatchObject({ name: 'Editor layout', layers: profile.layers });
    expect(parsed.customItems).toEqual({ Action: [], 'Multi-A': [], 'Smart-A': [] });
  });

  it('imports a versioned browser-state backup containing multiple profiles', () => {
    const parsed = parseProfileFile(JSON.stringify({
      v: 1,
      profiles: [profile, { ...profile, id: 'other', name: 'Other profile' }],
      activeProfileIndex: 1,
      customItems,
    }));
    expect(parsed.profiles.map(({ name }) => name)).toEqual(['Editor layout', 'Other profile']);
    expect(parsed.activeProfileIndex).toBe(1);
    expect(parsed.customItems).toEqual(customItems);
  });

  it('rejects malformed, oversized, unsupported, and structurally invalid files', () => {
    expect(() => parseProfileFile('{broken')).toThrow('not valid JSON');
    expect(() => parseProfileFile(' '.repeat(MAX_PROFILE_FILE_BYTES + 1))).toThrow('2 MB');
    expect(() => parseProfileFile(JSON.stringify({ format: 'node-studio-profile', version: 9, profile })))
      .toThrow('version is not supported');
    expect(() => parseProfileFile(JSON.stringify({ ...profile, layers: [] })))
      .toThrow('between 1 and 8 layers');
    expect(() => parseProfileFile(JSON.stringify({ ...profile, layers: [null] })))
      .toThrow('must be an object');
    expect(() => parseProfileFile(JSON.stringify({ ...profile, name: ' ' })))
      .toThrow('non-empty name');
    expect(() => parseProfileFile(JSON.stringify({
      ...profile,
      layers: [{ r1c1: { label: 'A', binding: { key: 'A' } } }],
    }))).toThrow('invalid r1c1 binding');
    expect(() => parseProfileFile(JSON.stringify({
      ...profile,
      layers: [{ r1c1: {
        label: 'Broken macro',
        binding: 'Broken',
        execution: { kind: 'multi', gestures: null },
      } }],
    }))).toThrow('multiaction gestures must be an object');
    expect(() => parseProfileFile(JSON.stringify({
      ...profile,
      layers: [{ 'dial-tl': {
        label: 'Dial',
        binding: 'Macro',
        encoderActions: { cw: { label: 'Bad', binding: 'Bad', execution: { kind: 'future' } } },
      } }],
    }))).toThrow('unsupported kind');
    expect(() => createProfileExport(profile, {
      Action: [{ id: 'invalid-action', main: { text: 'not a name' } }],
    })).toThrow('non-empty name');
    expect(() => createProfileExport(profile, {
      Action: [{
        id: 'invalid-execution',
        main: 'Bad action',
        execution: { kind: 'sequence', steps: [{ kind: 'key', key: 'Ctrl+C', delayAfterMs: -1 }] },
      }],
    })).toThrow('delayAfterMs must be an integer');
    expect(() => createProfileExport(profile, {
      Action: [{
        id: 'oversized-sequence',
        main: 'Oversized sequence',
        execution: {
          kind: 'sequence',
          steps: [
            { kind: 'text', text: 'a'.repeat(16 * 1024) },
            { kind: 'text', text: 'b'.repeat(16 * 1024 + 1) },
          ],
        },
      }],
    })).toThrow('total text characters');
  });

  it('merges imported profiles and remaps conflicting custom-action IDs and references', () => {
    const incoming: ParsedProfileFile = {
      profiles: [{
        ...profile,
        layers: [{
          ...profile.layers[0],
          r1c1: { label: 'Imported action', binding: 'Different', actionType: 'Custom Action', actionId: 'act-save' },
        }],
      }],
      activeProfileIndex: 0,
      customItems: {
        Action: [{ id: 'act-save', main: 'Imported action', binding: 'Different' }],
        'Multi-A': [],
        'Smart-A': [],
      },
    };
    const merged = mergeImportedProfiles({
      profiles: [profile],
      activeProfileIndex: 0,
      customItems: { ...customItems, Action: [customItems.Action[0]] },
    }, incoming);

    expect(merged.profiles).toHaveLength(2);
    expect(merged.profiles[1].id).not.toBe(profile.id);
    expect(merged.activeProfileIndex).toBe(1);
    const remappedId = merged.customItems.Action[1].id;
    expect(remappedId).not.toBe('act-save');
    const mergedLayers = merged.profiles[1].layers as Array<Record<string, Record<string, unknown>>>;
    expect(mergedLayers[0].r1c1).toMatchObject({ actionId: remappedId });
    expect(merged.customItems.Action[0]).toEqual(customItems.Action[0]);
  });

  it('selects the imported active profile when merging a full browser-state backup', () => {
    const incoming = parseProfileFile(JSON.stringify({
      v: 1,
      profiles: [profile, { ...profile, id: 'imported-second', name: 'Second imported profile' }],
      activeProfileIndex: 1,
      customItems,
    }));
    const merged = mergeImportedProfiles({
      profiles: [profile],
      activeProfileIndex: 0,
      customItems,
    }, incoming);

    expect(merged.profiles).toHaveLength(3);
    expect(merged.activeProfileIndex).toBe(2);
    expect(merged.profiles[merged.activeProfileIndex].name).toBe('Second imported profile');
  });

  it('imports into an app that contains a newly added, still-unnamed profile', () => {
    const currentUnnamedProfile = {
      id: 'draft-profile',
      name: '',
      color: '#0051ff',
      layers: [{ r1c1: { label: '', binding: 'blank', actionType: 'Basic input' } }],
    };
    const incoming = parseProfileFile(createProfileExport(profile, customItems));
    const merged = mergeImportedProfiles({
      profiles: [currentUnnamedProfile],
      activeProfileIndex: 0,
      customItems: { Action: [], 'Multi-A': [], 'Smart-A': [] },
    }, incoming);

    expect(merged.profiles).toHaveLength(2);
    expect(merged.profiles[0].name).toBe('');
    expect(merged.profiles[1].name).toBe('Editor layout');
    expect(merged.activeProfileIndex).toBe(1);
  });

  it('reuses identical custom action entries when the same profile file is imported twice', () => {
    const incoming = parseProfileFile(createProfileExport(profile, customItems));
    const merged = mergeImportedProfiles({
      profiles: [profile],
      activeProfileIndex: 0,
      customItems,
    }, incoming);
    expect(merged.profiles).toHaveLength(2);
    expect(merged.customItems.Action).toHaveLength(1);
    expect(merged.customItems['Multi-A']).toHaveLength(1);
    expect(merged.customItems['Smart-A']).toHaveLength(1);
  });

  it('persists an installed-app shortcut target and rejects invalid shortcut paths', () => {
    const applicationShortcutPath = 'C:\\Users\\tester\\Start Menu\\Programs\\Code.lnk';
    const appAction = {
      id: 'smart-open-code',
      main: 'Open Visual Studio Code',
      listLabel: 'Open Visual Studio Code (App: Visual Studio Code)',
      execution: {
        kind: 'smart',
        actionType: 'App',
        value: 'Visual Studio Code',
        applicationShortcutPath,
      },
    };
    const exported = createProfileExport(profile, {
      Action: [],
      'Multi-A': [],
      'Smart-A': [appAction],
    });
    const parsed = parseProfileFile(exported);
    expect((parsed.customItems['Smart-A'][0].execution as Record<string, unknown>))
      .toMatchObject({ applicationShortcutPath });

    expect(() => parseProfileFile(createProfileExport(profile, {
      Action: [],
      'Multi-A': [],
      'Smart-A': [{
        ...appAction,
        execution: { ...appAction.execution, applicationShortcutPath: 'relative\\Code.lnk' },
      }],
    }))).toThrow(/absolute \.lnk path/i);
  });

  it('requires explicit confirmation for terminal commands imported in profiles and custom actions', async () => {
    const dom = new JSDOM('<!doctype html><body></body>', { url: 'https://node-studio.test/' });
    vi.spyOn(dom.window.HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    const tools = createProfileFileTools(dom.window as unknown as Window & typeof globalThis);
    const importing = tools.pickFile();
    const input = dom.window.document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const importedProfile = {
      ...profile,
      layers: [{
        ...profile.layers[0],
        r1c1: {
          label: 'Imported command',
          binding: 'Imported command (Cmd: echo imported)',
          actionType: 'Smart Action',
          execution: {
            kind: 'smart',
            actionType: 'Cmd',
            value: 'echo imported',
            requiresConsent: false,
          },
        },
        'dial-tl': {
          label: 'Dial',
          binding: 'Volume',
          encoderActions: {
            cw: { label: 'Legacy command', binding: 'Legacy command (Cmd: echo legacy)' },
          },
        },
        r1c2: {
          label: 'Old command',
          binding: 'Old command (Cmd: echo old)',
          actionType: 'Smart Action',
        },
      }],
    };
    const fileText = JSON.stringify({
      format: 'node-studio-profile',
      version: 1,
      profile: importedProfile,
      customItems: {
        Action: [],
        'Multi-A': [],
        'Smart-A': [
          {
            id: 'imported-cmd',
            main: 'Imported command',
            listLabel: 'Imported command (Cmd: echo custom)',
            execution: { kind: 'smart', actionType: 'Cmd', value: 'echo custom', requiresConsent: false },
          },
          {
            id: 'legacy-cmd',
            main: 'Legacy command',
            listLabel: 'Legacy command (Cmd: echo legacy custom)',
          },
        ],
      },
    });
    const file = new dom.window.File([fileText], 'import.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    const imported = await importing;
    const importedLayers = imported!.profiles[0].layers as Array<Record<string, unknown>>;
    const layer = importedLayers[0];
    const encoderActions = layer['dial-tl'] as Record<string, unknown>;
    const encoder = encoderActions.encoderActions as Record<string, Record<string, unknown>>;

    expect((((layer.r1c1 as Record<string, unknown>).execution) as Record<string, unknown>).requiresConsent).toBe(true);
    expect((((layer.r1c2 as Record<string, unknown>).execution) as Record<string, unknown>).requiresConsent).toBe(true);
    expect((encoder.cw.execution as Record<string, unknown>).requiresConsent).toBe(true);
    expect((imported!.customItems['Smart-A'][0].execution as Record<string, unknown>).requiresConsent).toBe(true);
    expect((imported!.customItems['Smart-A'][1].execution as Record<string, unknown>).requiresConsent).toBe(true);
    dom.window.close();
  });

  it('keeps imported text as data and discards prototype-pollution fields', () => {
    const malicious = JSON.parse(JSON.stringify(profile));
    malicious.layers[0].r1c1.label = '<img src=x onerror=alert(1)>';
    Object.defineProperty(malicious.layers[0], '__proto__', {
      value: { polluted: true },
      enumerable: true,
    });
    const parsed = parseProfileFile(JSON.stringify(malicious));
    const importedLayers = parsed.profiles[0].layers as Array<Record<string, Record<string, unknown>>>;
    expect(importedLayers[0].r1c1.label).toBe('<img src=x onerror=alert(1)>');
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    expect(Object.hasOwn(importedLayers[0], '__proto__')).toBe(false);
  });
});
