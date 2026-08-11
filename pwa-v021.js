(() => {
  "use strict";

  const standaloneQuery = window.matchMedia("(display-mode: standalone)");
  const fullscreenQuery = window.matchMedia("(display-mode: fullscreen)");
  const isIOSStandalone = window.navigator.standalone === true;
  const isTouchMobile = navigator.maxTouchPoints > 0 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const state = {
    version: "0.21",
    installed: standaloneQuery.matches || fullscreenQuery.matches || isIOSStandalone,
    landscapeRequested: true,
    orientationLockSupported: typeof screen.orientation?.lock === "function",
    orientationLocked: false,
    serviceWorkerRegistered: false,
    offlineCacheRequested: false
  };

  window.BoreumiPWA = state;
  document.documentElement.dataset.pwa = "enabled";
  document.documentElement.dataset.displayMode = state.installed ? "installed" : "browser";

  async function requestLandscapeLock() {
    if (!isTouchMobile || typeof screen.orientation?.lock !== "function") return false;
    try {
      await screen.orientation.lock("landscape");
      state.orientationLocked = true;
      document.documentElement.dataset.orientationLock = "landscape";
      return true;
    } catch {
      state.orientationLocked = false;
      document.documentElement.dataset.orientationLock = "manifest";
      return false;
    }
  }

  function refreshDisplayMode() {
    state.installed = standaloneQuery.matches || fullscreenQuery.matches || window.navigator.standalone === true;
    document.documentElement.dataset.displayMode = state.installed ? "installed" : "browser";
    if (state.installed) requestLandscapeLock();
  }

  standaloneQuery.addEventListener?.("change", refreshDisplayMode);
  fullscreenQuery.addEventListener?.("change", refreshDisplayMode);
  window.addEventListener("pageshow", refreshDisplayMode, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.installed) requestLandscapeLock();
  });
  document.addEventListener("pointerdown", requestLandscapeLock, { once: true, passive: true });

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) {
      document.documentElement.dataset.offline = "unavailable";
      return;
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
  }

  if (state.installed) requestLandscapeLock();
  registerServiceWorker();
})();
