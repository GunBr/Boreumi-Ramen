(() => {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const Config = {
    stage: {
      safeWidth: 1920,
      maxWidth: 2340,
      height: 1080,
      currentWidth: 1920
    },
    layout: {
      level: 1,
      currentGuestCapacity: 3,
      futureGuestCapacity: 5,
      inventoryPageSize: 4,
      inventoryCategories: ["ramen", "drinks", "anju"],
      currentStations: ["pot-1", "pot-2", "pot-3", "grill-1", "grill-2", "oden-1"],
      reservedStations: ["takeout", "service-pass"]
    },
    boreumi: { idleWidth: 300, cookingWidth: 300, servingWidth: 360, idleOffset: -210 },
    daySeconds: 90,
    cooking: { tickMs: 50, defaultBurnMs: 3400 },
    prices: { pot: 3500, grill: 2200, oden: 1800 },
    firstArrivals: [700, 4500, 8500]
  };

  const FoodArt = {
    pot: "assets/art-v012/food-ramen-no-egg-v3.png",
    potEgg: "assets/art-v012/food-ramen-v2.png",
    grill: "assets/art-v012/food-dumpling-v2.png",
    oden: "assets/art-v012/food-oden.png"
  };

  const RecipeCatalog = Object.freeze({
    ramen_plain: Object.freeze({
      id: "ramen_plain",
      label: "기본 라면",
      appliance: "pot",
      ingredients: Object.freeze(["noodle"]),
      cookMs: 4200,
      burnMs: Config.cooking.defaultBurnMs,
      sprite: "ramen-plain",
      art: FoodArt.pot
    }),
    ramen_egg: Object.freeze({
      id: "ramen_egg",
      label: "계란 라면",
      appliance: "pot",
      ingredients: Object.freeze(["noodle", "egg"]),
      cookMs: 4200,
      burnMs: Config.cooking.defaultBurnMs,
      sprite: "ramen-egg",
      art: FoodArt.potEgg
    }),
    grilled_dumpling: Object.freeze({
      id: "grilled_dumpling",
      label: "군만두",
      appliance: "grill",
      ingredients: Object.freeze(["dumpling"]),
      cookMs: 3600,
      burnMs: Config.cooking.defaultBurnMs,
      sprite: "dumpling",
      art: FoodArt.grill
    }),
    warm_oden: Object.freeze({
      id: "warm_oden",
      label: "오뎅",
      appliance: "oden",
      ingredients: Object.freeze(["oden"]),
      cookMs: 3000,
      burnMs: Config.cooking.defaultBurnMs,
      sprite: "oden-food",
      art: FoodArt.oden
    })
  });

  const IngredientRules = Object.freeze({
    noodle: Object.freeze({ appliance: "pot", mode: "base" }),
    egg: Object.freeze({ appliance: "pot", mode: "addon", requires: "noodle" }),
    dumpling: Object.freeze({ appliance: "grill", mode: "base" }),
    oden: Object.freeze({ appliance: "oden", mode: "base" })
  });

  const InventoryCategories = [
    {
      id: "ramen",
      label: "라면 재료",
      className: "ingredient-rack",
      items: [
        { id: "noodle", label: "면", art: "assets/art-v012/ingredient-noodle-v4.png", draggable: true },
        { id: "egg", label: "계란", art: "assets/art-v012/ingredient-egg-v4.png", draggable: true }
      ]
    },
    {
      id: "drinks",
      label: "주류",
      className: "drink-rack",
      items: [
        { id: "soju", label: "소주", art: "assets/art-v012/drink-soju-v1.png" },
        { id: "beer", label: "맥주", art: "assets/art-v012/drink-beer-v1.png" },
        { id: "somaek", label: "소맥", art: "assets/art-v012/drink-somaek-v1.png" },
        { id: "makgeolli", label: "막걸리", art: "assets/art-v012/drink-makgeolli-v1.png" }
      ]
    },
    {
      id: "anju",
      label: "안주",
      className: "snack-rack",
      items: [
        { id: "dumpling", label: "군만두", art: "assets/art-v012/ingredient-dumpling-v4.png", draggable: true },
        { id: "oden", label: "오뎅", art: "assets/art-v012/ingredient-oden-v4.png", draggable: true }
      ]
    }
  ];

  const InventoryPages = Object.fromEntries(InventoryCategories.map(category => [category.id, 0]));

  const State = {
    running: false,
    paused: false,
    time: Config.daySeconds,
    sales: 0,
    guests: 0,
    drag: null,
    dayTimer: null,
    cookingTimer: null,
    cookingClock: performance.now(),
    guestTimers: [],
    boreumiTimer: null,
    waste: 0
  };

  const Appliances = [
    ...Array.from({ length: 3 }, (_, index) => ({ id: `pot-${index}`, type: "pot", slot: index, state: "empty", item: null, ingredients: [], recipeId: null, cookRemaining: 0, burnRemaining: 0 })),
    ...Array.from({ length: 2 }, (_, index) => ({ id: `grill-${index}`, type: "grill", slot: index, state: "empty", item: null, ingredients: [], recipeId: null, cookRemaining: 0, burnRemaining: 0 })),
    { id: "oden-0", type: "oden", slot: 0, state: "empty", item: null, ingredients: [], recipeId: null, cookRemaining: 0, burnRemaining: 0 }
  ];

  const Guests = ["pot", "grill", "oden"].map((order, index) => ({ index, order, active: false, serving: false }));

  function assetUrl(path) {
    return new URL(path, document.baseURI).href;
  }

  function recipeFor(appliance) {
    return appliance?.recipeId ? RecipeCatalog[appliance.recipeId] : null;
  }

  function resolveRecipeId(appliance) {
    if (appliance.type === "pot") return appliance.ingredients.includes("egg") ? "ramen_egg" : "ramen_plain";
    if (appliance.type === "grill") return "grilled_dumpling";
    return "warm_oden";
  }

  function foodArtFor(appliance) {
    return recipeFor(appliance)?.art || FoodArt[appliance.type];
  }

  function renderDockCategory(categoryId) {
    const category = InventoryCategories.find(entry => entry.id === categoryId);
    const rack = $(`[data-category="${categoryId}"]`);
    if (!category || !rack) return;
    const pageSize = Config.layout.inventoryPageSize;
    const pageCount = Math.max(1, Math.ceil(category.items.length / pageSize));
    const page = Math.max(0, Math.min(InventoryPages[categoryId], pageCount - 1));
    InventoryPages[categoryId] = page;
    const visibleItems = category.items.slice(page * pageSize, (page + 1) * pageSize);
    const items = rack.querySelector(".rack-items");
    items.style.setProperty("--page-columns", Math.max(2, visibleItems.length));
    items.innerHTML = visibleItems.map(item => item.draggable
      ? `<button class="ingredient catalog-item" data-item="${item.id}" aria-label="${item.label}"><img src="${item.art}" alt=""><span class="item-name">${item.label}</span></button>`
      : `<div class="drink-item catalog-item" role="img" aria-label="${item.label}"><img src="${item.art}" alt=""><span class="item-name">${item.label}</span></div>`).join("");
    const prev = rack.querySelector(".rack-prev");
    const next = rack.querySelector(".rack-next");
    const index = rack.querySelector(".rack-page-index");
    prev.hidden = next.hidden = index.hidden = pageCount === 1;
    prev.disabled = page === 0;
    next.disabled = page === pageCount - 1;
    index.textContent = `${page + 1}/${pageCount}`;
    rack.querySelectorAll(".ingredient").forEach(bindDrag);
  }

  function buildDock() {
    const dock = $(".dock");
    dock.replaceChildren();
    InventoryCategories.forEach(category => {
      const visibleSlots = Math.max(2, Math.min(Config.layout.inventoryPageSize, category.items.length));
      const rack = document.createElement("section");
      rack.className = `inventory-rack ${category.className}`;
      rack.dataset.category = category.id;
      rack.dataset.pageSize = String(Config.layout.inventoryPageSize);
      rack.style.setProperty("--visible-slots", visibleSlots);
      rack.setAttribute("aria-label", `${category.label} 진열대`);
      rack.innerHTML = `<h3 class="rack-title">${category.label}</h3><button type="button" class="rack-page rack-prev" aria-label="${category.label} 이전 페이지">‹</button><div class="rack-items"></div><span class="rack-page-index" aria-live="polite"></span><button type="button" class="rack-page rack-next" aria-label="${category.label} 다음 페이지">›</button>`;
      dock.append(rack);
      rack.querySelector(".rack-prev").addEventListener("click", () => {
        InventoryPages[category.id] -= 1;
        renderDockCategory(category.id);
      });
      rack.querySelector(".rack-next").addEventListener("click", () => {
        InventoryPages[category.id] += 1;
        renderDockCategory(category.id);
      });
      renderDockCategory(category.id);
    });
  }

  function build() {
    buildDock();
    const left = $("#cookLeft");
    const right = $("#cookRight");

    Appliances.forEach(appliance => {
      const button = document.createElement("button");
      button.className = `appliance ${appliance.type}`;
      button.dataset.id = appliance.id;
      button.setAttribute("aria-label", appliance.type === "pot" ? `냄비 ${appliance.slot + 1}` : appliance.type === "grill" ? `그릴 ${appliance.slot + 1}` : "오뎅바");
      button.innerHTML = `<span class="art"></span><span class="bar"><i></i></span>`;
      (appliance.type === "pot" ? left : right).append(button);
    });

    const row = $("#guestRow");
    Guests.forEach(guest => {
      const name = guest.index === 0 ? "회사원" : guest.index === 1 ? "배달기사" : "학생";
      row.insertAdjacentHTML("beforeend", `<article class="guest-slot" data-guest="${guest.index}"><div class="bubble"><img src="${FoodArt[guest.order]}" alt="주문 음식"></div><div class="guest-seat" role="img" aria-label="빈 의자"></div><div class="guest-art customer-${guest.index}" role="img" aria-label="${name}"></div><div class="patience"><i></i></div></article>`);
    });

    renderAll();
    Guests.forEach(renderGuest);
  }

  function resize() {
    const viewport = window.visualViewport || window;
    const stage = $("#stage");
    const viewportRatio = viewport.width / viewport.height;
    const adaptiveWidth = Math.round(Config.stage.height * viewportRatio);
    const stageWidth = Math.max(Config.stage.safeWidth, Math.min(Config.stage.maxWidth, adaptiveWidth));
    const scale = Math.min(viewport.width / stageWidth, viewport.height / Config.stage.height);
    Config.stage.currentWidth = stageWidth;
    stage.style.width = `${stageWidth}px`;
    stage.style.setProperty("--stage-width", `${stageWidth}px`);
    stage.style.setProperty("--safe-left", `${(stageWidth - Config.stage.safeWidth) / 2}px`);
    stage.dataset.viewport = stageWidth > Config.stage.safeWidth ? "expanded" : "safe";
    stage.style.transform = `scale(${scale})`;
    if ($("#boreumi")?.dataset.mode === "idle") setBoreumiIdlePosition();
  }

  function money(value) {
    return value.toLocaleString("ko-KR") + "원";
  }

  function renderHud() {
    $("#time").textContent = `${String(Math.floor(State.time / 60)).padStart(2, "0")}:${String(State.time % 60).padStart(2, "0")}`;
    $("#timeFill").style.width = `${State.time / Config.daySeconds * 100}%`;
    $("#sales").textContent = money(State.sales);
    $("#guestCount").textContent = State.guests + "명";
  }

  function toast(text) {
    const element = $("#toast");
    element.textContent = text;
    element.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove("show"), 1300);
  }

  function say(text) {
    const element = $("#boreumiText");
    element.textContent = text;
    element.classList.add("show");
    clearTimeout(say.timer);
    say.timer = setTimeout(() => element.classList.remove("show"), 1100);
  }

  function spriteFor(appliance) {
    if (appliance.state === "empty") return appliance.type;
    if (appliance.state === "cooking") return `cooking-${appliance.type === "pot" ? "ramen" : appliance.type === "grill" ? "dumpling" : "oden"}`;
    return recipeFor(appliance)?.sprite || appliance.type;
  }

  function applianceStateLabel(appliance) {
    if (appliance.state === "empty") return "대기";
    if (appliance.state === "cooking") return "조리 중";
    if (appliance.state === "ready") return "완성";
    return "탄 음식";
  }

  function renderProgress(appliance) {
    const element = $(`[data-id="${appliance.id}"]`);
    if (!element) return;
    const bar = element.querySelector(".bar i");
    const recipe = recipeFor(appliance);
    let progress = 0;
    if (appliance.state === "cooking" && recipe) progress = 1 - appliance.cookRemaining / recipe.cookMs;
    if (appliance.state === "ready" && recipe) progress = appliance.burnRemaining / recipe.burnMs;
    if (appliance.state === "burnt") progress = 1;
    bar.style.transition = "none";
    bar.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;
  }

  function renderAppliance(appliance) {
    const element = $(`[data-id="${appliance.id}"]`);
    const art = element.querySelector(".art");
    element.classList.toggle("ready", appliance.state === "ready");
    element.classList.toggle("cooking", appliance.state === "cooking");
    element.classList.toggle("burnt", appliance.state === "burnt");
    element.dataset.state = appliance.state;
    element.dataset.recipe = appliance.recipeId || "";
    element.setAttribute("aria-label", `${appliance.type === "pot" ? `냄비 ${appliance.slot + 1}` : appliance.type === "grill" ? `그릴 ${appliance.slot + 1}` : "오뎅바"} · ${applianceStateLabel(appliance)}`);
    art.innerHTML = `<i class="kitchen-sprite sprite-${spriteFor(appliance)}"></i>`;
    renderProgress(appliance);
  }

  function renderAll() {
    Appliances.forEach(renderAppliance);
    renderHud();
  }

  function renderGuest(guest) {
    const slot = $(`[data-guest="${guest.index}"]`);
    slot.classList.toggle("active", guest.active);
    slot.classList.toggle("serving", guest.serving);
    slot.querySelector(".bubble img").src = FoodArt[guest.order];
  }

  function clearGuestTimers() {
    State.guestTimers.forEach(clearTimeout);
    State.guestTimers = [];
  }

  function scheduleGuest(index, delay) {
    const timer = setTimeout(() => activateGuest(index), delay);
    State.guestTimers.push(timer);
  }

  function activateGuest(index) {
    const guest = Guests[index];
    if (!State.running || guest.active) return;
    guest.active = true;
    State.guests += 1;
    renderHud();
    renderGuest(guest);
    const slot = $(`[data-guest="${index}"]`);
    slot.classList.add("arriving");
    setTimeout(() => slot.classList.remove("arriving"), 430);
    toast(`${index + 1}번 자리에 손님이 왔어요!`);
  }

  function dismissGuest(index) {
    const guest = Guests[index];
    guest.active = false;
    guest.serving = false;
    renderGuest(guest);
    if (State.running) scheduleGuest(index, 2800 + index * 450);
  }

  function resetGuests() {
    clearGuestTimers();
    Guests.forEach(guest => {
      guest.active = false;
      guest.serving = false;
      renderGuest(guest);
    });
  }

  function laneLeftFor(target, spriteWidth) {
    const lane = $(".characters").getBoundingClientRect();
    const scale = lane.width / $(".characters").clientWidth;
    return (target.left + target.width / 2 - lane.left) / scale - spriteWidth / 2;
  }

  function animateBoreumi(mode, pose, left) {
    const boreumi = $("#boreumi");
    clearTimeout(State.boreumiTimer);
    boreumi.dataset.mode = mode;
    boreumi.dataset.pose = pose;
    const laneWidth = $(".characters").clientWidth;
    const spriteWidth = mode === "cooking" ? Config.boreumi.cookingWidth : mode === "serving" ? Config.boreumi.servingWidth : Config.boreumi.idleWidth;
    boreumi.style.left = Math.max(12, Math.min(laneWidth - spriteWidth - 12, left)) + "px";
    boreumi.classList.remove("teleport", "action");
    void boreumi.offsetWidth;
    boreumi.classList.add("teleport");
    setTimeout(() => {
      boreumi.classList.remove("teleport");
      boreumi.classList.add("action");
    }, 110);
  }

  function setBoreumiIdlePosition() {
    const boreumi = $("#boreumi");
    const laneWidth = $(".characters").clientWidth || Config.stage.currentWidth;
    boreumi.style.left = `${(laneWidth - Config.boreumi.idleWidth) / 2 + Config.boreumi.idleOffset}px`;
  }

  function setBoreumiIdle(delay = 0) {
    clearTimeout(State.boreumiTimer);
    State.boreumiTimer = setTimeout(() => {
      const boreumi = $("#boreumi");
      boreumi.dataset.mode = "idle";
      boreumi.dataset.pose = "idle";
      setBoreumiIdlePosition();
      boreumi.classList.remove("teleport", "action");
    }, delay);
  }

  function teleport(appliance, text) {
    const target = $(`[data-id="${appliance.id}"]`).getBoundingClientRect();
    const pose = appliance.type === "pot" ? (appliance.item === "egg" ? "egg" : "noodle") : appliance.type;
    animateBoreumi("cooking", pose, laneLeftFor(target, Config.boreumi.cookingWidth));
    State.boreumiTimer = setTimeout(() => setBoreumiIdle(), 920);
    say(text);
  }

  function teleportToGuest(guestIndex) {
    const target = $(`[data-guest="${guestIndex}"]`).getBoundingClientRect();
    animateBoreumi("serving", "serve", laneLeftFor(target, Config.boreumi.servingWidth));
    State.boreumiTimer = setTimeout(() => setBoreumiIdle(), 820);
  }

  function accepts(appliance, item) {
    return IngredientRules[item]?.appliance === appliance.type;
  }

  function startCooking(appliance, item) {
    appliance.state = "cooking";
    appliance.item = item;
    appliance.ingredients = [item];
    appliance.recipeId = resolveRecipeId(appliance);
    const recipe = recipeFor(appliance);
    appliance.cookRemaining = recipe.cookMs;
    appliance.burnRemaining = recipe.burnMs;
    renderAppliance(appliance);
    teleport(appliance, appliance.type === "pot" ? "조리 시작!" : appliance.type === "grill" ? "노릇하게 구울게!" : "따끈하게 데울게!");
  }

  function completeCooking(appliance) {
    if (appliance.state !== "cooking") return;
    appliance.state = "ready";
    appliance.cookRemaining = 0;
    appliance.burnRemaining = recipeFor(appliance).burnMs;
    renderAppliance(appliance);
    toast(`${recipeFor(appliance).label} 완성!`);
  }

  function burnFood(appliance) {
    if (appliance.state !== "ready") return;
    appliance.state = "burnt";
    appliance.burnRemaining = 0;
    renderAppliance(appliance);
    toast(`${recipeFor(appliance).label}이(가) 타버렸어요!`);
  }

  function tickCooking() {
    const now = performance.now();
    const elapsed = Math.min(250, Math.max(0, now - State.cookingClock));
    State.cookingClock = now;
    if (!State.running || State.paused) return;
    Appliances.forEach(appliance => {
      if (appliance.state === "cooking") {
        appliance.cookRemaining -= elapsed;
        if (appliance.cookRemaining <= 0) completeCooking(appliance);
        else renderProgress(appliance);
      } else if (appliance.state === "ready") {
        appliance.burnRemaining -= elapsed;
        if (appliance.burnRemaining <= 0) burnFood(appliance);
        else renderProgress(appliance);
      }
    });
  }

  function dropItem(appliance, item) {
    if (!State.running) return toast("먼저 영업을 시작해 주세요.");
    const rule = IngredientRules[item];
    if (!rule || !accepts(appliance, item)) return toast("이 재료는 다른 조리기구에 넣어주세요.");
    if (appliance.state === "ready") return toast("완성된 음식을 먼저 서빙하거나 버려주세요.");
    if (appliance.state === "burnt") return toast("탄 음식을 먼저 버려주세요.");

    if (rule.mode === "addon") {
      if (appliance.state === "empty" || !appliance.ingredients.includes(rule.requires)) return toast("물이 담긴 냄비에 면을 먼저 넣어주세요.");
      if (appliance.state !== "cooking") return toast("조리 중인 냄비에만 토핑을 넣을 수 있어요.");
      if (appliance.ingredients.includes(item)) return toast("이미 계란을 넣었어요.");
      appliance.ingredients.push(item);
      appliance.item = item;
      appliance.recipeId = resolveRecipeId(appliance);
      renderAppliance(appliance);
      teleport(appliance, "계란 톡!");
      return;
    }

    if (appliance.state !== "empty") return toast("다른 빈 조리기구를 사용해 주세요.");
    startCooking(appliance, item);
  }

  function resetAppliance(appliance) {
    appliance.state = "empty";
    appliance.item = null;
    appliance.ingredients = [];
    appliance.recipeId = null;
    appliance.cookRemaining = 0;
    appliance.burnRemaining = 0;
    renderAppliance(appliance);
  }

  function discardAppliance(appliance) {
    if (!appliance || !["ready", "burnt"].includes(appliance.state)) return toast("버릴 음식이 없어요.");
    const wasBurnt = appliance.state === "burnt";
    const label = recipeFor(appliance)?.label || "음식";
    State.waste += 1;
    resetAppliance(appliance);
    say("깔끔하게 치울게!");
    toast(wasBurnt ? `${label}을(를) 버렸어요.` : `${label}을(를) 폐기했어요.`);
  }

  function serve(appliance, guestIndex) {
    const guest = Guests[guestIndex];
    if (!guest?.active) return toast("빈자리에는 서빙할 수 없어요.");
    if (guest.serving) return toast("지금 음식을 건네고 있어요.");
    if (appliance.state !== "ready") return toast("완성된 음식만 서빙할 수 있어요.");
    if (guest.order !== appliance.type) return toast("손님의 주문과 다른 음식이에요.");

    guest.serving = true;
    renderGuest(guest);
    State.sales += Config.prices[appliance.type];
    resetAppliance(appliance);
    renderHud();
    say("맛있게 드세요!");
    teleportToGuest(guestIndex);
    const slot = $(`[data-guest="${guestIndex}"]`);
    slot.animate([{ transform: "translateY(0)" }, { transform: "translateY(-8px)" }, { transform: "translateY(0)" }], { duration: 350 });
    const leaveTimer = setTimeout(() => dismissGuest(guestIndex), 720);
    State.guestTimers.push(leaveTimer);
    toast(`판매 +${money(Config.prices[appliance.type])}`);
  }

  function finishDay() {
    State.running = false;
    State.paused = false;
    clearInterval(State.dayTimer);
    clearGuestTimers();
    setBoreumiIdle();
    $(".hud").classList.remove("running");
    $("#startButton").style.removeProperty("display");
    $("#startButton").disabled = false;
    $("#startButton").setAttribute("aria-label", "다시 시작");
    $("#startButton strong").textContent = "다시 시작";
    toast(`영업 종료 · 매출 ${money(State.sales)}`);
  }

  function start() {
    if (State.running) return;
    clearInterval(State.dayTimer);
    setBoreumiIdle();
    resetGuests();
    Appliances.forEach(resetAppliance);
    State.running = true;
    State.paused = false;
    State.time = Config.daySeconds;
    State.sales = 0;
    State.guests = 0;
    State.waste = 0;
    State.cookingClock = performance.now();
    $(".hud").classList.add("running");
    $("#startButton").style.removeProperty("display");
    $("#startButton").disabled = true;
    $("#startButton").setAttribute("aria-label", "영업중");
    $("#startButton strong").textContent = "영업중";
    renderHud();
    Config.firstArrivals.forEach((delay, index) => scheduleGuest(index, delay));
    State.dayTimer = setInterval(() => {
      if (State.paused) return;
      State.time -= 1;
      if (State.time <= 0) {
        State.time = 0;
        renderHud();
        finishDay();
        return;
      }
      renderHud();
    }, 1000);
    say("오늘도 따뜻한 한 그릇!");
    toast("영업 시작!");
  }

  function payload(element) {
    if (element.matches(".ingredient")) {
      const image = element.querySelector("img");
      return { kind: "item", item: element.dataset.item, image: image?.src || "" };
    }
    const appliance = Appliances.find(item => item.id === element.dataset.id);
    if (appliance?.state === "ready") {
      return { kind: "food", id: appliance.id, recipeId: appliance.recipeId, image: assetUrl(foodArtFor(appliance)) };
    }
    if (appliance?.state === "burnt") {
      return { kind: "waste", id: appliance.id, recipeId: appliance.recipeId, image: assetUrl(foodArtFor(appliance)) };
    }
    return null;
  }

  function pointer(event) {
    return { x: event.clientX, y: event.clientY };
  }

  function targetAt(event) {
    const point = pointer(event);
    return document.elementFromPoint(point.x, point.y);
  }

  function moveGhost(event) {
    const point = pointer(event);
    const ghost = $("#dragGhost");
    ghost.style.left = point.x + "px";
    ghost.style.top = (point.y - (event.pointerType === "touch" ? 48 : 18)) + "px";
  }

  function clearOver() {
    $$(".drop-over").forEach(element => element.classList.remove("drop-over"));
  }

  function showGhost(data) {
    const ghost = $("#dragGhost");
    ghost.querySelector("img").src = data.image;
    ghost.querySelector("span").textContent = "";
    ghost.classList.toggle("food-drag", data.kind === "food");
    ghost.classList.toggle("waste-drag", data.kind === "waste");
    ghost.classList.add("show");
    $("#stage").dataset.dragKind = data.kind;
  }

  function hideGhost() {
    const ghost = $("#dragGhost");
    ghost.classList.remove("show", "food-drag", "waste-drag");
    ghost.querySelector("img").removeAttribute("src");
    delete $("#stage").dataset.dragKind;
  }

  function startDrag(event, element) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const data = payload(element);
    if (!data) return;
    event.preventDefault();
    try { element.setPointerCapture?.(event.pointerId); } catch { /* Synthetic QA pointers are not browser-active pointers. */ }
    State.drag = { pointer: event.pointerId, data };
    showGhost(data);
    moveGhost(event);
  }

  function moveDrag(event) {
    if (State.drag?.pointer !== event.pointerId) return;
    event.preventDefault();
    moveGhost(event);
    clearOver();
    const target = targetAt(event);
    if (State.drag.data.kind === "item") target?.closest(".appliance")?.classList.add("drop-over");
    else {
      target?.closest("#discardBin")?.classList.add("drop-over");
      if (State.drag.data.kind === "food") target?.closest(".guest-slot.active")?.classList.add("drop-over");
    }
  }

  function endDrag(event) {
    if (State.drag?.pointer !== event.pointerId) return;
    event.preventDefault();
    const target = targetAt(event);
    const data = State.drag.data;

    if (data.kind === "item") {
      const applianceElement = target?.closest(".appliance");
      if (applianceElement) dropItem(Appliances.find(item => item.id === applianceElement.dataset.id), data.item);
      else toast("재료를 조리기구에 놓아주세요.");
    } else if (target?.closest("#discardBin")) {
      discardAppliance(Appliances.find(item => item.id === data.id));
    } else if (data.kind === "food") {
      const guestSlot = target?.closest(".guest-slot.active");
      if (guestSlot) serve(Appliances.find(item => item.id === data.id), Number(guestSlot.dataset.guest));
      else toast("완성 음식을 손님이나 주문 말풍선에 놓아주세요.");
    } else {
      toast("탄 음식은 버리기 통에 놓아주세요.");
    }

    State.drag = null;
    hideGhost();
    clearOver();
  }

  function bindDrag(element) {
    if (element.dataset.dragBound === "true") return;
    element.dataset.dragBound = "true";
    element.addEventListener("pointerdown", event => startDrag(event, element));
  }

  function setPpomiPose(pose) {
    const element = $("#ppomiPerch");
    const note = element.querySelector("i");
    element.className = `ppomi-perch pose-${pose}`;
    note.textContent = pose === "sleep" ? "Zzz" : pose === "groom" ? "✦" : "♡";
  }

  function startPpomiPoses() {
    const poses = ["sleep", "groom", "wave"];
    let index = 0;
    setPpomiPose(poses[index]);
    setInterval(() => setPpomiPose(poses[index = ++index % poses.length]), 4800);
  }

  async function browserQA() {
    const qaParams = new URLSearchParams(location.search);
    if (!qaParams.has("qa")) return;
    await Promise.all($$(".dock img").map(image => image.complete
      ? Promise.resolve()
      : image.decode().catch(() => undefined)));
    const dockFrameImage = new Image();
    const dockSlotImage = new Image();
    dockFrameImage.src = "assets/art-v012/dock-rack-frame-v1.png";
    dockSlotImage.src = "assets/art-v012/dock-slot-v1.png";
    await Promise.all([dockFrameImage.decode().catch(() => undefined), dockSlotImage.decode().catch(() => undefined)]);
    const result = {};
    const qaPointerDrag = (source, target, pointerId) => {
      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const sourcePoint = { clientX: sourceRect.left + sourceRect.width / 2, clientY: sourceRect.top + sourceRect.height / 2 };
      const targetPoint = { clientX: targetRect.left + targetRect.width / 2, clientY: targetRect.top + targetRect.height / 2 };
      source.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerId, pointerType: "mouse", button: 0, buttons: 1, ...sourcePoint }));
      document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, cancelable: true, pointerId, pointerType: "mouse", button: 0, buttons: 1, ...targetPoint }));
      document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, pointerId, pointerType: "mouse", button: 0, buttons: 0, ...targetPoint }));
    };
    result.startButtonInHud = $("#startButton").parentElement === $(".hud") && $("#startButton").nextElementSibling === $("#pauseButton");
    const startButtonStyle = getComputedStyle($("#startButton"));
    const pauseButtonStyle = getComputedStyle($("#pauseButton"));
    const startButtonRect = $("#startButton").getBoundingClientRect();
    const pauseButtonRect = $("#pauseButton").getBoundingClientRect();
    const hudRect = $(".hud").getBoundingClientRect();
    const dayCell = $(".hud>div:first-child");
    const dayCellRect = dayCell.getBoundingClientRect();
    const dayCellStyle = getComputedStyle(dayCell);
    const buttonStageScale = $("#stage").getBoundingClientRect().width / Config.stage.currentWidth;
    result.matchingHudButtons = startButtonStyle.backgroundImage.includes("start-button-v1.png")
      && pauseButtonStyle.backgroundImage.includes("pause-button-v2.png")
      && $("#pauseButton").textContent.trim() === "Ⅱ";
    result.compactPausePlacement = pauseButtonRect.width < startButtonRect.width * .55
      && Math.abs(pauseButtonRect.height - startButtonRect.height) <= 1
      && pauseButtonRect.left - startButtonRect.right >= -16 * buttonStageScale
      && pauseButtonRect.left - startButtonRect.right <= 2 * buttonStageScale
      && Math.abs((pauseButtonRect.top + pauseButtonRect.bottom) / 2 - (startButtonRect.top + startButtonRect.bottom) / 2) <= 1;
    result.hudReadability = hudRect.height >= 100 * buttonStageScale
      && $$(".hud>div").every(cell => {
        const cellRect = cell.getBoundingClientRect();
        const labelRect = cell.querySelector("small").getBoundingClientRect();
        const valueRect = cell.querySelector("b").getBoundingClientRect();
        return Math.abs((labelRect.left + labelRect.right) / 2 - (cellRect.left + cellRect.right) / 2) <= 2
          && Math.abs((valueRect.left + valueRect.right) / 2 - (cellRect.left + cellRect.right) / 2) <= 2;
      })
      && dayCellRect.width >= 120 * buttonStageScale
      && dayCellRect.height >= 80 * buttonStageScale
      && dayCellRect.left >= hudRect.left
      && dayCellRect.right <= hudRect.right
      && dayCellStyle.backgroundImage.includes("linear-gradient")
      && parseFloat(dayCellStyle.borderTopWidth) >= 3 * buttonStageScale
      && dayCell.querySelector("small").textContent.trim() === "DAY"
      && dayCell.querySelector("b").textContent.trim() === "1";
    result.dayCellIntegrated = dayCellStyle.backgroundImage.includes("linear-gradient")
      && getComputedStyle(dayCell, "::before").backgroundImage.includes("linear-gradient")
      && getComputedStyle(dayCell, "::after").display === "none"
      && dayCellRect.left >= hudRect.left
      && dayCellRect.right <= startButtonRect.left;
    result.idlePotsContainWater = $$(".sprite-pot").length === 3
      && getComputedStyle($(".sprite-pot"), "::before").backgroundImage.includes("radial-gradient")
      && getComputedStyle($(".sprite-pot"), "::after").backgroundImage.includes("water-surface-v1.png");
    const idlePotStyle = getComputedStyle($(".sprite-pot"));
    const idleWaterStyle = getComputedStyle($(".sprite-pot"), "::before");
    const idleWaterReflectionStyle = getComputedStyle($(".sprite-pot"), "::after");
    result.raisedIdleWaterLevel = parseFloat(idleWaterStyle.top) < parseFloat(idlePotStyle.height) * .24
      && parseFloat(idleWaterStyle.height) >= parseFloat(idlePotStyle.height) * .17
      && parseFloat(idleWaterReflectionStyle.opacity) >= .2;
    const stationRects = $$(".appliance .kitchen-sprite").map(sprite => sprite.getBoundingClientRect());
    result.cookingStationsSpaced = stationRects.every((rect, index) => !index || rect.left - stationRects[index - 1].right >= 2 * buttonStageScale);
    const serviceTableTexture = getComputedStyle($(".service-table"), "::before").backgroundImage;
    result.lineFreeTables = !serviceTableTexture.includes("repeating-linear-gradient")
      && $$(".inventory-rack").every(rack => getComputedStyle(rack).borderImageSource.includes("dock-rack-frame-v1.png"))
      && getComputedStyle($(".dock"), "::before").display === "none"
      && getComputedStyle($(".counter")).display === "none";
    result.applianceArtworkUnobstructed = getComputedStyle($(".counter")).display === "none"
      && $$(".appliance .art").every(art => getComputedStyle(art).overflow !== "hidden");
    const ppomiRect = $("#ppomiPerch").getBoundingClientRect();
    const guestRowRectBeforeStart = $("#guestRow").getBoundingClientRect();
    const guestTableRect = $(".service-table").getBoundingClientRect();
    result.ppomiAtGuestTableRight = ppomiRect.left >= guestRowRectBeforeStart.right - 2
      && ppomiRect.right <= guestTableRect.right + 2
      && Math.abs(ppomiRect.bottom - guestTableRect.top) <= 4;
    const guestApronStyle = getComputedStyle($(".service-table"), "::after");
    result.guestLowerBodiesScreened = guestApronStyle.backgroundImage.includes("guest-center-wood-panel-v2.png")
      && parseFloat(guestApronStyle.height) >= 130
      && parseFloat(guestApronStyle.height) <= 145
      && parseFloat(guestApronStyle.width) >= 680
      && parseFloat(guestApronStyle.width) <= 720
      && parseInt(getComputedStyle($(".service-table")).zIndex, 10) > parseInt(getComputedStyle($("#guestRow")).zIndex, 10)
      && parseInt(getComputedStyle($(".characters")).zIndex, 10) > parseInt(getComputedStyle($(".service-table")).zIndex, 10);
    result.guestSidePropsPreserved = parseFloat(guestApronStyle.width) <= 720
      && parseFloat(getComputedStyle($(".service-table")).width) >= 1800;
    result.integratedWoodApronArt = guestApronStyle.backgroundImage.includes("guest-center-wood-panel-v2.png")
      && guestApronStyle.backgroundSize.includes("cover")
      && parseFloat(guestApronStyle.borderBottomWidth) === 0
      && (guestApronStyle.webkitMaskImage || guestApronStyle.maskImage).includes("linear-gradient")
      && guestApronStyle.filter.includes("brightness(1.16)");
    const guestApronMask = guestApronStyle.webkitMaskImage || guestApronStyle.maskImage;
    result.naturalWoodApronEnds = guestApronMask.includes("4%")
      && guestApronMask.includes("96%")
      && guestApronStyle.filter.includes("brightness(1.16)");
    result.pochaHudArt = getComputedStyle($(".hud")).backgroundImage.includes("hud-panel-v1.png")
      && parseFloat(getComputedStyle($(".hud")).borderTopWidth) === 0;
    const dockItemNames = $$(".dock .item-name").map(label => label.textContent.trim());
    result.referenceStyleItemLabels = $$(".appliance label").length === 0
      && dockItemNames.length === 8
      && ["면", "계란", "군만두", "오뎅", "소주", "맥주", "소맥", "막걸리"].every(name => dockItemNames.includes(name));
    result.noDailyMaterialsCell = !$(".dock-label");
    result.sharedDisplayRacks = $$(".ingredient-rack .ingredient").length === 2
      && $$(".drink-rack .drink-item").length === 4
      && $$(".snack-rack .ingredient").length === 2
      && !$(".dock-tip");
    result.referenceStyleItemCards = $$(".ingredient,.drink-item").every(item => {
      const style = getComputedStyle(item);
      return parseFloat(style.borderTopWidth) === 0
        && style.backgroundImage.includes("dock-slot-v1.png")
        && parseFloat(style.borderRadius) >= 10 * buttonStageScale;
    });
    result.referenceStyleDock = $$(".rack-title").map(title => title.textContent.trim()).join("|") === "라면 재료|주류|안주"
      && $$(".inventory-rack").every(rack => getComputedStyle(rack).borderImageSource.includes("dock-rack-frame-v1.png"));
    result.handPaintedDockArt = dockFrameImage.complete
      && dockFrameImage.naturalWidth === 949
      && dockFrameImage.naturalHeight === 154
      && dockSlotImage.complete
      && dockSlotImage.naturalWidth === 240
      && dockSlotImage.naturalHeight === 112;
    result.extensibleInventory = InventoryCategories.length === 3
      && Config.layout.inventoryPageSize === 4
      && Config.layout.inventoryCategories.join("|") === "ramen|drinks|anju"
      && $$(".inventory-rack").length === 3
      && $$(".inventory-rack").every(rack => rack.dataset.pageSize === "4" && rack.querySelectorAll(".rack-page").length === 2)
      && getComputedStyle($(".ingredient-rack")).flexGrow === "2"
      && getComputedStyle($(".drink-rack")).flexGrow === "4"
      && getComputedStyle($(".snack-rack")).flexGrow === "2";
    const ramenCategory = InventoryCategories.find(category => category.id === "ramen");
    const originalRamenItems = ramenCategory.items;
    ramenCategory.items = [...originalRamenItems,
      { ...originalRamenItems[0], id: "qa-noodle-2", label: "추가 면 1" },
      { ...originalRamenItems[1], id: "qa-egg-2", label: "추가 계란" },
      { ...originalRamenItems[0], id: "qa-noodle-3", label: "추가 면 2" }];
    InventoryPages.ramen = 0;
    renderDockCategory("ramen");
    const ramenNext = $(".ingredient-rack .rack-next");
    const paginationAppeared = !ramenNext.hidden && !ramenNext.disabled;
    ramenNext.click();
    const secondInventoryPage = InventoryPages.ramen === 1
      && $$(".ingredient-rack .catalog-item").length === 1
      && $(".ingredient-rack .rack-page-index").textContent === "2/2";
    ramenCategory.items = originalRamenItems;
    InventoryPages.ramen = 0;
    renderDockCategory("ramen");
    result.inventoryPaginationFlow = paginationAppeared
      && secondInventoryPage
      && $(".ingredient-rack .rack-next").hidden
      && $$(".ingredient-rack .catalog-item").length === 2;
    const drinkArt = {
      soju: "drink-soju-v1.png",
      beer: "drink-beer-v1.png",
      somaek: "drink-somaek-v1.png",
      makgeolli: "drink-makgeolli-v1.png"
    };
    result.drinkArtV1 = Object.entries(drinkArt).every(([drink, file]) => {
      const image = $(`.drink-item[aria-label="${drink === "soju" ? "소주" : drink === "beer" ? "맥주" : drink === "somaek" ? "소맥" : "막걸리"}"] img`);
      return image?.src.endsWith(file) && image.complete && image.naturalWidth === 512 && image.naturalHeight === 512;
    });
    result.emptySeatsBeforeStart = $$(".guest-slot:not(.active)").length === 3 && $$(".guest-seat").length === 3;
    result.idleFrontCenter = $("#boreumi").dataset.mode === "idle" && $("#boreumi").dataset.pose === "idle";
    $("#startButton").click();
    const runningButtonRect = $("#startButton").getBoundingClientRect();
    result.startButton = State.running
      && getComputedStyle($("#startButton")).display !== "none"
      && $("#startButton").disabled
      && $("#startButton strong").textContent.trim() === "영업중"
      && Math.abs(runningButtonRect.left - startButtonRect.left) <= 1
      && Math.abs(runningButtonRect.top - startButtonRect.top) <= 1;
    const lockedDayTimer = State.dayTimer;
    const lockedTime = State.time;
    $("#startButton").click();
    result.runningStartLocked = State.running
      && $("#startButton").disabled
      && State.dayTimer === lockedDayTimer
      && State.time === lockedTime;
    $("#pauseButton").click();
    result.pauseButton = State.paused && !$("#pauseOverlay").classList.contains("hidden");
    $("#resumeButton").click();
    result.resumeButton = !State.paused && $("#pauseOverlay").classList.contains("hidden");
    activateGuest(0);
    result.arrivalState = $$(".guest-slot.active").length === 1 && $$(".guest-slot:not(.active)").length === 2;
    const topping = $("[data-item='dumpling']");
    const toppingPayload = payload(topping);
    showGhost(toppingPayload);
    result.ingredientDragArt = !!payload($("[data-item='noodle']")).image && !!toppingPayload.image;
    const ingredientArtV4 = {
      noodle: "ingredient-noodle-v4.png",
      egg: "ingredient-egg-v4.png",
      dumpling: "ingredient-dumpling-v4.png",
      oden: "ingredient-oden-v4.png"
    };
    result.ingredientArtV4 = Object.entries(ingredientArtV4).every(([item, file]) => {
      const image = $(`[data-item="${item}"] img`);
      return image?.src.endsWith(file) && image.complete && image.naturalWidth === 512 && image.naturalHeight === 512;
    });
    result.ingredientGhostIllustration = $("#dragGhost").classList.contains("show")
      && $("#dragGhost img").src === toppingPayload.image
      && !$("#dragGhost span").textContent;
    State.drag = null;
    hideGhost();
    const odenSprite = $(".sprite-oden").getBoundingClientRect();
    const odenArt = $(`[data-id="${Appliances[5].id}"] .art`).getBoundingClientRect();
    result.odenEmptyPadding = odenSprite.left > odenArt.left + 5 && odenSprite.right < odenArt.right - 5;
    result.odenIdleArtV3 = getComputedStyle($(".sprite-oden")).backgroundImage.includes("kitchen-oden-v3.png");
    const emptyApplianceArt = $(`[data-id="${Appliances[0].id}"] .art`);
    const emptyApplianceStyle = getComputedStyle(emptyApplianceArt);
    result.appliancePanelsRemoved = emptyApplianceStyle.borderTopWidth === "0px"
      && emptyApplianceStyle.backgroundImage === "none"
      && emptyApplianceStyle.backgroundColor === "rgba(0, 0, 0, 0)"
      && emptyApplianceStyle.boxShadow === "none";
    const signStyle = getComputedStyle($(".sign"));
    result.fullMoonSign = signStyle.backgroundImage.includes("sign-full-moon-v1.png")
      && parseFloat(signStyle.borderTopWidth) === 0;

    result.recipeCatalog = Object.keys(RecipeCatalog).join("|") === "ramen_plain|ramen_egg|grilled_dumpling|warm_oden"
      && Object.values(RecipeCatalog).every(recipe => recipe.cookMs > 0 && recipe.burnMs === Config.cooking.defaultBurnMs)
      && RecipeCatalog.ramen_plain.ingredients.join("|") === "noodle"
      && RecipeCatalog.ramen_egg.ingredients.join("|") === "noodle|egg";
    dropItem(Appliances[2], "dumpling");
    result.invalidApplianceRejected = Appliances[2].state === "empty" && Appliances[2].ingredients.length === 0;
    dropItem(Appliances[2], "egg");
    result.addonRequiresBase = Appliances[2].state === "empty" && Appliances[2].ingredients.length === 0;
    qaPointerDrag($("[data-item='noodle']"), $(`[data-id="${Appliances[2].id}"]`), 901);
    result.pointerIngredientDrag = Appliances[2].state === "cooking"
      && Appliances[2].recipeId === "ramen_plain"
      && !$("#dragGhost").classList.contains("show");
    resetAppliance(Appliances[2]);

    dropItem(Appliances[0], "noodle");
    dropItem(Appliances[1], "noodle");
    dropItem(Appliances[1], "egg");
    result.eggPose = $("#boreumi").dataset.pose === "egg";
    const eggIngredientCount = Appliances[1].ingredients.length;
    dropItem(Appliances[1], "egg");
    result.duplicateAddonRejected = Appliances[1].ingredients.length === eggIngredientCount;
    dropItem(Appliances[3], "dumpling");
    result.grillPose = $("#boreumi").dataset.pose === "grill";
    dropItem(Appliances[5], "oden");
    result.odenPose = $("#boreumi").dataset.pose === "oden";
    result.cookingUpperBody = $("#boreumi").dataset.mode === "cooking" && parseFloat(getComputedStyle($("#boreumi")).height) >= 230;
    result.appliancesPersist = $$(".kitchen-sprite").length === 6;
    result.immediateCooking = Appliances[0].state === "cooking" && Appliances[1].state === "cooking" && Appliances[3].state === "cooking" && Appliances[5].state === "cooking";
    result.recipeResolution = Appliances[0].recipeId === "ramen_plain"
      && Appliances[1].recipeId === "ramen_egg"
      && Appliances[3].recipeId === "grilled_dumpling"
      && Appliances[5].recipeId === "warm_oden";

    const remainingBeforeCookingPause = Appliances[0].cookRemaining;
    $("#pauseButton").click();
    await new Promise(resolve => setTimeout(resolve, 180));
    result.cookingPauses = State.paused
      && Math.abs(Appliances[0].cookRemaining - remainingBeforeCookingPause) < 1;
    $("#resumeButton").click();
    if (qaParams.has("previewCook")) {
      State.paused = true;
      await new Promise(resolve => setTimeout(resolve, 2600));
      State.paused = false;
      State.cookingClock = performance.now();
    }

    await new Promise(resolve => setTimeout(resolve, 4400));
    result.independentTimers = Appliances[0].state === "ready" && Appliances[1].state === "ready" && Appliances[3].state === "ready" && Appliances[5].state === "ready";
    result.noEggPlainRamen = !!$(".sprite-ramen-plain") && getComputedStyle($(".sprite-ramen-plain")).backgroundImage.includes("food-ramen-no-egg-v3");
    result.eggRamenVariant = !!$(".sprite-ramen-egg") && getComputedStyle($(".sprite-ramen-egg")).backgroundImage.includes("food-ramen-v2");
    result.completeFoodArt = !!$(".sprite-dumpling") && getComputedStyle($(".sprite-dumpling")).backgroundImage.includes("food-dumpling-v2");
    const readyPayload = payload($(`[data-id="${Appliances[0].id}"]`));
    result.sameReadyDragArt = readyPayload?.image.includes("food-ramen-no-egg-v3.png");
    showGhost(readyPayload);
    result.readyGhostSameIllustration = $("#dragGhost").classList.contains("food-drag")
      && $("#dragGhost img").src === readyPayload.image
      && !$("#dragGhost span").textContent;
    State.drag = null;
    hideGhost();
    result.customerCharacterDropTarget = $(`[data-guest="0"] .guest-art`).closest(".guest-slot.active")?.dataset.guest === "0";
    const salesBeforeWrongOrder = State.sales;
    serve(Appliances[3], 0);
    result.wrongOrderRejected = Appliances[3].state === "ready"
      && Guests[0].active
      && State.sales === salesBeforeWrongOrder;

    Appliances[1].burnRemaining = 70;
    renderProgress(Appliances[1]);
    await new Promise(resolve => setTimeout(resolve, 160));
    const burntPayload = payload($(`[data-id="${Appliances[1].id}"]`));
    result.readyBurns = Appliances[1].state === "burnt"
      && $(`[data-id="${Appliances[1].id}"]`).classList.contains("burnt")
      && burntPayload?.kind === "waste";
    const salesBeforeBurntServe = State.sales;
    serve(Appliances[1], 0);
    result.burntCannotServe = Appliances[1].state === "burnt" && State.sales === salesBeforeBurntServe;
    showGhost(burntPayload);
    await new Promise(resolve => setTimeout(resolve, 160));
    const discardStyle = getComputedStyle($("#discardBin"));
    result.discardTargetAppears = $("#stage").dataset.dragKind === "waste"
      && parseFloat(discardStyle.opacity) >= .95
      && discardStyle.pointerEvents === "auto"
      && $("#dragGhost").classList.contains("waste-drag");
    State.drag = null;
    hideGhost();
    const wasteBeforeDiscard = State.waste;
    qaPointerDrag($(`[data-id="${Appliances[1].id}"]`), $("#discardBin"), 902);
    result.discardPointerDrag = Appliances[1].state === "empty" && !$("#dragGhost").classList.contains("show");
    result.discardResetsStation = Appliances[1].state === "empty"
      && Appliances[1].recipeId === null
      && Appliances[1].ingredients.length === 0
      && State.waste === wasteBeforeDiscard + 1;
    if (qaParams.has("holdReady")) await new Promise(resolve => setTimeout(resolve, 1400));
    qaPointerDrag($(`[data-id="${Appliances[0].id}"]`), $(`[data-guest="0"] .guest-art`), 903);
    result.foodPointerDrag = Appliances[0].state === "empty" && Guests[0].serving && !$("#dragGhost").classList.contains("show");
    result.serveBackPose = $("#boreumi").dataset.mode === "serving" && $("#boreumi").dataset.pose === "serve";
    const serveRect = $("#boreumi").getBoundingClientRect();
    const guestRowRect = $("#guestRow").getBoundingClientRect();
    const stageScale = $("#stage").getBoundingClientRect().width / Config.stage.currentWidth;
    const serveClearance = (serveRect.bottom - guestRowRect.bottom) / stageScale;
    result.serveOnFloor = parseFloat(getComputedStyle($("#boreumi")).height) >= 290 && serveClearance > 90;
    await new Promise(resolve => setTimeout(resolve, 850));
    result.guestLeavesAfterServe = !Guests[0].active && !$(`[data-guest="0"]`).classList.contains("active");
    result.returnsToIdle = $("#boreumi").dataset.mode === "idle" && $("#boreumi").dataset.pose === "idle";

    const stage = $("#stage").getBoundingClientRect();
    const dock = $(".dock").getBoundingClientRect();
    const left = $("#cookLeft").getBoundingClientRect();
    const right = $("#cookRight").getBoundingClientRect();
    result.landscape = stage.width > stage.height;
    result.noDockOverlap = dock.top >= Math.max(left.bottom, right.bottom) - 2;
    result.adaptive1080Stage = Config.stage.currentWidth >= Config.stage.safeWidth
      && Config.stage.currentWidth <= Config.stage.maxWidth
      && parseFloat(getComputedStyle($("#stage")).height) === Config.stage.height;
    result.futureExpansionReserved = Config.layout.futureGuestCapacity >= 5
      && Config.layout.reservedStations.includes("takeout")
      && Config.layout.reservedStations.includes("service-pass");

    const output = document.createElement("pre");
    output.id = "qa-results";
    output.textContent = JSON.stringify(result, null, 2);
    output.style.cssText = "position:absolute;z-index:99999;left:0;top:0;width:360px;margin:0;padding:8px;background:white;color:black;font-size:11px;line-height:1.25;white-space:pre-wrap";
    if (!qaParams.has("silent")) $("#stage").append(output);
    document.documentElement.dataset.qa = Object.values(result).every(Boolean) ? "pass" : "fail";
  }

  build();
  State.cookingTimer = setInterval(tickCooking, Config.cooking.tickMs);
  $$(".ingredient,.appliance").forEach(bindDrag);
  document.addEventListener("pointermove", moveDrag, { passive: false });
  document.addEventListener("pointerup", endDrag, { passive: false });
  document.addEventListener("pointercancel", endDrag, { passive: false });
  $("#startButton").addEventListener("click", start);
  $("#pauseButton").addEventListener("click", () => {
    if (!State.running) return toast("영업 중에 사용할 수 있어요.");
    State.paused = true;
    $("#pauseOverlay").classList.remove("hidden");
  });
  $("#resumeButton").addEventListener("click", () => {
    State.paused = false;
    $("#pauseOverlay").classList.add("hidden");
  });
  document.addEventListener("dragstart", event => event.preventDefault());
  window.addEventListener("resize", resize, { passive: true });
  window.visualViewport?.addEventListener("resize", resize, { passive: true });
  resize();
  startPpomiPoses();
  browserQA();
})();
