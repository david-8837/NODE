import type { ProfileData } from './presetLibrary';

// Numeric layer/profile bindings are positional in the firmware. Prevent deleting
// an entry when doing so would invalidate or silently retarget a saved action.
export function referencesAtOrAfter(value: unknown, kind: 'layer' | 'profile', index: number): boolean {
  const pattern = kind === 'layer'
    ? /(?:^|[(:,]\s*)(?:temp\s+)?layer\s+(\d+)\s*(?=$|[,)])/gi
    : /(?:^|[(:,]\s*)profile\s+(\d+)\s*(?=$|[,)])/gi;
  function visit(node: unknown, field = ''): boolean {
    if (typeof node === 'string') {
      if (!['binding', 'onTap', 'onHold', 'doubleTap', 'tapHold', 'key', 'value'].includes(field)) return false;
      pattern.lastIndex = 0;
      return Array.from(node.trim().matchAll(pattern)).some((match) => Number(match[1]) === 0 || Number(match[1]) - 1 >= index);
    }
    if (Array.isArray(node)) return node.some((entry) => visit(entry, field));
    if (node && typeof node === 'object') {
      const object = node as Record<string, unknown>;
      return Object.entries(object).some(([key, child]) => {
        // Text, commands and URLs can legitimately contain words like “Profile 4”.
        if (key === 'value' && object.kind !== 'shortcut') return false;
        if (key === 'binding' && (object.actionType === 'Smart Action' ||
            (object.execution && typeof object.execution === 'object' &&
             ['smart', 'text'].includes(String((object.execution as Record<string, unknown>).kind))))) return false;
        return visit(child, key);
      });
    }
    return false;
  }
  return visit(value);
}

export interface ReferenceConflict {
  location: string;
  binding: string;
  label?: string;
  isExact: boolean;
}

const GRID_SLOT_NAMES: Record<string, string> = {
  r1c1: 'Key 1',
  r1c2: 'Key 2',
  r1c3: 'Key 3',
  r2c1: 'Key 4',
  r2c2: 'Key 5',
  r2c3: 'Key 6',
  r3c1: 'Key 7',
  r3c2: 'Key 8',
  r3c3: 'Key 9',
  'dial-tl': 'Rotary Dial',
};

/**
 * Finds all human-readable key/action references to a profile or layer index.
 */
export function findReferenceConflicts(
  profiles: ProfileData[] | any[],
  customItemsByTab: unknown,
  kind: 'layer' | 'profile',
  targetIndex: number
): ReferenceConflict[] {
  const conflicts: ReferenceConflict[] = [];
  const targetNum = targetIndex + 1;

  if (Array.isArray(profiles)) {
    profiles.forEach((prof, pIdx) => {
      if (!prof || !Array.isArray(prof.layers)) return;
      prof.layers.forEach((layer: any, lIdx: number) => {
        if (!layer || typeof layer !== 'object') return;
        for (const [slotId, assignment] of Object.entries(layer)) {
          if (slotId === 'presetId') continue;
          if (!assignment || typeof assignment !== 'object') continue;
          if (referencesAtOrAfter(assignment, kind, targetIndex)) {
            const slotName = GRID_SLOT_NAMES[slotId] || slotId;
            const assign = assignment as Record<string, any>;
            const isExact = kind === 'profile'
              ? new RegExp(`\\bprofile\\s+${targetNum}\\b`, 'i').test(assign.binding || '') ||
                (assign.label && new RegExp(`^P${targetNum}$`, 'i').test(assign.label))
              : new RegExp(`\\b(?:temp\\s+)?layer\\s+${targetNum}\\b`, 'i').test(assign.binding || '') ||
                (assign.label && new RegExp(`^(?:L|TL)${targetNum}$`, 'i').test(assign.label));

            const location = kind === 'profile'
              ? `${prof.name || `Profile ${pIdx + 1}`} (Layer ${lIdx + 1}) • ${slotName}`
              : `Layer ${lIdx + 1} • ${slotName}`;

            conflicts.push({
              location,
              binding: assign.binding || 'Reference',
              label: assign.label,
              isExact,
            });
          }
        }
      });
    });
  }

  if (customItemsByTab && typeof customItemsByTab === 'object') {
    for (const [tab, items] of Object.entries(customItemsByTab as Record<string, unknown[]>)) {
      if (Array.isArray(items)) {
        items.forEach((item: any, i: number) => {
          if (referencesAtOrAfter(item, kind, targetIndex)) {
            conflicts.push({
              location: `Custom Action • ${item.label || item.name || `Action ${i + 1}`} (${tab})`,
              binding: item.binding || item.name || 'Action',
              label: item.label,
              isExact: false,
            });
          }
        });
      }
    }
  }

  return conflicts;
}

