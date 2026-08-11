(() => {
  "use strict";

  const startedAt = performance.now();
  let dataReadyResolve;
  let gameReadyResolve;
  const dataReady = new Promise(resolve => { dataReadyResolve = resolve; });
  const gameReady = new Promise(resolve => { gameReadyResolve = resolve; });
  const criticalAssets = [
    "assets/art-v012/environment-cozy-pocha-level1-v6.png",
    "assets/art-v012/environment-river-moon-v5.png",
    "assets/art-v012/sign-full-moon-v1.png",
    "assets/art-v012/hud-panel-v1.png",
    "assets/art-v012/dock-racks-v1.png",
    "assets/art-v012/dock-rack-frame-v1.png",
    "assets/art-v012/dock-slot-v1.png",
    "assets/art-v012/boreumi-idle-v3.png",
    "assets/art-v012/boreumi-cook-noodle-v3.png",
    "assets/art-v012/boreumi-serve-back-v3.png",
    "assets/art-v012/ppomi-sleep.png",
    "assets/art-v012/ppomi-groom.png",
    "assets/art-v012/ppomi-wave.png",
    "assets/art-v012/guest-chair.png",
    "assets/art-v012/customer-office.png",
    "assets/art-v012/kitchen-pot.png",
    "assets/art-v012/kitchen-grill.png",
    "assets/art-v012/kitchen-oden-v3.png",
    "assets/art-v012/ingredient-noodle-v4.png",
    "assets/art-v012/ingredient-egg-v4.png",
    "assets/art-v012/ingredient-dumpling-v4.png",
    "assets/art-v012/ingredient-oden-v4.png",
    "assets/art-v012/drink-soju-v1.png",
    "assets/art-v012/food-ramen-no-egg-v3.png"
  ];

  const state = {
    version: "0.22",
    dataReady: false,
    gameReady: false,
    resourcesLoaded: 0,
    resourcesTotal: criticalAssets.length,
    complete: false,
    failedAssets: []
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

  async function waitForPWA() {
    const pwaReady = window.BoreumiPWA?.readyPromise;
    if (!pwaReady) return;
    await Promise.race([pwaReady, new Promise(resolve => setTimeout(resolve, 4500))]);
  }

  const readyPromise = (async () => {
    update(4, "저장 데이터를 확인하고 있어요...");
    await dataReady;
    update(18, "포차와 손님 자리를 준비하고 있어요...");
    await gameReady;
    update(32, "게임 일러스트를 불러오는 중...");
    for (let index = 0; index < criticalAssets.length; index += 1) {
      const loaded = await preload(criticalAssets[index]);
      state.resourcesLoaded = index + 1;
      if (!loaded) state.failedAssets.push(criticalAssets[index]);
      update(32 + (state.resourcesLoaded / state.resourcesTotal) * 55, `게임 리소스 불러오는 중 · ${state.resourcesLoaded}/${state.resourcesTotal}`);
    }
    if (document.fonts?.ready) await document.fonts.ready.catch(() => undefined);
    update(92, "오프라인 실행 데이터를 준비하고 있어요...");
    await waitForPWA();
    const remaining = Math.max(0, 760 - (performance.now() - startedAt));
    if (remaining) await new Promise(resolve => setTimeout(resolve, remaining));
    update(100, "준비 완료!");
    await new Promise(resolve => setTimeout(resolve, 180));
    state.complete = true;
    document.documentElement.dataset.boot = "ready";
    window.dispatchEvent(new CustomEvent("boreumi:ready"));
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
