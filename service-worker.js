"use strict";

const CACHE_VERSION = "boreumi-ramen-v0262-0828a";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./app.webmanifest",
  "./style.css",
  "./character-layout.css",
  "./art-v012.css",
  "./environment-v012.css",
  "./resolution-v012.css",
  "./cozy-level1.css",
  "./effects-v016.css",
  "./tutorial-v017.css",
  "./expansion-v018.css",
  "./endless-v0181.css",
  "./progression-v019.css",
  "./takeout-v020.css",
  "./pwa-v024.css",
  "./experience-v024.css",
  "./mobile-v024.css",
  "./story-v024.css",
  "./readability-v025.css",
  "./dev-tools-v0251.css",
  "./menu-v026.css",
  "./patch-v0261.css",
  "./patch-v0262.css",
  "./boot-v024.js",
  "./pwa-v024.js",
  "./script.js",
  "./assets/pwa/icon-180.png",
  "./assets/pwa/icon-192.png",
  "./assets/pwa/icon-512.png",
  "./assets/art-v012/environment-cozy-pocha-level1-v6.webp",
  "./assets/art-v012/environment-river-moon-v5.webp",
  "./assets/art-v012/sign-full-moon-v1.webp",
  "./assets/art-v012/hud-panel-v1.webp",
  "./assets/art-v012/dock-racks-v1.webp",
  "./assets/art-v012/dock-rack-frame-v1.webp",
  "./assets/art-v012/dock-slot-v1.webp",
  "./assets/art-v012/boreumi-idle-v3.webp",
  "./assets/art-v012/ppomi-sleep.webp",
  "./assets/art-v012/guest-chair.webp",
  "./assets/art-v012/kitchen-pot.webp",
  "./assets/art-v012/kitchen-grill.webp",
  "./assets/art-v012/kitchen-oden-v3.webp",
  "./assets/art-v012/ingredient-noodle-v4.webp",
  "./assets/art-v012/ingredient-egg-v4.webp",
  "./assets/art-v012/ingredient-dumpling-v4.webp",
  "./assets/art-v012/ingredient-oden-v4.webp",
  "./assets/art-v025/ingredient-scallion-v1.webp",
  "./assets/art-v025/ingredient-kimchi-v1.webp",
  "./assets/art-v025/ingredient-cheese-v1.webp"
  ,"./assets/art-v0261/cooking-ramen-plain-no-scallion-v1.webp"
  ,"./assets/art-v0261/food-ramen-plain-no-scallion-v1.webp"
  ,"./assets/art-v0262/food-ramen-egg-no-scallion-v1.webp"
  ,"./assets/art-v025/food-ramen-scallion-v1.webp"
  ,"./assets/art-v025/food-ramen-kimchi-v1.webp"
  ,"./assets/art-v025/food-ramen-cheese-v1.webp"
  ,"./assets/art-v026/food-ramen-egg-scallion-v1.webp"
  ,"./assets/art-v026/food-ramen-kimchi-egg-v1.webp"
  ,"./assets/art-v026/food-ramen-cheese-egg-v1.webp"
  ,"./assets/art-v026/food-ramen-kimchi-cheese-v1.webp"
];

