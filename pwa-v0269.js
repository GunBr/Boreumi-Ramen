(() => {
  "use strict";

  const standaloneQuery = window.matchMedia("(display-mode: standalone)");
  const fullscreenQuery = window.matchMedia("(display-mode: fullscreen)");
  const forceMobilePreview = new URLSearchParams(location.search).has("mobile");
  const isIOSStandalone = window.navigator.standalone === true;
  const isTouchMobile = forceMobilePreview || navigator.maxTouchPoints > 0 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  let registration = null;
  let applyRequested = false;
  let viewportFrame = 0;

  const state = {
    version: "0.26.9",
    installed: standaloneQuery.matches || fullscreenQuery.matches || isIOSStandalone,
    landscapeRequested: true,
    cssLandscapeFallback: false,
    orientationLockSupported: typeof screen.orientation?.lock === "function",
    orientationLocked: false,
    serviceWorkerRegistered: false,
    offlineCacheRequested: false,
    offlineCache: { loaded: 0, total: 0, complete: false },
    updateAvailable: false,
    storagePersisted: false,
    logicalViewport: { width: innerWidth, height: innerHeight },
    visualViewport: { width: innerWidth, height: innerHeight, offsetLeft: 0, offsetTop: 0 },
    readyPromise: null,
    toLogicalPoint(point) {
      if (!this.cssLandscapeFallback) return { x: point.x, y: point.y };
      const x = point.x - this.visualViewport.offsetLeft;
      const y = point.y - this.visualViewport.offsetTop;
      return { x: y, y: this.logicalViewport.height - x };
    }
  };

  window.BoreumiPWA = state;
  document.documentElement.dataset.pwa = "enabled";
  document.documentElement.dataset.mobileLayout = String(isTouchMobile);

  function viewportSize() {
    const viewport = window.visualViewport;
    const layoutWidth = Math.round(innerWidth || 0);
    const layoutHeight = Math.round(innerHeight || 0);
    const visualWidth = Math.round(viewport?.width || 0);
    const visualHeight = Math.round(viewport?.height || 0);
    const installedSurface = isIOSStandalone || standaloneQuery.matches || fullscreenQuery.matches;
    const installedWidth = installedSurface ? Math.round(window.screen?.width || 0) : 0;
    const installedHeight = installedSurface ? Math.round(window.screen?.height || 0) : 0;
    /* iOS can temporarily report a shorter visual viewport while its browser chrome is
       retracting. Keep the larger stable layout size so the rotated canvas does not
       leave a permanent black strip on the physical bottom edge. */
    return {
      width: Math.max(layoutWidth, visualWidth, installedWidth),
      height: Math.max(layoutHeight, visualHeight, installedHeight),
      offsetLeft: Math.round(viewport?.offsetLeft || 0),
      offsetTop: Math.round(viewport?.offsetTop || 0)
    };
  }

  function applyLandscapeFrameNow() {
    viewportFrame = 0;
    const physical = viewportSize();
    const shouldRotate = isTouchMobile && physical.height > physical.width;
    const logicalWidth = shouldRotate ? physical.height : physical.width;
    const logicalHeight = shouldRotate ? physical.width : physical.height;
    state.cssLandscapeFallback = shouldRotate;
    state.logicalViewport = { width: logicalWidth, height: logicalHeight };
    state.visualViewport = physical;
    document.documentElement.dataset.forceLandscape = String(shouldRotate);
    document.documentElement.dataset.mobileLayout = String(isTouchMobile);
    document.documentElement.style.setProperty("--app-landscape-width", `${logicalWidth}px`);
    document.documentElement.style.setProperty("--app-landscape-height", `${logicalHeight}px`);
    document.documentElement.style.setProperty("--app-visual-offset-left", `${physical.offsetLeft}px`);
    document.documentElement.style.setProperty("--app-visual-offset-top", `${physical.offsetTop}px`);
    window.scrollTo(0, 0);
    window.dispatchEvent(new CustomEvent("boreumi:viewport", { detail: { ...state.logicalViewport, rotated: shouldRotate } }));
  }

  function applyLandscapeFrame() {
    if (viewportFrame) cancelAnimationFrame(viewportFrame);
    viewportFrame = requestAnimationFrame(applyLandscapeFrameNow);
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

  async function ensurePersistentStorage() {
    if (!navigator.storage?.persist) return false;
    try {
      state.storagePersisted = await navigator.storage.persist();
      document.documentElement.dataset.storage = state.storagePersisted ? "persistent" : "best-effort";
    } catch {
      state.storagePersisted = false;
      document.documentElement.dataset.storage = "best-effort";
    }
    window.dispatchEvent(new CustomEvent("boreumi:storage", { detail: { persisted: state.storagePersisted } }));
    return state.storagePersisted;
  }

  function refreshDisplayMode() {
    state.installed = standaloneQuery.matches || fullscreenQuery.matches || window.navigator.standalone === true;
    document.documentElement.dataset.displayMode = state.installed ? "installed" : "browser";
    applyLandscapeFrame();
    if (state.installed) requestLandscapeLock();
  }

  function showUpdate(worker = registration?.waiting) {
    if (!worker) return false;
    state.updateAvailable = true;
    state.waitingWorker = worker;
    const banner = document.querySelector("#updateBanner");
    if (banner) banner.hidden = false;
    window.dispatchEvent(new CustomEvent("boreumi:update-ready"));
    return true;
  }

  function activateExpectedUpdate(worker) {
    if (!worker || !navigator.serviceWorker.controller) return false;
    const activationKey = "boreumi-sw-activate-0267";
    if (sessionStorage.getItem(activationKey) === "done") return false;
    sessionStorage.setItem(activationKey, "done");
    applyRequested = true;
    worker.postMessage({ type: "SKIP_WAITING" });
    return true;
  }

  async function checkForUpdate() {
    if (!registration) return false;
    try {
      await registration.update();
      if (registration.waiting) return showUpdate(registration.waiting);
      window.dispatchEvent(new CustomEvent("boreumi:update-checked", { detail: { available: false } }));
      return false;
    } catch {
      window.dispatchEvent(new CustomEvent("boreumi:update-checked", { detail: { available: false, error: true } }));
      return false;
    }
  }

  function observeUpdates(currentRegistration) {
    if (currentRegistration.waiting && navigator.serviceWorker.controller && !activateExpectedUpdate(currentRegistration.waiting)) showUpdate(currentRegistration.waiting);
    currentRegistration.addEventListener("updatefound", () => {
      const installing = currentRegistration.installing;
      installing?.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller && !activateExpectedUpdate(installing)) showUpdate(installing);
      });
    });
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) {
      document.documentElement.dataset.offline = "unavailable";
      return state;
    }
    try {
      registration = await navigator.serviceWorker.register("./service-worker.js?v=0267", { scope: "./", updateViaCache: "none" });
      state.serviceWorkerRegistered = true;
      document.documentElement.dataset.offline = "ready";
      observeUpdates(registration);
      await registration.update().catch(() => undefined);
      if (registration.waiting && navigator.serviceWorker.controller) activateExpectedUpdate(registration.waiting);
      const readyRegistration = await navigator.serviceWorker.ready;
      const worker = readyRegistration.active || registration.active || registration.waiting;
      worker?.postMessage({ type: "CACHE_GAME" });
      state.offlineCacheRequested = true;
    } catch {
      document.documentElement.dataset.offline = "error";
    }
    return state;
  }

  navigator.serviceWorker?.addEventListener("message", event => {
    if (event.data?.type !== "CACHE_PROGRESS") return;
    state.offlineCache = {
      loaded: Math.max(0, Number(event.data.loaded) || 0),
      total: Math.max(0, Number(event.data.total) || 0),
      complete: event.data.complete === true
    };
    document.documentElement.dataset.offline = state.offlineCache.complete ? "complete" : "caching";
    window.dispatchEvent(new CustomEvent("boreumi:cache-progress", { detail: state.offlineCache }));
  });

  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    if (applyRequested) location.reload();
  });

  document.querySelector("#applyUpdateButton")?.addEventListener("click", () => {
    const worker = state.waitingWorker || registration?.waiting;
    if (!worker) return;
    applyRequested = true;
    const button = document.querySelector("#applyUpdateButton");
    if (button) {
      button.disabled = true;
      button.textContent = "적용 중...";
    }
    worker.postMessage({ type: "SKIP_WAITING" });
  });
  document.querySelector("#dismissUpdateButton")?.addEventListener("click", () => {
    const banner = document.querySelector("#updateBanner");
    if (banner) banner.hidden = true;
  });

  standaloneQuery.addEventListener?.("change", refreshDisplayMode);
  fullscreenQuery.addEventListener?.("change", refreshDisplayMode);
  window.addEventListener("pageshow", refreshDisplayMode, { passive: true });
  window.addEventListener("resize", applyLandscapeFrame, { passive: true });
  window.addEventListener("orientationchange", applyLandscapeFrame, { passive: true });
  window.visualViewport?.addEventListener("resize", applyLandscapeFrame, { passive: true });
  window.visualViewport?.addEventListener("scroll", applyLandscapeFrame, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      applyLandscapeFrame();
      checkForUpdate();
      if (state.installed) requestLandscapeLock();
    }
  });
  document.addEventListener("gesturestart", event => event.preventDefault(), { passive: false });
  document.addEventListener("pointerdown", () => {
    requestLandscapeLock();
    ensurePersistentStorage();
  }, { once: true, passive: true });

  state.checkForUpdate = checkForUpdate;
  state.ensurePersistentStorage = ensurePersistentStorage;
  state.showUpdatePreview = () => showUpdate({ postMessage() {} });
  refreshDisplayMode();
  state.readyPromise = registerServiceWorker();
})();
