"use strict";

const CACHE_VERSION = "boreumi-ramen-v021-0821c";
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
  "./pwa-v021.css",
  "./pwa-v021.js",
  "./script.js",
  "./assets/pwa/icon-180.png",
  "./assets/pwa/icon-192.png",
  "./assets/pwa/icon-512.png",
  "./assets/art-v012/environment-cozy-pocha-level1-v6.png",
  "./assets/art-v012/environment-river-moon-v5.png",
  "./assets/art-v012/sign-full-moon-v1.png",
  "./assets/art-v012/hud-panel-v1.png",
  "./assets/art-v012/dock-racks-v1.png",
  "./assets/art-v012/dock-rack-frame-v1.png",
  "./assets/art-v012/dock-slot-v1.png",
  "./assets/art-v012/boreumi-idle-v3.png",
  "./assets/art-v012/ppomi-sleep.png",
  "./assets/art-v012/guest-chair.png",
  "./assets/art-v012/kitchen-pot.png",
  "./assets/art-v012/kitchen-grill.png",
  "./assets/art-v012/kitchen-oden-v3.png",
  "./assets/art-v012/ingredient-noodle-v4.png",
  "./assets/art-v012/ingredient-egg-v4.png",
  "./assets/art-v012/ingredient-dumpling-v4.png",
  "./assets/art-v012/ingredient-oden-v4.png"
];

const GAME_ASSETS = [
  "./assets/art-v012/boreumi-cook-egg-v3.png",
  "./assets/art-v012/boreumi-cook-grill-v3.png",
  "./assets/art-v012/boreumi-cook-noodle-v3.png",
  "./assets/art-v012/boreumi-cook-oden-v3.png",
  "./assets/art-v012/boreumi-egg-v2.png",
  "./assets/art-v012/boreumi-grill-v2.png",
  "./assets/art-v012/boreumi-noodle-v2.png",
  "./assets/art-v012/boreumi-oden-v2.png",
  "./assets/art-v012/boreumi-serve-back-v3.png",
  "./assets/art-v012/completion-pass-vertical-v1.png",
  "./assets/art-v012/cooking-dumpling.png",
  "./assets/art-v012/cooking-oden-v2.png",
  "./assets/art-v012/cooking-ramen.png",
  "./assets/art-v012/customer-artist-v1.png",
  "./assets/art-v012/customer-baker.png",
  "./assets/art-v012/customer-baker-v2.png",
  "./assets/art-v012/customer-cleaner-v1.png",
  "./assets/art-v012/customer-driver-v1.png",
  "./assets/art-v012/customer-firefighter-v1.png",
  "./assets/art-v012/customer-fisher-v1.png",
  "./assets/art-v012/customer-florist-v1.png",
  "./assets/art-v012/customer-grandma-v1.png",
  "./assets/art-v012/customer-guard-v1.png",
  "./assets/art-v012/customer-merchant-v1.png",
  "./assets/art-v012/customer-musician-v1.png",
  "./assets/art-v012/customer-nurse-v1.png",
  "./assets/art-v012/customer-office.png",
  "./assets/art-v012/customer-police-v1.png",
  "./assets/art-v012/customer-rider.png",
  "./assets/art-v012/customer-student.png",
  "./assets/art-v012/customer-teacher-v1.png",
  "./assets/art-v012/customer-traveler-v1.png",
  "./assets/art-v012/drink-beer-v1.png",
  "./assets/art-v012/drink-makgeolli-v1.png",
  "./assets/art-v012/drink-soju-v1.png",
  "./assets/art-v012/drink-somaek-v1.png",
  "./assets/art-v012/food-dumpling-v2.png",
  "./assets/art-v012/food-oden.png",
  "./assets/art-v012/food-ramen-no-egg-v3.png",
  "./assets/art-v012/food-ramen-v2.png",
  "./assets/art-v012/guest-center-wood-panel-v2.png",
  "./assets/art-v012/pause-button-v2.png",
  "./assets/art-v012/ppomi-groom.png",
  "./assets/art-v012/ppomi-wave.png",
  "./assets/art-v012/start-button-v1.png",
  "./assets/art-v012/takeout-package-v1.png",
  "./assets/art-v012/water-surface-v1.png",
  "./assets/foods/egg.svg",
  "./assets/foods/noodle.svg",
  "./assets/foods/pot_empty.svg",
  "./assets/foods/pot_noodle.svg",
  "./assets/foods/pot_water.svg",
  "./assets/foods/ramen.svg",
  "./assets/foods/ramen_egg.svg"
];

async function cacheIndividually(urls) {
  const cache = await caches.open(CACHE_VERSION);
  for (const url of urls) {
    try {
      await cache.add(new Request(url, { cache: "reload" }));
    } catch {
      // A single optional illustration must not prevent the app shell from installing.
    }
  }
}

self.addEventListener("install", event => {
  event.waitUntil(cacheIndividually(CORE_ASSETS).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("boreumi-ramen-") && key !== CACHE_VERSION).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type === "CACHE_GAME") event.waitUntil(cacheIndividually(GAME_ASSETS));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        const cache = await caches.open(CACHE_VERSION);
        cache.put("./index.html", response.clone());
        return response;
      } catch {
        return (await caches.match("./index.html")) || (await caches.match("./"));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  })());
});
