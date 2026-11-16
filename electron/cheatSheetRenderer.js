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
window.cheatSheet.onData(({ layer, keys, encoder, available }) => {
  document.getElementById('layer').textContent = available === false ? `LAYER ${layer} · SYNCING` : `LAYER ${layer}`;
  cells.forEach((cell, index) => { cell.textContent = keys[index] || ''; });
  for (const direction of ['ccw', 'press', 'cw']) {
    document.getElementById(`dial-${direction}`).textContent = encoder?.[direction] || '—';
  }
});
