const minimumVisibleMs = 350;
const APP_READY_EVENT = 'node:app-ready';

const appRoot = document.getElementById('root');
const loadingScreen = document.getElementById('app-loading-screen');
const startedAt = performance.now();

if (appRoot && loadingScreen) {
  let hidden = false;
  let revealTimer: number | null = null;

  const revealWhenReady = () => {
    if (hidden || appRoot.childElementCount === 0) return;

    const remainingMs = minimumVisibleMs - (performance.now() - startedAt);
    if (remainingMs > 0) {
      if (revealTimer !== null) window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(revealWhenReady, remainingMs);
      return;
    }

    hidden = true;
    revealTimer = null;
    observer.disconnect();
    loadingScreen.setAttribute('aria-busy', 'false');
    loadingScreen.classList.add('is-hidden');
    appRoot.classList.add('is-ready');
    window.dispatchEvent(new Event(APP_READY_EVENT));
  };

  const observer = new MutationObserver(() => {
    if (hidden || appRoot.childElementCount === 0) return;
    revealWhenReady();
  });

  observer.observe(appRoot, { childList: true });
  if (appRoot.childElementCount > 0) revealWhenReady();
}
