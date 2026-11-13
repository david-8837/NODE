import React from 'react';
import { CustomPickerIcon } from './components/StudioIcons';

export type OverlayShape = { tag: string; attrs: Record<string, string> };
export type OverlayIcon = { viewBox: string; shapes: OverlayShape[] };
const tags = new Set(['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse']);
const attributes: Record<string, string> = {
  d: 'd', x: 'x', y: 'y', x1: 'x1', y1: 'y1', x2: 'x2', y2: 'y2',
  cx: 'cx', cy: 'cy', r: 'r', rx: 'rx', ry: 'ry', width: 'width', height: 'height',
  points: 'points', fill: 'fill', stroke: 'stroke', strokeWidth: 'stroke-width',
  strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin',
};

/** Convert the app's own SVG icon component into inert, allowlisted drawing primitives. */
export function overlayIconFor(id?: string): OverlayIcon | null {
  if (!id || id.startsWith('num-')) return null;
  const icon = CustomPickerIcon({ id, size: 26 });
  if (!React.isValidElement(icon) || icon.type !== 'svg') return null;
  const props = icon.props as { viewBox?: string; children?: React.ReactNode; fill?: string; stroke?: string; strokeWidth?: number; strokeLinecap?: string; strokeLinejoin?: string };
  const shapes: OverlayShape[] = [];
  const walk = (node: React.ReactNode): void => {
    React.Children.forEach(node, child => {
      if (!React.isValidElement(child)) return;
      const p = child.props as Record<string, unknown>;
      if (child.type === React.Fragment) { walk(p.children as React.ReactNode); return; }
      if (typeof child.type !== 'string' || !tags.has(child.type)) return;
      const attrs: Record<string, string> = {};
      for (const [key, name] of Object.entries(attributes)) {
        const value = p[key] ?? (['fill', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin'].includes(key) ? props[key as keyof typeof props] : undefined);
        if (typeof value === 'string' || typeof value === 'number') attrs[name] = String(value);
      }
      shapes.push({ tag: child.type, attrs });
    });
  };
  walk(props.children);
  return shapes.length ? { viewBox: props.viewBox || '0 0 16 16', shapes } : null;
}

/** Use recognizable symbols for common actions and a neutral mark for unknown ones. */
export function fallbackIconForAssignment(assignment?: { iconId?: string; label?: string; binding?: string; actionType?: string }): string {
  if (assignment?.iconId && overlayIconFor(assignment.iconId)) return assignment.iconId;
  const binding = (assignment?.binding || '').trim();
  const label = (assignment?.label || '').trim();
  if ((!binding || /^(blank|unassigned|—)$/i.test(binding)) && (!label || /^(blank|unassigned|—)$/i.test(label))) return 'empty';
  const action = `${label} ${binding}`.toLowerCase();
  if (/\b(copy|duplicate)\b/.test(action)) return 'copy-plus';
  if (/\b(web|url|website|browser)\b|https?:/.test(action)) return 'globe';
  if (/\b(volume|mute|audio)\b/.test(action)) return 'volume';
  if (/\b(terminal|command|cmd)\b/.test(action)) return 'terminal';
  if (/\b(image|photo|picture)\b/.test(action)) return 'image';
  if (/\b(play|video|media)\b/.test(action)) return 'play-triangle';
  if (/\b(lock)\b/.test(action)) return 'lock';
  if (/\b(refresh|reload|sync)\b/.test(action)) return 'refresh';
  if (/\b(layer|profile)\b/.test(action)) return 'layers-plus';
  if (assignment?.actionType === 'Smart Action') return 'sparkles';
  return 'grid-four';
}

export function overlayIconForAssignment(assignment?: { iconId?: string; label?: string; binding?: string; actionType?: string }): OverlayIcon {
  const id = fallbackIconForAssignment(assignment);
  if (id === 'empty') return { viewBox: '0 0 16 16', shapes: [{ tag: 'circle', attrs: { cx: '8', cy: '8', r: '1.5', fill: 'currentColor', stroke: 'none' } }] };
  return overlayIconFor(id)!;
}