/**
 * Clears exact references to the deleted profile/layer, and decrements references
 * to higher profiles/layers so no dead links or retargeting occur.
 */
export function cleanReferenceConflicts(
  profiles: ProfileData[] | any[],
  customItemsByTab: any,
  kind: 'layer' | 'profile',
  deletedIndex: number
): { profiles: ProfileData[]; customItemsByTab: any } {
  const targetNum = deletedIndex + 1;

  function cleanString(str: string): string {
    if (kind === 'profile') {
      return str.replace(/\bprofile\s+(\d+)\b/gi, (_, nStr) => {
        const n = Number(nStr);
        if (n === targetNum) return '';
        if (n > targetNum) return `Profile ${n - 1}`;
        return `Profile ${n}`;
      }).trim();
    } else {
      return str.replace(/\b(temp\s+)?layer\s+(\d+)\b/gi, (_, tempPrefix, nStr) => {
        const n = Number(nStr);
        const prefix = tempPrefix ? 'Temp Layer ' : 'Layer ';
        if (n === targetNum) return '';
        if (n > targetNum) return `${prefix}${n - 1}`;
        return `${prefix}${n}`;
      }).trim();
    }
  }

  function cleanLabel(label: string | undefined): string | undefined {
    if (!label) return label;
    if (kind === 'profile') {
      if (/^P\d+$/i.test(label)) {
        const n = Number(label.slice(1));
        if (n === targetNum) return '';
        if (n > targetNum) return `P${n - 1}`;
      }
    } else {
      const match = label.match(/^(L|TL)(\d+)$/i);
      if (match) {
        const prefix = match[1].toUpperCase();
        const n = Number(match[2]);
        if (n === targetNum) return '';
        if (n > targetNum) return `${prefix}${n - 1}`;
      }
    }
    return label;
  }

  function cleanAssignment(assignment: any): any {
    if (!assignment || typeof assignment !== 'object') return assignment;
    if (!referencesAtOrAfter(assignment, kind, deletedIndex)) return assignment;

    const copy = JSON.parse(JSON.stringify(assignment));
    const isExact = kind === 'profile'
      ? new RegExp(`\\bprofile\\s+${targetNum}\\b`, 'i').test(copy.binding || '') || copy.label === `P${targetNum}`
      : new RegExp(`\\b(?:temp\\s+)?layer\\s+${targetNum}\\b`, 'i').test(copy.binding || '') || /^(?:L|TL)${targetNum}$/i.test(copy.label || '');

    if (isExact && (!copy.execution?.gestures && !copy.encoderActions)) {
      return {
        actionType: 'Basic input',
        label: '',
        binding: '',
      };
    }

    if (copy.binding) {
      const cleaned = cleanString(copy.binding);
      copy.binding = cleaned;
      if (!cleaned && isExact) {
        copy.label = '';
        copy.actionType = 'Basic input';
      } else {
        copy.label = cleanLabel(copy.label);
      }
    } else {
      copy.label = cleanLabel(copy.label);
    }

    if (copy.execution && typeof copy.execution === 'object') {
      if (copy.execution.gestures && typeof copy.execution.gestures === 'object') {
        for (const [k, v] of Object.entries(copy.execution.gestures)) {
          if (typeof v === 'string') {
            const cleaned = cleanString(v);
            if (!cleaned) {
              delete copy.execution.gestures[k];
            } else {
              copy.execution.gestures[k] = cleaned;
            }
          }
        }
      }
    }

    if (copy.encoderActions && typeof copy.encoderActions === 'object') {
      for (const sub of ['cw', 'ccw', 'press']) {
        if (copy.encoderActions[sub]?.binding) {
          const cleaned = cleanString(copy.encoderActions[sub].binding);
          copy.encoderActions[sub].binding = cleaned;
        }
      }
    }

    return copy;
  }

  const cleanedProfiles = (profiles || []).map((p: any) => {
    if (!p || !Array.isArray(p.layers)) return p;
    const newLayers = p.layers.map((l: any) => {
      if (!l || typeof l !== 'object') return l;
      const newL = { ...l };
      for (const slot of Object.keys(newL)) {
        if (slot === 'presetId') continue;
        newL[slot] = cleanAssignment(newL[slot]);
      }
      return newL;
    });
    return { ...p, layers: newLayers };
  });

  let cleanedCustom = customItemsByTab;
  if (customItemsByTab && typeof customItemsByTab === 'object') {
    cleanedCustom = JSON.parse(JSON.stringify(customItemsByTab));
    for (const [tab, list] of Object.entries(cleanedCustom)) {
      if (Array.isArray(list)) {
        cleanedCustom[tab] = list.map((item) => cleanAssignment(item));
      }
    }
  }

  return { profiles: cleanedProfiles, customItemsByTab: cleanedCustom };
}
