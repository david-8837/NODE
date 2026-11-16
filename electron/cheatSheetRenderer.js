'use strict';
if (new URLSearchParams(window.location.search).get('material') === 'acrylic') {
  document.documentElement.classList.add('native-acrylic');
}
const container = document.getElementById('keys');
const cells = Array.from({ length: 9 }, () => {
  const element = document.createElement('div');
  element.className = 'key';
  container.appendChild(element);
  return element;
});

// Only use an icon where the displayed assignment is unambiguous; unknown
// assignments remain text-only. SVG paths are fixed, never user-provided.
const icons = {
  copy: ['M9 9h11v11H9z', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
  paste: ['M8 4H5v17h14V4h-3', 'M9 3h6v4H9z'],
  cut: ['M8 8l12 12', 'M8 16L20 4', 'M8 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', 'M8 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'],
  undo: ['M9 14 4 9l5-5', 'M4 9h9a7 7 0 0 1 0 14h-2'],
  redo: ['m15 14 5-5-5-5', 'M20 9h-9a7 7 0 0 0 0 14h2'],
  save: ['M4 3h13l3 3v15H4z', 'M8 3v6h8V3', 'M8 21v-8h8v8'],
  find: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'm16 16 5 5'],
  mute: ['M11 5 6 9H2v6h4l5 4V5z', 'm16 9 6 6', 'm22 9-6 6'],
  play: ['M6 4v16l13-8z'],
  lock: ['M5 10h14v11H5z', 'M8 10V7a4 4 0 0 1 8 0v3'],
};
const iconNames = {
  'copy': 'copy', 'ctrl+c': 'copy', 'cmd+c': 'copy',
  'paste': 'paste', 'ctrl+v': 'paste', 'cmd+v': 'paste',
  'cut': 'cut', 'ctrl+x': 'cut', 'cmd+x': 'cut',
  'undo': 'undo', 'ctrl+z': 'undo', 'cmd+z': 'undo',
  'redo': 'redo', 'ctrl+y': 'redo', 'ctrl+shift+z': 'redo', 'cmd+shift+z': 'redo',
  'save': 'save', 'ctrl+s': 'save', 'cmd+s': 'save',
  'find': 'find', 'ctrl+f': 'find', 'cmd+f': 'find',
  'mute': 'mute', 'play': 'play', 'lock': 'lock',
};
function makeIcon(label) {
  const normalized = label.toLowerCase().replace(/\s+/g, '');
  if (!Object.hasOwn(iconNames, normalized)) return null;
  const name = iconNames[normalized];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of icons[name]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}
window.cheatSheet.onData(({ layer, keys, encoder, available }) => {
  document.getElementById('layer').textContent = available === false ? `LAYER ${layer} · SYNCING` : `LAYER ${layer}`;
  cells.forEach((cell, index) => {
    const label = keys[index] || '';
    cell.replaceChildren();
    if (!label) return;
    const icon = makeIcon(label);
    if (icon) cell.appendChild(icon);
    const text = document.createElement('span');
    text.className = 'key-label';
    text.textContent = label;
    cell.appendChild(text);
  });
  for (const direction of ['ccw', 'press', 'cw']) {
    document.getElementById(`dial-${direction}`).textContent = encoder?.[direction] || '—';
  }
});
