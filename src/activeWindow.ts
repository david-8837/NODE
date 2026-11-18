// src/activeWindow.ts - Active Window Detection & Profile Auto-Switching Matcher

export interface ActiveWindowInfo {
  hwnd: string;
  title: string;
  pid: number;
  processName: string;
  processPath: string;
}

export interface MatchedProfileResult<T = unknown> {
  profileIndex: number;
  profile: T;
  matchType: 'process' | 'title' | 'keyword';
}

export interface NamedProfile {
  name: string;
}

export const COMMON_APP_PATTERNS = [
  { match: /code\.exe/i, keywords: ['code', 'vscode', 'developer', 'dev'] },
  { match: /photoshop\.exe/i, keywords: ['photoshop', 'photo', 'retouch', 'adobe'] },
  { match: /premiere\.exe/i, keywords: ['premiere', 'video', 'editing', 'pr'] },
  { match: /afterfx\.exe/i, keywords: ['aftereffects', 'ae', 'motion', 'vfx'] },
  { match: /blender\.exe/i, keywords: ['blender', '3d', 'modeling'] },
  { match: /figma\.exe/i, keywords: ['figma', 'design', 'ui'] },
  { match: /obs64\.exe|obs32\.exe/i, keywords: ['obs', 'stream', 'twitch', 'broadcast'] },
  { match: /discord\.exe/i, keywords: ['discord', 'chat'] },
  { match: /spotify\.exe/i, keywords: ['spotify', 'music', 'media'] },
  { match: /chrome\.exe/i, keywords: ['chrome', 'browser', 'web'] },
  { match: /excel\.exe/i, keywords: ['excel', 'spreadsheet', 'office', 'data'] },
];

export function matchProfileForApplication<T extends NamedProfile>(
  windowInfo: ActiveWindowInfo | null | undefined,
  profiles: T[] = [],
): MatchedProfileResult<T> | null {
  if (!windowInfo || !Array.isArray(profiles) || profiles.length === 0) return null;
  const proc = (windowInfo.processName || '').toLowerCase();
  const title = (windowInfo.title || '').toLowerCase();

  // Ignore our own application window
  if (proc.includes('node studio') || proc.includes('electron') || title.includes('node studio')) {
    return null;
  }

  // 1. Direct name match in profile titles
  for (let i = 0; i < profiles.length; i++) {
    const profName = (profiles[i]?.name || '').toLowerCase();
    if (!profName) continue;
    const baseProc = proc.replace(/\.exe$/i, '');
    if (baseProc && profName.includes(baseProc)) return { profileIndex: i, profile: profiles[i], matchType: 'process' };
    if (profName.length > 2 && title.includes(profName)) return { profileIndex: i, profile: profiles[i], matchType: 'title' };
  }

  // 2. Pattern keyword matching
  for (const pattern of COMMON_APP_PATTERNS) {
    if (pattern.match.test(proc)) {
      for (let i = 0; i < profiles.length; i++) {
        const profName = (profiles[i]?.name || '').toLowerCase();
        for (const kw of pattern.keywords) {
          if (profName.includes(kw)) {
            return { profileIndex: i, profile: profiles[i], matchType: 'keyword' };
          }
        }
      }
    }
  }

  return null;
}
