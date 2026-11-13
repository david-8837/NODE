'use strict';
const keys = document.getElementById('keys');
const namespace = 'http://www.w3.org/2000/svg';
const tags = new Set(['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse']);
const attrs = new Set(['d', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']);
window.cheatSheet.onUpdate((data) => {
  keys.replaceChildren();
  const layer = data.layers[data.activeLayer];
  if (!layer) return;
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
