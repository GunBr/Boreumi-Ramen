(() => {
  "use strict";

  const startedAt = performance.now();
  let dataReadyResolve;
  let gameReadyResolve;
  const dataReady = new Promise(resolve => { dataReadyResolve = resolve; });
  const gameReady = new Promise(resolve => { gameReadyResolve = resolve; });
  const criticalAssets = [
    "assets/art-v012/environment-cozy-pocha-level1-v6.webp",
    "assets/art-v012/environment-river-moon-v5.webp",
    "assets/art-v012/sign-full-moon-v1.webp",
    "assets/art-v012/hud-panel-v1.webp",
    "assets/art-v012/dock-racks-v1.webp",
    "assets/art-v012/dock-rack-frame-v1.webp",
    "assets/art-v012/dock-slot-v1.webp",
    "assets/art-v012/boreumi-idle-v3.webp",
    "assets/art-v012/boreumi-cook-noodle-v3.webp",
    "assets/art-v012/boreumi-serve-back-v3.webp",
    "assets/art-v012/ppomi-sleep.webp",
    "assets/art-v012/ppomi-groom.webp",
    "assets/art-v012/ppomi-wave.webp",
    "assets/art-v012/guest-chair.webp",
    "assets/art-v012/customer-office.webp",
    "assets/art-v012/kitchen-pot.webp",
    "assets/art-v012/kitchen-grill.webp",
    "assets/art-v012/kitchen-oden-v3.webp",
    "assets/art-v012/ingredient-noodle-v4.webp",
    "assets/art-v012/ingredient-egg-v4.webp",
    "assets/art-v012/ingredient-dumpling-v4.webp",
    "assets/art-v012/ingredient-oden-v4.webp",
    "assets/art-v025/ingredient-scallion-v1.webp",
    "assets/art-v025/ingredient-kimchi-v1.webp",
    "assets/art-v025/ingredient-cheese-v1.webp",
    "assets/art-v025/food-ramen-scallion-v1.webp",
    "assets/art-v025/food-ramen-kimchi-v1.webp",
    "assets/art-v025/food-ramen-cheese-v1.webp",
    "assets/art-v026/food-ramen-egg-scallion-v1.webp",
    "assets/art-v026/food-ramen-kimchi-egg-v1.webp",
    "assets/art-v026/food-ramen-cheese-egg-v1.webp",
    "assets/art-v026/food-ramen-kimchi-cheese-v1.webp",
    "assets/art-v0261/cooking-ramen-plain-no-scallion-v1.webp",
    "assets/art-v0261/food-ramen-plain-no-scallion-v1.webp",
    "assets/art-v0262/food-ramen-egg-no-scallion-v1.webp",
    "assets/art-v0263/kitchen-worktable-v1.webp",
    "assets/art-v0263/cooking-oden-two-v1.webp",
    "assets/art-v0263/cooking-oden-one-v1.webp",
    "assets/art-v0265/guest-counter-shelf-v1.webp",
    "assets/art-v012/drink-soju-v1.webp",
    "assets/art-v0261/food-ramen-plain-no-scallion-v1.webp"
  ];

  const state = {
    version: "0.26.7",
    dataReady: false,
    gameReady: false,
    resourcesLoaded: 0,
    resourcesTotal: criticalAssets.length,
    complete: false,
    failedAssets: [],
    elapsedMs: 0
  };

  function update(percent, message) {
    const value = Math.max(0, Math.min(100, Math.round(percent)));
    const bar = document.querySelector("#bootProgress");
    const label = document.querySelector("#bootPercent");
    const copy = document.querySelector("#bootMessage");
    if (bar) bar.style.width = `${value}%`;
    if (label) label.textContent = `${value}%`;
    if (copy && message) copy.textContent = message;
  }

  function preload(url) {
    return new Promise(resolve => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = new URL(url, document.baseURI).href;
      if (image.complete) resolve(image.naturalWidth > 0);
    });
  }

  async function preloadCriticalAssets(concurrency = 4) {
    let cursor = 0;
    const worker = async () => {
      while (cursor < criticalAssets.length) {
        const index = cursor;
        cursor += 1;
        const loaded = await preload(criticalAssets[index]);
        state.resourcesLoaded += 1;
        if (!loaded) state.failedAssets.push(criticalAssets[index]);
        update(32 + (state.resourcesLoaded / state.resourcesTotal) * 55, `게임 리소스 불러오는 중 · ${state.resourcesLoaded}/${state.resourcesTotal}`);
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, criticalAssets.length) }, worker));
  }

  async function waitForPWA() {
    const pwaReady = window.BoreumiPWA?.readyPromise;
    if (!pwaReady) return;
    await Promise.race([pwaReady, new Promise(resolve => setTimeout(resolve, 4200))]);
  }

  const readyPromise = (async () => {
    update(4, "저장 데이터와 자동 백업을 확인하고 있어요...");
    await dataReady;
    update(18, "포차와 손님 자리를 준비하고 있어요...");
    await gameReady;
    update(32, "게임 일러스트를 빠르게 불러오는 중...");
    await preloadCriticalAssets();
    if (document.fonts?.ready) await document.fonts.ready.catch(() => undefined);
    update(92, "오프라인 실행과 업데이트를 확인하고 있어요...");
    await waitForPWA();
    const remaining = Math.max(0, 620 - (performance.now() - startedAt));
    if (remaining) await new Promise(resolve => setTimeout(resolve, remaining));
    update(100, state.failedAssets.length ? "일부 장식은 영업 중 다시 준비할게요" : "준비 완료!");
    await new Promise(resolve => setTimeout(resolve, 160));
    state.complete = true;
    state.elapsedMs = Math.round(performance.now() - startedAt);
    document.documentElement.dataset.boot = "ready";
    window.dispatchEvent(new CustomEvent("boreumi:ready", { detail: state }));
    return state;
  })();

  window.BoreumiBoot = {
    state,
    readyPromise,
    markDataReady() {
      if (state.dataReady) return;
      state.dataReady = true;
      dataReadyResolve();
    },
    markGameReady() {
      if (state.gameReady) return;
      state.gameReady = true;
      gameReadyResolve();
    }
  };
})();
