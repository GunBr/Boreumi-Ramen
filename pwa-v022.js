(() => {
  "use strict";

  const standaloneQuery = window.matchMedia("(display-mode: standalone)");
  const fullscreenQuery = window.matchMedia("(display-mode: fullscreen)");
  const forceMobilePreview = new URLSearchParams(location.search).has("mobile");
  const isIOSStandalone = window.navigator.standalone === true;
  const isTouchMobile = forceMobilePreview || navigator.maxTouchPoints > 0 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const state = {
    version: "0.22",
    installed: standaloneQuery.matches || fullscreenQuery.matches || isIOSStandalone,
    landscapeRequested: true,
    cssLandscapeFallback: false,
    orientationLockSupported: typeof screen.orientation?.lock === "function",
    orientationLocked: false,
    serviceWorkerRegistered: false,
    offlineCacheRequested: false,
    logicalViewport: { width: innerWidth, height: innerHeight },
    readyPromise: null,
    toLogicalPoint(point) {
      if (!this.cssLandscapeFallback) return { x: point.x, y: point.y };
      return { x: point.y, y: this.logicalViewport.height - point.x };
    }
  };

  window.BoreumiPWA = state;
  document.documentElement.dataset.pwa = "enabled";

  function viewportSize() {
    const viewport = window.visualViewport;
    return {
      width: Math.round(viewport?.width || innerWidth),
      height: Math.round(viewport?.height || innerHeight)
    };
  }

  function applyLandscapeFrame() {
    const physical = viewportSize();
    const shouldRotate = isTouchMobile && physical.height > physical.width;
    const logicalWidth = shouldRotate ? physical.height : physical.width;
    const logicalHeight = shouldRotate ? physical.width : physical.height;
    state.cssLandscapeFallback = shouldRotate;
    state.logicalViewport = { width: logicalWidth, height: logicalHeight };
    document.documentElement.dataset.forceLandscape = String(shouldRotate);
    document.documentElement.style.setProperty("--app-landscape-width", `${logicalWidth}px`);
    document.documentElement.style.setProperty("--app-landscape-height", `${logicalHeight}px`);
    window.dispatchEvent(new CustomEvent("boreumi:viewport", { detail: state.logicalViewport }));
  }

  async function requestLandscapeLock() {
    if (!isTouchMobile || typeof screen.orientation?.lock !== "function") return false;
    try {
      await screen.orientation.lock("landscape");
      state.orientationLocked = true;
      document.documentElement.dataset.orientationLock = "landscape";
      return true;
    } catch {
      state.orientationLocked = false;
      document.documentElement.dataset.orientationLock = "css-fallback";
      return false;
    }
  }

  function refreshDisplayMode() {
    state.installed = standaloneQuery.matches || fullscreenQuery.matches || window.navigator.standalone === true;
    document.documentElement.dataset.displayMode = state.installed ? "installed" : "browser";
    applyLandscapeFrame();
    if (state.installed) requestLandscapeLock();
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) {
      document.documentElement.dataset.offline = "unavailable";
      return state;
    }
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
      state.serviceWorkerRegistered = true;
      document.documentElement.dataset.offline = "ready";
      const readyRegistration = await navigator.serviceWorker.ready;
      const worker = readyRegistration.active || registration.active || registration.waiting;
      worker?.postMessage({ type: "CACHE_GAME" });
      state.offlineCacheRequested = true;
    } catch {
      document.documentElement.dataset.offline = "error";
    }
    return state;
  }

  standaloneQuery.addEventListener?.("change", refreshDisplayMode);
  fullscreenQuery.addEventListener?.("change", refreshDisplayMode);
  window.addEventListener("pageshow", refreshDisplayMode, { passive: true });
  window.addEventListener("resize", applyLandscapeFrame, { passive: true });
  window.visualViewport?.addEventListener("resize", applyLandscapeFrame, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      applyLandscapeFrame();
      if (state.installed) requestLandscapeLock();
    }
  });
  document.addEventListener("pointerdown", requestLandscapeLock, { once: true, passive: true });

  refreshDisplayMode();
  state.readyPromise = registerServiceWorker();
})();
