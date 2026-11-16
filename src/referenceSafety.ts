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
