;(() => {
  const root = document.getElementById("root");
  if (!root || root.classList.contains("is-ready")) return;

  const reducedMotionQuery = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  const activeAnimations = [];
  let started = false;
  const cancelEntrance = () => {
    for (const animation of activeAnimations) animation.cancel();
    activeAnimations.length = 0;
  };
  const onMotionPreferenceChange = (event) => {
    if (event.matches) cancelEntrance();
  };
  if (reducedMotionQuery?.addEventListener) {
    reducedMotionQuery.addEventListener("change", onMotionPreferenceChange);
  } else if (reducedMotionQuery?.addListener) {
    reducedMotionQuery.addListener(onMotionPreferenceChange);
  }

  window.addEventListener("node:app-ready", () => {
    if (started) return;
    started = true;
    if (reducedMotionQuery?.matches) return;

    const animate = (element, delay, duration = 0.44, offsetY = 14, initialScale = 0.985, fadeOnly = false) => {
      if (!element || typeof element.animate !== "function") return;
      const keyframes = fadeOnly
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            {
              opacity: 0,
              transform: "translate3d(0, " + offsetY + "px, 0) scale(" + initialScale + ")",
            },
            { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
          ];
      const animation = element.animate(
        keyframes,
        {
          duration: duration * 1000,
          delay: delay * 1000,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both",
        }
      );
      animation.onfinish = () => animation.cancel();
      activeAnimations.push(animation);
    };

    const app = root.firstElementChild;
    const main = app?.querySelector("main");
    const controls = main?.firstElementChild?.children;
    const header = app?.querySelector("header");
    animate(header, 0.03, 0.44, -12, 0.99);
    animate(controls?.[0], 0.12);
    animate(controls?.[1], 0.19);
    animate(controls?.[2], 0.26);

    const centerControls = main?.children[1]?.firstElementChild;
    const device = centerControls?.children[0];
    animate(device, 0.3, 0.5, 0, 1, true);
    animate(centerControls?.children[1], 1.2, 0.42, 8, 0.99);
    animate(main?.children[2], 0.35, 0.4, 0, 1, true);

    const indicatorRow = device
      ? [...device.querySelectorAll("div")].find((element) =>
          element.classList.contains("grid-cols-3") &&
          element.classList.contains("h-[42px]") &&
          element.classList.contains("w-full")
        )
      : null;
    animate(indicatorRow?.children[0], 0.96, 0.4, 5, 0.98);
    animate(indicatorRow?.children[2], 0.96, 0.4, 5, 0.98);

    const keycaps = device?.querySelectorAll('button[data-drop-slot^="r"]') || [];
    [...keycaps].forEach((keycap, index) => {
      const slot = keycap.getAttribute("data-drop-slot") || "";
      const match = /^r(\d+)c(\d+)$/.exec(slot);
      const row = match ? Number(match[1]) - 1 : Math.floor(index / 3);
      const column = match ? Number(match[2]) - 1 : index % 3;
      animate(keycap, 0.58 + row * 0.11 + column * 0.035, 0.37, 7, 0.975);
    });
  }, { once: true });
})();