const GAME_ASSETS = [
  "./assets/art-v012/boreumi-cook-egg-v3.webp",
  "./assets/art-v012/boreumi-cook-grill-v3.webp",
  "./assets/art-v012/boreumi-cook-noodle-v3.webp",
  "./assets/art-v012/boreumi-cook-oden-v3.webp",
  "./assets/art-v012/boreumi-egg-v2.webp",
  "./assets/art-v012/boreumi-grill-v2.webp",
  "./assets/art-v012/boreumi-noodle-v2.webp",
  "./assets/art-v012/boreumi-oden-v2.webp",
  "./assets/art-v012/boreumi-serve-back-v3.webp",
  "./assets/art-v012/completion-pass-vertical-v1.webp",
  "./assets/art-v012/cooking-dumpling.webp",
  "./assets/art-v012/cooking-oden-v2.webp",
  "./assets/art-v012/cooking-ramen.webp",
  "./assets/art-v012/customer-artist-v1.webp",
  "./assets/art-v012/customer-baker.webp",
  "./assets/art-v012/customer-baker-v2.webp",
  "./assets/art-v012/customer-cleaner-v1.webp",
  "./assets/art-v012/customer-driver-v1.webp",
  "./assets/art-v012/customer-firefighter-v1.webp",
  "./assets/art-v012/customer-fisher-v1.webp",
  "./assets/art-v012/customer-florist-v1.webp",
  "./assets/art-v012/customer-grandma-v1.webp",
  "./assets/art-v012/customer-guard-v1.webp",
  "./assets/art-v012/customer-merchant-v1.webp",
  "./assets/art-v012/customer-musician-v1.webp",
  "./assets/art-v012/customer-nurse-v1.webp",
  "./assets/art-v012/customer-office.webp",
  "./assets/art-v012/customer-police-v1.webp",
  "./assets/art-v012/customer-rider.webp",
  "./assets/art-v012/customer-student.webp",
  "./assets/art-v012/customer-teacher-v1.webp",
  "./assets/art-v012/customer-traveler-v1.webp",
  "./assets/art-v012/drink-beer-v1.webp",
  "./assets/art-v012/drink-makgeolli-v1.webp",
  "./assets/art-v012/drink-soju-v1.webp",
  "./assets/art-v012/drink-somaek-v1.webp",
  "./assets/art-v012/food-dumpling-v2.webp",
  "./assets/art-v012/food-oden.webp",
  "./assets/art-v012/food-ramen-no-egg-v3.webp",
  "./assets/art-v012/food-ramen-v2.webp",
  "./assets/art-v0262/food-ramen-egg-no-scallion-v1.webp",
  "./assets/art-v025/food-ramen-scallion-v1.webp",
  "./assets/art-v025/food-ramen-kimchi-v1.webp",
  "./assets/art-v025/food-ramen-cheese-v1.webp",
  "./assets/art-v026/food-ramen-egg-scallion-v1.webp",
  "./assets/art-v026/food-ramen-kimchi-egg-v1.webp",
  "./assets/art-v026/food-ramen-cheese-egg-v1.webp",
  "./assets/art-v026/food-ramen-kimchi-cheese-v1.webp",
  "./assets/art-v012/guest-center-wood-panel-v2.webp",
  "./assets/art-v012/pause-button-v2.webp",
  "./assets/art-v012/ppomi-groom.webp",
  "./assets/art-v012/ppomi-wave.webp",
  "./assets/art-v012/start-button-v1.webp",
  "./assets/art-v012/takeout-package-v1.webp",
  "./assets/art-v012/water-surface-v1.webp",
  "./assets/foods/egg.svg",
  "./assets/foods/noodle.svg",
  "./assets/foods/pot_empty.svg",
  "./assets/foods/pot_noodle.svg",
  "./assets/foods/pot_water.svg",
  "./assets/foods/ramen.svg",
  "./assets/foods/ramen_egg.svg"
];

function sendProgress(client, loaded, total, complete = false) {
  client?.postMessage?.({ type: "CACHE_PROGRESS", loaded, total, complete });
}

async function cacheIndividually(urls, client = null) {
  const cache = await caches.open(CACHE_VERSION);
  let loaded = 0;
  sendProgress(client, loaded, urls.length, false);
  for (const url of urls) {
    try {
      await cache.add(new Request(url, { cache: "reload" }));
    } catch {
      // A single optional illustration must not prevent the app shell from installing.
    }
    loaded += 1;
    sendProgress(client, loaded, urls.length, loaded === urls.length);
  }
}

async function fetchWithTimeout(request, timeoutMs = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener("install", event => {
  event.waitUntil(cacheIndividually(CORE_ASSETS));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("boreumi-ramen-") && key !== CACHE_VERSION).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type === "CACHE_GAME") event.waitUntil(cacheIndividually(GAME_ASSETS, event.source));
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetchWithTimeout(request);
        const cache = await caches.open(CACHE_VERSION);
        cache.put("./index.html", response.clone());
        return response;
      } catch {
        return (await caches.match("./index.html")) || (await caches.match("./")) || new Response("오프라인 게임을 준비하지 못했어요.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  })());
});
