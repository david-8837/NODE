const appRoot = document.getElementById('root');
const loadingScreen = document.getElementById('app-loading-screen');

if (appRoot && loadingScreen) {
  let hidden = false;

  const hideLoadingScreen = () => {
    if (hidden || appRoot.childElementCount === 0) return;

    hidden = true;
    observer.disconnect();
    loadingScreen.setAttribute('aria-busy', 'false');
    loadingScreen.classList.add('is-hidden');
  };

  const observer = new MutationObserver(hideLoadingScreen);
  observer.observe(appRoot, { childList: true });
  hideLoadingScreen();
}
