'use strict';
const keys = document.getElementById('keys');
const dial = document.getElementById('dial');
const namespace = 'http://www.w3.org/2000/svg';
const tags = new Set(['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse']);
const attrs = new Set(['d', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']);
window.cheatSheet.onUpdate((data) => {
  keys.replaceChildren();
  dial.replaceChildren();
  const layer = data.layers[data.activeLayer];
  if (!layer) return;
  // Fixed directional glyphs, followed by each configured dial action label.
  const paths = ['M19 8a7 7 0 1 1-2-4 M17 1v5h-5', 'M12 5a7 7 0 1 0 0 14a7 7 0 0 0 0-14z', 'M5 8a7 7 0 1 0 2-4 M7 1v5h5'];
  layer.dial.forEach((text, index) => {
    const cell = document.createElement('div');
    cell.className = `key${index === 1 && data.pressed === 9 ? ' pressed' : ''}`;
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('d', paths[index]);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.8');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path); cell.append(svg);
    if (text && text !== '—') {
      const label = document.createElement('span');
      label.className = 'label'; label.textContent = text; cell.append(label);
    }
    dial.append(cell);
  });
  layer.keys.forEach((entry, index) => {
    const icon = entry.icon;
    const cell = document.createElement('div');
    cell.className = `key${data.pressed === index ? ' pressed' : ''}`;
    if (icon && ['0 0 16 16', '0 0 24 24'].includes(icon.viewBox)) {
      const svg = document.createElementNS(namespace, 'svg');
      svg.setAttribute('viewBox', icon.viewBox);
      svg.setAttribute('aria-hidden', 'true');
      for (const shape of icon.shapes) {
        if (!tags.has(shape.tag)) continue;
        const element = document.createElementNS(namespace, shape.tag);
        for (const [name, value] of Object.entries(shape.attrs)) {
          if (attrs.has(name) && typeof value === 'string' && value.length <= 8192 &&
              (/^(fill|stroke)$/.test(name) ? /^(none|currentColor|#[0-9a-f]{3,8})$/i.test(value) : /^[a-z0-9.,+\-\s]*$/i.test(value))) element.setAttribute(name, value);
        }
        svg.append(element);
      }
      cell.append(svg);
    }
    if (entry.label && entry.label !== '—') {
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = entry.label;
      cell.append(label);
    }
    keys.append(cell);
  });
});
