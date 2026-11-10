const mountPoint = document.getElementById('splash-cursor-root');

if (mountPoint) {
  Promise.all([import('react-dom/client'), import('../src/SplashCursor.jsx')]).then(
    ([{ createRoot }, { default: SplashCursor }]) => {
      if (!mountPoint.isConnected) return;

      createRoot(mountPoint).render(
        <SplashCursor
          rainbow
          size={1}
          force={1}
          swirl={3}
          trail={1}
          clickSplash
          quality="medium"
          theme="light"
        />
      );
    }
  );
}
