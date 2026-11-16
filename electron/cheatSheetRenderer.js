'use strict';
const container = document.getElementById('keys');
const cells = Array.from({ length: 9 }, () => {
  const element = document.createElement('div');
  element.className = 'key';
  container.appendChild(element);
  return element;
});
window.cheatSheet.onData(({ layer, keys, available }) => {
  document.getElementById('layer').textContent = available === false ? `LAYER ${layer} · SYNCING` : `LAYER ${layer}`;
  cells.forEach((cell, index) => { cell.textContent = keys[index] || ''; });
});
