(() => {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const UrlParams = new URLSearchParams(location.search);
  const IsQA = UrlParams.has("qa");
  const PreviewLevel = Math.max(0, Math.min(5, Math.floor(Number(UrlParams.get("level")) || 0)));
  const PreviewDay = Math.max(0, Math.floor(Number(UrlParams.get("day")) || 0));
  const SaveKey = IsQA ? "boreumi-ramen-v022-qa" : "boreumi-ramen-v022";
  const AudioPreferenceKey = IsQA ? "boreumi-ramen-v022-audio-qa" : "boreumi-ramen-v022-audio";
  const TutorialPreferenceKey = IsQA ? "boreumi-ramen-v022-tutorial-qa" : "boreumi-ramen-v022-tutorial";
  const LegacySaveKeys = ["boreumi-ramen-v021", "boreumi-ramen-v020", "boreumi-ramen-v019", "boreumi-ramen-v0181", "boreumi-ramen-v018", "boreumi-ramen-v017", "boreumi-ramen-v016", "boreumi-ramen-v015"];
  const LegacyAudioPreferenceKeys = ["boreumi-ramen-v021-audio", "boreumi-ramen-v020-audio", "boreumi-ramen-v019-audio", "boreumi-ramen-v0181-audio", "boreumi-ramen-v018-audio", "boreumi-ramen-v017-audio", "boreumi-ramen-v016-audio"];
  const LegacyTutorialPreferenceKeys = ["boreumi-ramen-v021-tutorial", "boreumi-ramen-v020-tutorial", "boreumi-ramen-v019-tutorial", "boreumi-ramen-v0181-tutorial", "boreumi-ramen-v018-tutorial", "boreumi-ramen-v017-tutorial"];

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
      futureGuestCapacity: 10,
      inventoryPageSize: 4,
      inventoryCategories: ["ramen", "drinks", "anju"],
      currentStations: ["pot-1", "pot-2", "grill-1", "oden-1"],
      reservedStations: ["takeout", "service-pass"]
    },
    boreumi: { idleWidth: 300, cookingWidth: 300, servingWidth: 360, idleOffset: -210 },
    daySeconds: 90,
    cooking: { tickMs: 50, defaultBurnMs: 10000 },
    guests: { tickMs: 100, patienceMs: 40000, wrongPenaltyMs: 2500 },
    takeout: {
      patienceMs: 36000,
      missedPenalty: 500,
      firstArrivals: [9000, 25000, 41000],
      repeatDelayMs: 6500,
      bonusByLevel: Object.freeze([0, 0, .12, .16, .21, .28])
    },
    firstArrivals: [700, 3100, 5500, 7900, 10300, 12700, 15100, 17500, 19900, 22300]
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
      burns: true,
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
      burns: true,
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
      burns: true,
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
      burns: false,
      burnMs: 0,
      sprite: "oden-warm",
      art: FoodArt.oden
    })
  });

  const MenuCatalog = Object.freeze({
    ramen_plain: Object.freeze({ id: "ramen_plain", kind: "food", label: "기본 라면", art: FoodArt.pot, price: 3500 }),
    ramen_egg: Object.freeze({ id: "ramen_egg", kind: "food", label: "계란 라면", art: FoodArt.potEgg, price: 4000 }),
    grilled_dumpling: Object.freeze({ id: "grilled_dumpling", kind: "food", label: "군만두", art: FoodArt.grill, price: 2200 }),
    warm_oden: Object.freeze({ id: "warm_oden", kind: "food", label: "오뎅", art: FoodArt.oden, price: 1800 }),
    soju: Object.freeze({ id: "soju", kind: "drink", label: "소주", art: "assets/art-v012/drink-soju-v1.png", price: 1500 }),
    beer: Object.freeze({ id: "beer", kind: "drink", label: "맥주", art: "assets/art-v012/drink-beer-v1.png", price: 2000 }),
    somaek: Object.freeze({ id: "somaek", kind: "drink", label: "소맥", art: "assets/art-v012/drink-somaek-v1.png", price: 2500 }),
    makgeolli: Object.freeze({ id: "makgeolli", kind: "drink", label: "막걸리", art: "assets/art-v012/drink-makgeolli-v1.png", price: 2000 })
  });

  const CustomerCatalog = Object.freeze([
    Object.freeze({ id: "office", name: "회사원", art: "assets/art-v012/customer-office.png" }),
    Object.freeze({ id: "rider", name: "배달기사", art: "assets/art-v012/customer-rider.png" }),
    Object.freeze({ id: "student", name: "학생", art: "assets/art-v012/customer-student.png" }),
    Object.freeze({ id: "baker", name: "빵집 직원", art: "assets/art-v012/customer-baker-v2.png" }),
    Object.freeze({ id: "grandma", name: "반찬가게 할머니", art: "assets/art-v012/customer-grandma-v1.png" }),
    Object.freeze({ id: "driver", name: "택시기사", art: "assets/art-v012/customer-driver-v1.png" }),
    Object.freeze({ id: "nurse", name: "야간 간호사", art: "assets/art-v012/customer-nurse-v1.png" }),
    Object.freeze({ id: "florist", name: "꽃집 사장", art: "assets/art-v012/customer-florist-v1.png" }),
    Object.freeze({ id: "firefighter", name: "소방관", art: "assets/art-v012/customer-firefighter-v1.png" }),
    Object.freeze({ id: "musician", name: "버스커", art: "assets/art-v012/customer-musician-v1.png" }),
    Object.freeze({ id: "teacher", name: "초등 교사", art: "assets/art-v012/customer-teacher-v1.png" }),
    Object.freeze({ id: "fisher", name: "새벽 어부", art: "assets/art-v012/customer-fisher-v1.png" }),
    Object.freeze({ id: "merchant", name: "시장 상인", art: "assets/art-v012/customer-merchant-v1.png" }),
    Object.freeze({ id: "police", name: "동네 순경", art: "assets/art-v012/customer-police-v1.png" }),
    Object.freeze({ id: "cleaner", name: "환경미화원", art: "assets/art-v012/customer-cleaner-v1.png" }),
    Object.freeze({ id: "artist", name: "웹툰 작가", art: "assets/art-v012/customer-artist-v1.png" }),
    Object.freeze({ id: "guard", name: "야간 경비원", art: "assets/art-v012/customer-guard-v1.png" }),
    Object.freeze({ id: "traveler", name: "여행객", art: "assets/art-v012/customer-traveler-v1.png" })
  ]);
  const CustomerById = Object.freeze(Object.fromEntries(CustomerCatalog.map(customer => [customer.id, customer])));
  const FoodOrderPool = Object.freeze(Object.values(MenuCatalog).filter(item => item.kind === "food").map(item => item.id));
  const DrinkOrderPool = Object.freeze(Object.values(MenuCatalog).filter(item => item.kind === "drink").map(item => item.id));

  const ProgressionMilestones = Object.freeze([
    Object.freeze({ day: 1, stall: 1, seats: 3, customers: 3, label: "첫 포차" }),
    Object.freeze({ day: 10, stall: 1, seats: 4, customers: 6, label: "DAY 10" }),
    Object.freeze({ day: 25, stall: 1, seats: 5, customers: 8, label: "DAY 25" }),
    Object.freeze({ day: 50, stall: 2, seats: 6, customers: 10, label: "포차 LV.2 + DAY 50" }),
    Object.freeze({ day: 1, stall: 3, seats: 7, customers: 12, label: "포차 LV.3" }),
    Object.freeze({ day: 1, stall: 4, seats: 8, customers: 15, label: "포차 LV.4" }),
    Object.freeze({ day: 1, stall: 5, seats: 10, customers: 18, label: "포차 LV.5" })
  ]);

  const StationUpgradeCatalog = Object.freeze({
    pot: Object.freeze({
      id: "pot",
      title: "라면 화구",
      subtitle: "모든 냄비 강화",
      costs: Object.freeze([12000, 32000, 72000, 150000]),
      speed: Object.freeze([1, .92, .82, .72, .62]),
      burnBonus: Object.freeze([0, 0, 3000, 6000, 10000]),
      priceBonus: Object.freeze([0, 0, 0, .05, .12])
    }),
    grill: Object.freeze({
      id: "grill",
      title: "만두 그릴",
      subtitle: "모든 그릴 강화",
      costs: Object.freeze([10000, 28000, 65000, 135000]),
      speed: Object.freeze([1, .93, .84, .74, .64]),
      burnBonus: Object.freeze([0, 2000, 4000, 7000, 11000]),
      priceBonus: Object.freeze([0, 0, 0, .05, .12])
    }),
    oden: Object.freeze({
      id: "oden",
      title: "오뎅바",
      subtitle: "보온·회전율 강화",
      costs: Object.freeze([8000, 24000, 56000, 120000]),
      speed: Object.freeze([1, .9, .8, .7, .6]),
      burnBonus: Object.freeze([0, 0, 0, 0, 0]),
      priceBonus: Object.freeze([0, 0, .05, .1, .15])
    })
  });

  const StallUpgradeCatalog = Object.freeze({
    maxLevel: 5,
    costs: Object.freeze([50000, 140000, 320000, 700000]),
    benefits: Object.freeze({
      2: "냄비 3개·포장 주문 1건 해금 · DAY 50부터 좌석 6석/손님 10명",
      3: "그릴 2개·완성대 2칸 해금 · 좌석 7석/손님 12명",
      4: "포장 주문 2건·완성대 3칸 · 좌석 8석/손님 15명",
      5: "포장 주문 3건·완성대 4칸 · 좌석 10석/손님 18명"
    })
  });

  function freshProgress() {
    return {
      version: 6,
      day: 1,
      gold: 0,
      stallLevel: 1,
      stationLevels: { pot: 1, grill: 1, oden: 1 },
      stats: { completedDays: 0, successfulDays: 0, totalSales: 0, totalServed: 0, totalMissed: 0, totalWaste: 0, totalTakeoutServed: 0, totalTakeoutMissed: 0 },
      regulars: Object.fromEntries(CustomerCatalog.map(customer => [customer.id, { visits: 0, served: 0, missed: 0, chapters: 0, lastDay: 0 }])),
      storyLog: []
    };
  }

  function sanitizeProgress(raw) {
    const clean = freshProgress();
    if (!raw || typeof raw !== "object") return clean;
    clean.day = Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(Number(raw.day) || 1)));
    clean.gold = Math.max(0, Math.floor(Number(raw.gold) || 0));
    clean.stallLevel = Math.max(1, Math.min(5, Math.floor(Number(raw.stallLevel) || 1)));
    const legacyUpgradeLevel = Math.max(0, ...Object.values(raw.upgrades || {}).map(value => Math.floor(Number(value) || 0)));
    Object.keys(clean.stationLevels).forEach(key => {
      const migrated = raw.stationLevels?.[key] ?? Math.min(5, Math.max(clean.stallLevel, legacyUpgradeLevel + 1));
      clean.stationLevels[key] = Math.max(1, Math.min(5, Math.floor(Number(migrated) || 1)));
    });
    clean.stallLevel = Math.min(clean.stallLevel, Math.min(...Object.values(clean.stationLevels)));
    Object.keys(clean.stats).forEach(key => {
      clean.stats[key] = Math.max(0, Math.floor(Number(raw.stats?.[key]) || 0));
    });
    Object.keys(clean.regulars).forEach(customerId => {
      const source = raw.regulars?.[customerId];
      Object.keys(clean.regulars[customerId]).forEach(key => {
        clean.regulars[customerId][key] = Math.max(0, Math.floor(Number(source?.[key]) || 0));
      });
    });
    clean.storyLog = Array.isArray(raw.storyLog) ? raw.storyLog.slice(-200).map(entry => ({
      day: Math.max(1, Math.floor(Number(entry?.day) || 1)),
      customerId: CustomerById[entry?.customerId] ? entry.customerId : "office",
      chapter: Math.max(1, Math.floor(Number(entry?.chapter) || 1)),
      text: String(entry?.text || "포차의 이야기가 이어졌어요.").slice(0, 100)
    })) : [];
    return clean;
  }

  function loadProgress() {
    try {
      if (IsQA) localStorage.removeItem(SaveKey);
      let serialized = localStorage.getItem(SaveKey);
      if (!serialized && !IsQA) {
        const legacyKey = LegacySaveKeys.find(key => localStorage.getItem(key));
        if (legacyKey) serialized = localStorage.getItem(legacyKey);
      }
      return sanitizeProgress(JSON.parse(serialized || "null"));
    } catch {
      return freshProgress();
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(SaveKey, JSON.stringify(Progress));
      return true;
    } catch {
      return false;
    }
  }

  let Progress = loadProgress();
  window.BoreumiBoot?.markDataReady();
  let qaRandomSeed = 181;

  function randomUnit() {
    if (!IsQA) return Math.random();
    qaRandomSeed = (qaRandomSeed * 1664525 + 1013904223) >>> 0;
    return qaRandomSeed / 4294967296;
  }

  function randomChoice(items) {
    return items[Math.floor(randomUnit() * items.length)];
  }

  function effectiveStallLevel() {
    return PreviewLevel || Progress.stallLevel;
  }

  function effectiveDay() {
    return PreviewDay || Progress.day;
  }

  function progressionMilestone(day = effectiveDay(), stallLevel = effectiveStallLevel()) {
    return ProgressionMilestones.reduce((current, milestone) => (
      day >= milestone.day && stallLevel >= milestone.stall ? milestone : current
    ), ProgressionMilestones[0]);
  }

  function guestCapacityForLevel(level = effectiveStallLevel(), day = effectiveDay()) {
    return progressionMilestone(day, level).seats;
  }

  function customerPoolSize(level = effectiveStallLevel(), day = effectiveDay()) {
    return progressionMilestone(day, level).customers;
  }

  function unlockedCustomers() {
    return CustomerCatalog.slice(0, customerPoolSize());
  }

  function stageWidthForCapacity(capacity = guestCapacityForLevel()) {
    if (capacity >= 7) return 2340;
    if (capacity >= 6) return 2160;
    return Config.stage.safeWidth;
  }

  function stationCountsForLevel(level = effectiveStallLevel()) {
    return {
      pot: level >= 2 ? 3 : 2,
      grill: level >= 3 ? 2 : 1,
      oden: 1
    };
  }

  function takeoutCapacityForLevel(level = effectiveStallLevel()) {
    if (level >= 5) return 3;
    if (level >= 4) return 2;
    if (level >= 2) return 1;
    return 0;
  }

  function completionPassCapacityForLevel(level = effectiveStallLevel()) {
    if (level >= 5) return 4;
    if (level >= 4) return 3;
    if (level >= 3) return 2;
    return 0;
  }

  function effectiveTakeoutPatienceMs() {
    const dayPressure = Math.min(8000, Math.max(0, effectiveDay() - 1) * 240);
    return Math.max(28000, Config.takeout.patienceMs - dayPressure);
  }

  function isApplianceUnlocked(appliance, level = effectiveStallLevel()) {
    return appliance.slot < stationCountsForLevel(level)[appliance.type];
  }

  function applyStallLevel() {
    const level = effectiveStallLevel();
    const capacity = guestCapacityForLevel(level);
    const poolSize = customerPoolSize(level);
    const stationCounts = stationCountsForLevel(level);
    const takeoutCapacity = takeoutCapacityForLevel(level);
    const passCapacity = completionPassCapacityForLevel(level);
    Config.layout.level = level;
    const stage = $("#stage");
    if (stage) {
      stage.dataset.growthLevel = String(level);
      stage.dataset.guestCapacity = String(capacity);
      stage.dataset.customerPool = String(poolSize);
      stage.dataset.takeoutCapacity = String(takeoutCapacity);
      stage.dataset.passCapacity = String(passCapacity);
    }
    const row = $("#guestRow");
    if (row) row.dataset.capacity = String(capacity);
    Guests?.forEach(guest => {
      const slot = $(`[data-guest="${guest.index}"]`);
      if (!slot) return;
      const locked = guest.index >= capacity;
      slot.hidden = locked;
      slot.setAttribute("aria-hidden", String(locked));
      if (locked && guest.active) {
        guest.active = false;
        guest.serving = false;
        guest.order = null;
        guest.customerId = null;
      }
    });
    Appliances?.forEach(appliance => {
      const element = $(`[data-id="${appliance.id}"]`);
      if (!element) return;
      const locked = !isApplianceUnlocked(appliance, level);
      element.hidden = locked;
      element.setAttribute("aria-hidden", String(locked));
      if (locked && appliance.state !== "empty") resetAppliance(appliance);
    });
    const left = $("#cookLeft");
    const right = $("#cookRight");
    if (left) left.dataset.visible = String(stationCounts.pot);
    if (right) right.dataset.visible = String(stationCounts.grill + stationCounts.oden);
    const takeoutBoard = $("#takeoutBoard");
    if (takeoutBoard) {
      takeoutBoard.hidden = takeoutCapacity === 0;
      takeoutBoard.dataset.capacity = String(takeoutCapacity);
      TakeoutOrders?.forEach(order => {
        const element = $(`[data-takeout="${order.index}"]`);
        if (!element) return;
        const locked = order.index >= takeoutCapacity;
        element.hidden = locked;
        if (locked) resetTakeoutOrder(order, false);
      });
      renderTakeoutQueue();
    }
    const completionPass = $("#completionPass");
    if (completionPass) {
      completionPass.hidden = passCapacity === 0;
      completionPass.dataset.capacity = String(passCapacity);
      CompletionPassSlots?.forEach(slot => {
        const element = $(`[data-pass-slot="${slot.index}"]`);
        if (!element) return;
        const locked = slot.index >= passCapacity;
        element.hidden = locked;
        if (locked) clearPassSlot(slot.index, false);
      });
    }
    resize();
    if ($("#boreumi")?.dataset.mode === "idle") setBoreumiIdlePosition();
  }

  function goalForDay(day = Progress.day) {
    const safeDay = Math.max(1, Number(day) || 1);
    const longTermGrowth = Math.min(20000, Math.floor(Math.log2(safeDay) * 1800 / 500) * 500);
    const weeklyRhythm = [0, 500, 0, 1000, 500, 1500, 0][(safeDay - 1) % 7];
    return 10000 + longTermGrowth + weeklyRhythm;
  }

  function goalBonusForDay(day = Progress.day) {
    return 1000 + Math.min(9000, Math.floor(Math.log2(Math.max(1, Number(day) || 1))) * 500);
  }

  function stationLevel(type) {
    return Math.max(1, Math.min(5, Progress.stationLevels[type] || 1));
  }

  function effectiveCookMs(recipe) {
    const upgrade = StationUpgradeCatalog[recipe.appliance];
    return Math.round(recipe.cookMs * upgrade.speed[stationLevel(recipe.appliance) - 1]);
  }

  function effectiveBurnMs(recipe) {
    if (!recipe.burns) return 0;
    const upgrade = StationUpgradeCatalog[recipe.appliance];
    return recipe.burnMs + upgrade.burnBonus[stationLevel(recipe.appliance) - 1];
  }

  function effectivePatienceMs() {
    const dayPressure = Math.min(8000, Math.max(0, Progress.day - 1) * 500);
    return Math.max(32000, Config.guests.patienceMs - dayPressure);
  }

  function arrivalDelay(baseDelay) {
    const dayFactor = Math.max(.76, 1 - Math.max(0, Progress.day - 1) * .025);
    return Math.max(500, Math.round(baseDelay * dayFactor));
  }

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
        { id: "soju", label: "소주", art: "assets/art-v012/drink-soju-v1.png", draggable: true, kind: "drink" },
        { id: "beer", label: "맥주", art: "assets/art-v012/drink-beer-v1.png", draggable: true, kind: "drink" },
        { id: "somaek", label: "소맥", art: "assets/art-v012/drink-somaek-v1.png", draggable: true, kind: "drink" },
        { id: "makgeolli", label: "막걸리", art: "assets/art-v012/drink-makgeolli-v1.png", draggable: true, kind: "drink" }
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
    tutorialMode: false,
    helpPausedGame: false,
    time: Config.daySeconds,
    sales: 0,
    guests: 0,
    drag: null,
    dayTimer: null,
    cookingTimer: null,
    cookingClock: performance.now(),
    patienceTimer: null,
    guestClock: performance.now(),
    guestTimers: [],
    takeoutTimers: [],
    boreumiTimer: null,
    waste: 0,
    served: 0,
    missed: 0,
    takeoutServed: 0,
    takeoutMissed: 0,
    takeoutPenalty: 0,
    takeoutSerial: 0,
    ratings: { happy: 0, okay: 0, tired: 0 },
    goal: goalForDay(),
    lastSettlement: null,
    dayStories: []
  };

  const Sound = {
    enabled: (() => {
      try {
        const current = localStorage.getItem(AudioPreferenceKey);
        const legacyKey = !current && !IsQA ? LegacyAudioPreferenceKeys.find(key => localStorage.getItem(key)) : null;
        const migrated = legacyKey ? localStorage.getItem(legacyKey) : current;
        return migrated !== "off";
      }
      catch { return true; }
    })(),
    context: null,
    bgmTimer: null,
    bgmStep: 0,
    ensure() {
      if (!this.enabled || IsQA) return null;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!this.context) this.context = new AudioContextClass();
      if (this.context.state === "suspended") this.context.resume().catch(() => undefined);
      return this.context;
    },
    tone(frequency, duration = .18, volume = .025, type = "sine", delay = 0) {
      const context = this.ensure();
      if (!context) return;
      const startAt = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), startAt + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, startAt + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + .03);
    },
    noise(duration = .12, volume = .018) {
      const context = this.ensure();
      if (!context) return;
      const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
      const buffer = context.createBuffer(1, frameCount, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < frameCount; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = volume;
      source.connect(gain).connect(context.destination);
      source.start();
    },
    sfx(name) {
      if (!this.enabled) return;
      if (name === "cook") { this.noise(.11, .012); this.tone(392, .11, .018, "triangle"); }
      else if (name === "drop") { this.tone(520, .1, .022, "triangle"); }
      else if (name === "complete") { this.tone(659, .26, .025, "sine"); this.tone(880, .34, .022, "sine", .1); }
      else if (name === "serve") { this.tone(880, .16, .026, "triangle"); this.tone(1175, .2, .02, "triangle", .07); }
      else if (name === "guest") { this.tone(392, .17, .016, "sine"); this.tone(523, .2, .014, "sine", .08); }
      else if (name === "burn") { this.noise(.28, .028); this.tone(146, .34, .03, "sawtooth"); }
      else if (name === "wrong") { this.tone(196, .2, .025, "square"); }
      else if (name === "discard") { this.noise(.09, .018); this.tone(262, .1, .015, "triangle"); }
      else if (name === "upgrade") { [523, 659, 784].forEach((note, index) => this.tone(note, .34, .018, "sine", index * .07)); }
      else if (name === "finish") { [392, 494, 587, 784].forEach((note, index) => this.tone(note, .5, .016, "sine", index * .11)); }
    },
    haptic(pattern = 10) {
      if (!this.enabled || typeof navigator.vibrate !== "function") return;
      navigator.vibrate(pattern);
    },
    playBgmBeat() {
      const melody = [262, 330, 392, 330, 294, 392, 440, 392];
      const note = melody[this.bgmStep++ % melody.length];
      this.tone(note, 1.25, .009, "sine");
      this.tone(note / 2, 1.45, .006, "triangle");
    },
    startBgm() {
      if (!this.enabled || !State.running || State.paused || this.bgmTimer) return;
      if (!this.ensure()) return;
      this.playBgmBeat();
      this.bgmTimer = setInterval(() => this.playBgmBeat(), 1450);
    },
    stopBgm() {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    },
    syncButton() {
      const button = $("#soundButton");
      if (!button) return;
      button.setAttribute("aria-pressed", String(this.enabled));
      button.setAttribute("aria-label", this.enabled ? "소리 끄기" : "소리 켜기");
      button.querySelector("span").textContent = this.enabled ? "♪" : "♩";
      $("#stage").dataset.audio = this.enabled ? "on" : "off";
    },
    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      try { localStorage.setItem(AudioPreferenceKey, this.enabled ? "on" : "off"); } catch { /* Preference remains in memory. */ }
      this.syncButton();
      if (this.enabled) {
        this.ensure();
        this.startBgm();
        this.sfx("drop");
      } else {
        this.stopBgm();
      }
    }
  };

  const Appliances = [
    ...Array.from({ length: 3 }, (_, index) => ({ id: `pot-${index}`, type: "pot", slot: index, state: "empty", item: null, ingredients: [], recipeId: null, cookRemaining: 0, burnRemaining: 0 })),
    ...Array.from({ length: 2 }, (_, index) => ({ id: `grill-${index}`, type: "grill", slot: index, state: "empty", item: null, ingredients: [], recipeId: null, cookRemaining: 0, burnRemaining: 0 })),
    { id: "oden-0", type: "oden", slot: 0, state: "empty", item: null, ingredients: [], recipeId: null, cookRemaining: 0, burnRemaining: 0 }
  ];

  const Guests = Array.from({ length: Config.layout.futureGuestCapacity }, (_, index) => ({
    index,
    customerId: null,
    active: false,
    serving: false,
    order: null,
    patience: 0,
    maxPatience: Config.guests.patienceMs,
    satisfaction: "waiting"
  }));

  const TakeoutOrders = Array.from({ length: 3 }, (_, index) => ({
    index,
    serial: 0,
    active: false,
    packed: false,
    missed: false,
    items: [],
    patience: 0,
    maxPatience: Config.takeout.patienceMs
  }));

  const CompletionPassSlots = Array.from({ length: 4 }, (_, index) => ({
    index,
    recipeId: null
  }));

  const Tutorial = {
    active: false,
    step: null,
    closeTimer: null,
    completed: (() => {
      try {
        const current = localStorage.getItem(TutorialPreferenceKey);
        if (current === "done") return true;
        return !IsQA && LegacyTutorialPreferenceKeys.some(key => localStorage.getItem(key) === "done");
      }
      catch { return false; }
    })(),
    steps: Object.freeze({
      welcome: Object.freeze({ order: 1, eyebrow: "연습 포차 · 1/6", title: "보름이의 연습 포차에 어서 오세요", text: "실제 영업과 분리된 연습이에요. DAY 시간과 손님 인내심은 줄어들지 않아요." }),
      waitGuest: Object.freeze({ order: 2, eyebrow: "주문 확인 · 2/6", title: "연습 손님의 주문을 확인해요", text: "첫 손님은 기본 라면과 소주를 주문했어요. 이 주문은 튜토리얼 동안 바뀌지 않아요." }),
      addNoodle: Object.freeze({ order: 3, eyebrow: "라면 조리 · 3/6", title: "면을 냄비에 넣어주세요", text: "하단의 면 일러스트를 빈 냄비까지 끌어서 놓으면 조리가 즉시 시작돼요." }),
      waitCooking: Object.freeze({ order: 4, eyebrow: "조리 기다리기 · 4/6", title: "진행 막대를 확인하세요", text: "보름이가 조리하는 동안 다른 주문을 준비할 수 있어요. 완성 후에는 타기 전에 서빙해요." }),
      serveFood: Object.freeze({ order: 5, eyebrow: "음식 서빙 · 5/6", title: "완성된 라면을 손님에게", text: "완성 라면을 주문한 손님 캐릭터나 말풍선까지 끌어서 전달해 주세요." }),
      serveDrink: Object.freeze({ order: 6, eyebrow: "주류 서빙 · 6/6", title: "남은 주류도 전달해요", text: "하단 주류 진열대에서 주문한 술을 같은 손님에게 끌어다 놓으면 주문이 완성돼요." }),
      done: Object.freeze({ order: 7, eyebrow: "첫 주문 완료!", title: "이제 포차를 맡겨도 되겠어요", text: "완성·탄 음식은 짧게 누르면 즉시 폐기돼요. 도움말은 오른쪽 위 ? 버튼에서 다시 볼 수 있어요." })
    }),
    clearFocus() {
      $$(".tutorial-focus").forEach(element => element.classList.remove("tutorial-focus"));
      const path = $("#tutorialPath");
      path?.classList.add("hidden");
      path?.style.removeProperty("left");
      path?.style.removeProperty("top");
      path?.style.removeProperty("width");
      path?.style.removeProperty("transform");
    },
    activeGuest() {
      return Guests.find(guest => guest.active && !guest.serving) || null;
    },
    elementsForStep() {
      const guest = this.activeGuest();
      if (this.step === "welcome") return { focus: [$("#tutorialStageBadge")] };
      if (this.step === "waitGuest") return { focus: [guest ? $(`[data-guest="${guest.index}"]`) : $("#guestRow")] };
      if (this.step === "addNoodle") {
        const source = $('.ingredient[data-item="noodle"]');
        const target = $$('.appliance.pot').find(element => element.dataset.state === "empty") || $('.appliance.pot');
        return { source, target, focus: [source, target] };
      }
      if (this.step === "waitCooking") {
        const target = $$('.appliance.pot').find(element => element.dataset.state === "cooking") || $('.appliance.pot');
        return { focus: [target] };
      }
      if (this.step === "serveFood") {
        const source = $$('.appliance.pot').find(element => element.dataset.state === "ready");
        const target = guest ? $(`[data-guest="${guest.index}"]`) : $("#guestRow");
        return { source, target, focus: [source, target] };
      }
      if (this.step === "serveDrink") {
        const pendingDrink = guest?.order?.items.find(item => !item.fulfilled && MenuCatalog[item.id]?.kind === "drink");
        const source = pendingDrink ? $(`.ingredient[data-item="${pendingDrink.id}"]`) : $('.ingredient[data-kind="drink"]');
        const target = guest ? $(`[data-guest="${guest.index}"]`) : $("#guestRow");
        return { source, target, focus: [source, target] };
      }
      return { focus: [] };
    },
    layoutPath() {
      if (!this.active) return;
      const { source, target } = this.elementsForStep();
      const path = $("#tutorialPath");
      if (!source || !target || !path) return path?.classList.add("hidden");
      const start = stagePointFor(source);
      const end = stagePointFor(target);
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      path.style.left = `${start.x}px`;
      path.style.top = `${start.y}px`;
      path.style.width = `${Math.max(48, Math.hypot(dx, dy))}px`;
      path.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      path.classList.remove("hidden");
    },
    render() {
      this.clearFocus();
      const coach = $("#tutorialCoach");
      if (!this.active || !this.steps[this.step]) return coach?.classList.add("hidden");
      const copy = this.steps[this.step];
      $("#tutorialStep").textContent = copy.eyebrow;
      $("#tutorialTitle").textContent = copy.title;
      $("#tutorialText").textContent = copy.text;
      const actionVisible = ["welcome", "waitGuest", "done"].includes(this.step);
      $("#tutorialActionButton").classList.toggle("hidden", !actionVisible);
      $("#tutorialActionButton").textContent = this.step === "welcome" ? "주문 확인" : this.step === "waitGuest" ? "조리 연습 시작" : "영업 화면으로";
      $("#tutorialSkipButton").classList.toggle("hidden", this.step === "done");
      coach.classList.remove("hidden");
      this.elementsForStep().focus.filter(Boolean).forEach(element => element.classList.add("tutorial-focus"));
      this.layoutPath();
      requestAnimationFrame(() => this.layoutPath());
    },
    setStep(step) {
      if (!this.steps[step]) return;
      this.step = step;
      this.render();
      Sound.sfx(step === "done" ? "upgrade" : "drop");
    },
    inferStep() {
      if (!State.tutorialMode) return "welcome";
      const guest = this.activeGuest();
      if (!guest) return "waitGuest";
      const readyPot = Appliances.some(appliance => appliance.type === "pot" && appliance.state === "ready");
      if (readyPot) return "serveFood";
      const cookingPot = Appliances.some(appliance => appliance.type === "pot" && appliance.state === "cooking");
      if (cookingPot) return "waitCooking";
      const pendingFood = guest.order?.items.some(item => !item.fulfilled && MenuCatalog[item.id]?.kind === "food");
      return pendingFood ? "addNoodle" : "serveDrink";
    },
    enterPractice() {
      clearInterval(State.dayTimer);
      clearGuestTimers();
      clearTakeoutTimers();
      resetGuests();
      resetTakeoutOrders();
      resetCompletionPass();
      Appliances.forEach(resetAppliance);
      State.running = true;
      State.paused = false;
      State.tutorialMode = true;
      State.time = Config.daySeconds;
      State.sales = 0;
      State.guests = 1;
      State.waste = 0;
      State.served = 0;
      State.missed = 0;
      State.takeoutServed = 0;
      State.takeoutMissed = 0;
      State.takeoutPenalty = 0;
      State.ratings = { happy: 0, okay: 0, tired: 0 };
      State.cookingClock = performance.now();
      State.guestClock = performance.now();
      const guest = Guests[0];
      guest.customerId = CustomerById.office ? "office" : CustomerCatalog[0].id;
      guest.active = true;
      guest.serving = false;
      guest.satisfaction = "waiting";
      guest.maxPatience = Config.guests.patienceMs;
      guest.patience = guest.maxPatience;
      guest.order = createOrder("ramen_plain", "soju");
      renderGuest(guest);
      $("#stage").dataset.tutorial = "true";
      $("#tutorialStageBadge").hidden = false;
      $(".hud").classList.add("running");
      $("#startButton").disabled = true;
      $("#startButton").setAttribute("aria-label", "연습중");
      $("#startButton strong").textContent = "연습중";
      renderHud();
      setBoreumiIdle();
    },
    exitPractice() {
      if (!State.tutorialMode) return;
      clearInterval(State.dayTimer);
      clearGuestTimers();
      clearTakeoutTimers();
      Sound.stopBgm();
      State.running = false;
      State.paused = false;
      State.tutorialMode = false;
      State.time = Config.daySeconds;
      State.sales = 0;
      State.guests = 0;
      State.waste = 0;
      State.served = 0;
      State.missed = 0;
      State.takeoutServed = 0;
      State.takeoutMissed = 0;
      State.takeoutPenalty = 0;
      State.ratings = { happy: 0, okay: 0, tired: 0 };
      resetGuests();
      resetTakeoutOrders();
      resetCompletionPass();
      Appliances.forEach(resetAppliance);
      $("#stage").dataset.tutorial = "false";
      $("#tutorialStageBadge").hidden = true;
      $(".hud").classList.remove("running");
      $("#startButton").disabled = false;
      $("#startButton").setAttribute("aria-label", "영업 시작");
      $("#startButton strong").textContent = "영업 시작";
      renderHud();
      setBoreumiIdle();
    },
    start() {
      clearTimeout(this.closeTimer);
      if (State.running && !State.tutorialMode) {
        toast("현재 영업을 마친 뒤 연습 포차를 이용해 주세요.");
        return false;
      }
      $("#helpOverlay")?.classList.add("hidden");
      this.enterPractice();
      this.active = true;
      this.setStep("welcome");
      return true;
    },
    advance() {
      if (this.step === "welcome") this.setStep("waitGuest");
      else if (this.step === "waitGuest") this.setStep("addNoodle");
      else if (this.step === "done") this.close(false);
    },
    close(markComplete = false) {
      clearTimeout(this.closeTimer);
      if (markComplete) {
        this.completed = true;
        try { localStorage.setItem(TutorialPreferenceKey, "done"); } catch { /* Tutorial status remains in memory. */ }
      }
      this.active = false;
      this.step = null;
      this.clearFocus();
      $("#tutorialCoach")?.classList.add("hidden");
      this.exitPractice();
    },
    complete() {
      this.completed = true;
      try { localStorage.setItem(TutorialPreferenceKey, "done"); } catch { /* Tutorial status remains in memory. */ }
      this.setStep("done");
    },
    handle(event, data = {}) {
      if (!this.active) return;
      if (event === "cooking" && this.step === "addNoodle" && data.appliance?.type === "pot") this.setStep("waitCooking");
      else if (event === "ready" && this.step === "waitCooking" && data.appliance?.type === "pot") this.setStep("serveFood");
      else if (event === "served" && this.step === "serveFood" && data.kind === "food") this.setStep("serveDrink");
      else if (event === "served" && this.step === "serveDrink" && data.kind === "drink") this.complete();
    },
    scheduleFirstRun() {
      const forced = new URLSearchParams(location.search).has("tutorial");
      if (IsQA || (this.completed && !forced)) return;
      const launch = () => setTimeout(() => {
        if (!$("#helpOverlay").classList.contains("hidden")) return;
        this.start();
      }, 260);
      if (window.BoreumiBoot?.state.complete) launch();
      else window.addEventListener("boreumi:ready", launch, { once: true });
    }
  };

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
      ? `<button class="ingredient catalog-item${item.kind === "drink" ? " drink-item" : ""}" data-item="${item.id}" data-kind="${item.kind || "ingredient"}" aria-label="${item.label}"><img src="${item.art}" alt=""><span class="item-name">${item.label}</span></button>`
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

  function buildTakeoutAndPass() {
    const orderList = $("#takeoutOrders");
    orderList.replaceChildren();
    TakeoutOrders.forEach(order => {
      orderList.insertAdjacentHTML("beforeend", `<article class="takeout-order" data-takeout="${order.index}" aria-label="포장 주문 ${order.index + 1}" hidden><span class="ticket-number">대기</span><div class="takeout-items"></div><span class="package-preview" aria-hidden="true"></span><span class="takeout-patience"><i></i></span></article>`);
    });
    const pass = $("#passSlots");
    pass.replaceChildren();
    CompletionPassSlots.forEach(slot => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pass-slot empty";
      button.dataset.passSlot = String(slot.index);
      button.setAttribute("aria-label", `완성대 ${slot.index + 1} · 비어 있음`);
      button.hidden = true;
      pass.append(button);
      bindDrag(button);
    });
  }

  function build() {
    buildDock();
    buildTakeoutAndPass();
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
      row.insertAdjacentHTML("beforeend", `<article class="guest-slot" data-guest="${guest.index}"><div class="bubble" aria-label="주문"><div class="order-items"></div><span class="satisfaction" aria-hidden="true"></span></div><div class="guest-seat" role="img" aria-label="빈 의자"></div><div class="guest-art" role="img" aria-label="방문 손님"></div><div class="patience" aria-label="손님 인내심"><i></i></div></article>`);
    });

    applyStallLevel();
    renderAll();
    Guests.forEach(renderGuest);
  }

  function resize() {
    const viewport = window.visualViewport || window;
    const stage = $("#stage");
    const logicalViewport = window.BoreumiPWA?.logicalViewport || { width: viewport.width, height: viewport.height };
    const viewportRatio = logicalViewport.width / logicalViewport.height;
    const adaptiveWidth = Math.round(Config.stage.height * viewportRatio);
    const requiredWidth = stageWidthForCapacity();
    const stageWidth = Math.max(requiredWidth, Math.min(Config.stage.maxWidth, adaptiveWidth));
    const scale = Math.min(logicalViewport.width / stageWidth, logicalViewport.height / Config.stage.height);
    Config.stage.currentWidth = stageWidth;
    stage.style.width = `${stageWidth}px`;
    stage.style.setProperty("--stage-width", `${stageWidth}px`);
    stage.style.setProperty("--safe-left", `${(stageWidth - Config.stage.safeWidth) / 2}px`);
    stage.dataset.viewport = stageWidth > Config.stage.safeWidth ? "expanded" : "safe";
    stage.dataset.layoutWidth = String(requiredWidth);
    stage.style.transform = `scale(${scale})`;
    if ($("#boreumi")?.dataset.mode === "idle") setBoreumiIdlePosition();
    Tutorial?.layoutPath?.();
  }

  function money(value) {
    return value.toLocaleString("ko-KR") + "원";
  }

  function renderHud() {
    const dayText = String(effectiveDay());
    $("#dayNumber").textContent = dayText;
    $("#stage").dataset.dayDigits = String(dayText.length);
    $("#goalAmount").textContent = State.tutorialMode ? "연습 전용" : money(State.goal);
    $("#time").textContent = State.tutorialMode ? "시간 정지" : `${String(Math.floor(State.time / 60)).padStart(2, "0")}:${String(State.time % 60).padStart(2, "0")}`;
    $("#timeFill").style.width = State.tutorialMode ? "100%" : `${State.time / Config.daySeconds * 100}%`;
    $("#sales").textContent = State.tutorialMode ? "저장 안 됨" : money(State.sales);
    $("#guestCount").textContent = State.tutorialMode ? "연습 1명" : State.guests + "명";
    $("#stallLevel").textContent = String(effectiveStallLevel());
    $("#walletGold").textContent = money(Progress.gold);
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

  function stagePointFor(element) {
    const stage = $("#stage");
    const stageRect = stage.getBoundingClientRect();
    const targetRect = element.getBoundingClientRect();
    const scale = stageRect.width / Config.stage.currentWidth || 1;
    return {
      x: (targetRect.left + targetRect.width / 2 - stageRect.left) / scale,
      y: (targetRect.top + targetRect.height * .48 - stageRect.top) / scale
    };
  }

  function burstAt(element, kind = "drop", count = 8) {
    if (!element) return;
    const layer = $("#fxLayer");
    const point = stagePointFor(element);
    for (let index = 0; index < count; index += 1) {
      const particle = document.createElement("i");
      const angle = Math.PI * 2 * index / count + Math.random() * .28;
      const distance = 38 + Math.random() * 42;
      particle.className = `fx-particle ${kind}`;
      particle.style.setProperty("--x", `${point.x}px`);
      particle.style.setProperty("--y", `${point.y}px`);
      particle.style.setProperty("--tx", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--ty", `${Math.sin(angle) * distance}px`);
      layer.append(particle);
      setTimeout(() => particle.remove(), 900);
    }
  }

  function floatFeedback(element, text, kind = "sale") {
    if (!element) return;
    const point = stagePointFor(element);
    const feedback = document.createElement("strong");
    feedback.className = `float-feedback ${kind}`;
    feedback.textContent = text;
    feedback.style.setProperty("--x", `${point.x}px`);
    feedback.style.setProperty("--y", `${point.y}px`);
    $("#fxLayer").append(feedback);
    setTimeout(() => feedback.remove(), 1120);
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
    if (appliance.state === "cooking" && recipe) progress = 1 - appliance.cookRemaining / effectiveCookMs(recipe);
    if (appliance.state === "ready" && recipe) progress = recipe.burns ? appliance.burnRemaining / effectiveBurnMs(recipe) : 1;
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
    element.classList.toggle("keeps-warm", appliance.state === "ready" && recipeFor(appliance)?.burns === false);
    element.dataset.state = appliance.state;
    element.dataset.recipe = appliance.recipeId || "";
    element.setAttribute("aria-label", `${appliance.type === "pot" ? `냄비 ${appliance.slot + 1}` : appliance.type === "grill" ? `그릴 ${appliance.slot + 1}` : "오뎅바"} · ${applianceStateLabel(appliance)}`);
    art.innerHTML = `<i class="kitchen-sprite sprite-${spriteFor(appliance)}"></i><span class="cook-fx" aria-hidden="true"><i></i><i></i><i></i></span>`;
    renderProgress(appliance);
  }

  function renderAll() {
    Appliances.forEach(renderAppliance);
    renderHud();
  }

  function createOrder(foodId, drinkId) {
    return {
      id: `${foodId}+${drinkId}`,
      items: [foodId, drinkId].map(id => ({ id, fulfilled: false }))
    };
  }

  function assignOrder(guest) {
    guest.order = createOrder(randomChoice(FoodOrderPool), randomChoice(DrinkOrderPool));
  }

  function chooseCustomer() {
    const seated = new Set(Guests.filter(guest => guest.active && guest.customerId).map(guest => guest.customerId));
    const pool = unlockedCustomers();
    const available = pool.filter(customer => !seated.has(customer.id));
    return randomChoice(available.length ? available : pool);
  }

  function regularRecord(customerId) {
    return Progress.regulars[customerId];
  }

  function recordCustomerVisit(customerId) {
    const record = regularRecord(customerId);
    record.visits += 1;
    record.lastDay = Progress.day;
  }

  function recordCustomerMissed(customerId) {
    const record = regularRecord(customerId);
    record.missed += 1;
    record.lastDay = Progress.day;
  }

  function recordCustomerStory(customerId) {
    const customer = CustomerById[customerId];
    const record = regularRecord(customerId);
    record.served += 1;
    record.lastDay = Progress.day;
    const served = record.served;
    const milestone = served === 1 || served === 5 || served === 10 || served % 25 === 0;
    if (!milestone) return null;
    record.chapters += 1;
    const text = served === 1
      ? `${customer.name}님과 첫 이야기가 시작됐어요.`
      : served === 5
        ? `${customer.name}님이 익숙한 단골이 되었어요.`
        : `${customer.name}님과 ${served}번째 식사를 함께했어요.`;
    const entry = { day: Progress.day, customerId, chapter: record.chapters, text };
    Progress.storyLog.push(entry);
    Progress.storyLog = Progress.storyLog.slice(-200);
    State.dayStories.push(entry);
    saveProgress();
    return entry;
  }

  function pendingItems(guest) {
    return guest.order?.items.filter(item => !item.fulfilled) || [];
  }

  function renderPatience(guest) {
    const slot = $(`[data-guest="${guest.index}"]`);
    if (!slot) return;
    const ratio = guest.maxPatience ? Math.max(0, Math.min(1, guest.patience / guest.maxPatience)) : 0;
    slot.querySelector(".patience i").style.width = `${ratio * 100}%`;
    slot.classList.toggle("low-patience", guest.active && ratio <= .3);
    slot.querySelector(".patience").setAttribute("aria-label", `손님 인내심 ${Math.round(ratio * 100)}%`);
  }

  function renderGuest(guest) {
    const slot = $(`[data-guest="${guest.index}"]`);
    const customer = CustomerById[guest.customerId];
    slot.classList.toggle("active", guest.active);
    slot.classList.toggle("serving", guest.serving);
    slot.dataset.satisfaction = guest.satisfaction;
    slot.classList.toggle("satisfied", ["happy", "okay", "tired"].includes(guest.satisfaction));
    slot.classList.toggle("angry", guest.satisfaction === "angry");
    slot.dataset.customer = customer?.id || "";
    const guestArt = slot.querySelector(".guest-art");
    guestArt.style.backgroundImage = customer ? `url("${customer.art}")` : "none";
    guestArt.setAttribute("aria-label", customer?.name || "방문 손님");
    const items = slot.querySelector(".order-items");
    const orderItems = guest.order?.items || [];
    items.innerHTML = orderItems.map((orderItem, index) => {
      const menuItem = MenuCatalog[orderItem.id];
      const itemHtml = `<span class="order-item${orderItem.fulfilled ? " fulfilled" : ""}" data-order-item="${orderItem.id}" aria-label="${menuItem.label}${orderItem.fulfilled ? " 전달 완료" : " 대기"}"><img src="${menuItem.art}" alt="${menuItem.label}"></span>`;
      return index < orderItems.length - 1 ? `${itemHtml}<b class="order-plus" aria-hidden="true">+</b>` : itemHtml;
    }).join("");
    const satisfaction = slot.querySelector(".satisfaction");
    satisfaction.textContent = guest.satisfaction === "happy" ? "♥" : guest.satisfaction === "okay" ? "✓" : guest.satisfaction === "tired" ? "…" : guest.satisfaction === "angry" ? "!" : "";
    renderPatience(guest);
  }

  function menuPriceWithUpgrade(itemId) {
    const menuItem = MenuCatalog[itemId];
    const applianceType = RecipeCatalog[itemId]?.appliance;
    if (!applianceType) return menuItem.price;
    const upgrade = StationUpgradeCatalog[applianceType];
    const bonus = upgrade.priceBonus[stationLevel(applianceType) - 1];
    return Math.round(menuItem.price * (1 + bonus));
  }

  function createTakeoutItems() {
    const level = effectiveStallLevel();
    const ids = [randomChoice(FoodOrderPool)];
    if (level >= 4 || (level >= 3 && randomUnit() < .5)) ids.push(randomChoice(DrinkOrderPool));
    return ids.map(id => ({ id, fulfilled: false }));
  }

  function renderTakeoutQueue() {
    const capacity = takeoutCapacityForLevel();
    const active = TakeoutOrders.filter(order => order.index < capacity && order.active).length;
    const badge = $("#takeoutQueue");
    if (badge) badge.textContent = `${active}/${capacity}`;
  }

  function renderTakeoutOrder(order) {
    const element = $(`[data-takeout="${order.index}"]`);
    if (!element) return;
    const locked = order.index >= takeoutCapacityForLevel();
    element.hidden = locked;
    element.classList.toggle("active", order.active);
    element.classList.toggle("packed", order.packed);
    element.classList.toggle("missed", order.missed);
    element.classList.toggle("partly-packed", order.active && order.items.some(item => item.fulfilled));
    element.querySelector(".ticket-number").textContent = order.active ? `#${String(order.serial).padStart(2, "0")}` : "대기";
    const items = element.querySelector(".takeout-items");
    items.innerHTML = order.active ? order.items.map((item, index) => {
      const menuItem = MenuCatalog[item.id];
      const itemHtml = `<span class="takeout-item${item.fulfilled ? " fulfilled" : ""}" data-takeout-item="${item.id}" aria-label="${menuItem.label}${item.fulfilled ? " 포장 완료" : " 대기"}"><img src="${menuItem.art}" alt="${menuItem.label}"></span>`;
      return index < order.items.length - 1 ? `${itemHtml}<b class="takeout-plus" aria-hidden="true">+</b>` : itemHtml;
    }).join("") : `<small>${order.missed ? "주문 취소" : "주문 대기"}</small>`;
    const ratio = order.maxPatience ? Math.max(0, Math.min(1, order.patience / order.maxPatience)) : 0;
    element.querySelector(".takeout-patience i").style.width = `${ratio * 100}%`;
    element.classList.toggle("low-patience", order.active && ratio <= .3);
    element.setAttribute("aria-label", order.active ? `포장 주문 ${order.serial} · 남은 시간 ${Math.round(ratio * 100)}%` : "빈 포장 주문 칸");
    renderTakeoutQueue();
  }

  function renderPassSlot(index) {
    const slot = CompletionPassSlots[index];
    const element = $(`[data-pass-slot="${index}"]`);
    if (!slot || !element) return;
    const locked = index >= completionPassCapacityForLevel();
    element.hidden = locked;
    element.classList.toggle("empty", !slot.recipeId);
    element.classList.toggle("ready", Boolean(slot.recipeId));
    element.replaceChildren();
    if (slot.recipeId) {
      const image = document.createElement("img");
      image.src = MenuCatalog[slot.recipeId].art;
      image.alt = MenuCatalog[slot.recipeId].label;
      element.append(image);
    }
    element.setAttribute("aria-label", slot.recipeId ? `완성대 ${index + 1} · ${MenuCatalog[slot.recipeId].label}` : `완성대 ${index + 1} · 비어 있음`);
  }

  function clearPassSlot(index, announce = false) {
    const slot = CompletionPassSlots[index];
    if (!slot) return;
    slot.recipeId = null;
    renderPassSlot(index);
    if (announce) toast("완성대를 비웠어요.");
  }

  function resetCompletionPass() {
    CompletionPassSlots.forEach(slot => clearPassSlot(slot.index, false));
  }

  function clearGuestTimers() {
    State.guestTimers.forEach(clearTimeout);
    State.guestTimers = [];
  }

  function clearTakeoutTimers() {
    State.takeoutTimers.forEach(clearTimeout);
    State.takeoutTimers = [];
  }

  function resetTakeoutOrder(order, reschedule = false) {
    if (!order) return;
    order.active = false;
    order.packed = false;
    order.missed = false;
    order.items = [];
    order.patience = 0;
    renderTakeoutOrder(order);
    if (reschedule && State.running && order.index < takeoutCapacityForLevel()) {
      scheduleTakeout(order.index, Config.takeout.repeatDelayMs + order.index * 900);
    }
  }

  function resetTakeoutOrders() {
    clearTakeoutTimers();
    TakeoutOrders.forEach(order => resetTakeoutOrder(order, false));
  }

  function scheduleTakeout(index, delay) {
    if (index >= takeoutCapacityForLevel()) return;
    const timer = setTimeout(() => activateTakeout(index), delay);
    State.takeoutTimers.push(timer);
  }

  function activateTakeout(index) {
    const order = TakeoutOrders[index];
    if (!order || index >= takeoutCapacityForLevel() || !State.running || order.active) return;
    order.serial = ++State.takeoutSerial;
    order.active = true;
    order.packed = false;
    order.missed = false;
    order.items = createTakeoutItems();
    order.maxPatience = effectiveTakeoutPatienceMs();
    order.patience = order.maxPatience;
    renderTakeoutOrder(order);
    Sound.sfx("guest");
    Sound.haptic(10);
    burstAt($(`[data-takeout="${index}"]`), "drop", 6);
    toast(`포장 주문 #${String(order.serial).padStart(2, "0")}이 들어왔어요!`);
  }

  function expireTakeout(order) {
    if (!order.active || order.packed) return;
    order.patience = 0;
    order.active = false;
    order.missed = true;
    State.takeoutMissed += 1;
    State.takeoutPenalty += Config.takeout.missedPenalty;
    renderTakeoutOrder(order);
    renderHud();
    Sound.sfx("wrong");
    Sound.haptic([18, 24, 34]);
    floatFeedback($(`[data-takeout="${order.index}"]`), `-${money(Config.takeout.missedPenalty)}`, "warning");
    toast(`포장 주문을 놓쳤어요. 정산에서 ${money(Config.takeout.missedPenalty)} 차감돼요.`);
    const timer = setTimeout(() => resetTakeoutOrder(order, true), 760);
    State.takeoutTimers.push(timer);
  }

  function rejectTakeoutItem(order) {
    if (!order?.active) return toast("아직 포장 주문이 없어요.");
    order.patience = Math.max(0, order.patience - Config.guests.wrongPenaltyMs);
    renderTakeoutOrder(order);
    const element = $(`[data-takeout="${order.index}"]`);
    element.classList.remove("wrong-order");
    void element.offsetWidth;
    element.classList.add("wrong-order");
    setTimeout(() => element.classList.remove("wrong-order"), 430);
    Sound.sfx("wrong");
    if (order.patience <= 0) expireTakeout(order);
    else toast("포장 주문과 다른 메뉴예요.");
  }

  function completeTakeout(order) {
    const basePrice = order.items.reduce((sum, item) => sum + menuPriceWithUpgrade(item.id), 0);
    const bonus = Config.takeout.bonusByLevel[effectiveStallLevel()] || 0;
    const price = Math.round(basePrice * (1 + bonus));
    order.packed = true;
    order.active = false;
    State.sales += price;
    State.served += 1;
    State.takeoutServed += 1;
    renderTakeoutOrder(order);
    renderHud();
    Sound.sfx("serve");
    Sound.haptic([12, 18, 12]);
    burstAt($(`[data-takeout="${order.index}"]`), "serve", 9);
    floatFeedback($(`[data-takeout="${order.index}"]`), `+${money(price)}`, "sale");
    say("따뜻하게 포장했어요!");
    toast(`포장 완료 +${money(price)} · 포장 보너스 ${Math.round(bonus * 100)}%`);
    const timer = setTimeout(() => resetTakeoutOrder(order, true), 820);
    State.takeoutTimers.push(timer);
  }

  function deliverTakeoutItem(orderIndex, itemId, appliance = null, passIndex = null) {
    const order = TakeoutOrders[orderIndex];
    if (!order?.active) {
      toast("아직 포장 주문이 없어요.");
      return false;
    }
    const orderItem = order.items.find(item => item.id === itemId && !item.fulfilled);
    if (!orderItem) {
      rejectTakeoutItem(order);
      return false;
    }
    orderItem.fulfilled = true;
    if (appliance) resetAppliance(appliance);
    if (passIndex != null) clearPassSlot(passIndex, false);
    teleportToTakeout(orderIndex);
    renderTakeoutOrder(order);
    Sound.sfx("drop");
    Sound.haptic(12);
    if (order.items.every(item => item.fulfilled)) completeTakeout(order);
    else toast(`${MenuCatalog[itemId].label} 포장 · ${order.items.filter(item => !item.fulfilled).length}개 남았어요.`);
    return true;
  }

  function scheduleGuest(index, delay) {
    if (index >= guestCapacityForLevel()) return;
    const timer = setTimeout(() => activateGuest(index), delay);
    State.guestTimers.push(timer);
  }

  function activateGuest(index) {
    const guest = Guests[index];
    if (!guest || index >= guestCapacityForLevel() || !State.running || guest.active) return;
    const customer = chooseCustomer();
    guest.customerId = customer.id;
    guest.active = true;
    guest.serving = false;
    guest.satisfaction = "waiting";
    guest.maxPatience = effectivePatienceMs();
    guest.patience = guest.maxPatience;
    assignOrder(guest);
    recordCustomerVisit(guest.customerId);
    State.guests += 1;
    renderHud();
    renderGuest(guest);
    const slot = $(`[data-guest="${index}"]`);
    slot.classList.add("arriving");
    setTimeout(() => slot.classList.remove("arriving"), 430);
    Sound.sfx("guest");
    burstAt(slot, "drop", 6);
    toast(`${index + 1}번 자리에 ${customer.name}님이 왔어요!`);
    Tutorial.handle("guest", { guest });
  }

  function dismissGuest(index) {
    const guest = Guests[index];
    guest.active = false;
    guest.serving = false;
    guest.order = null;
    guest.patience = 0;
    guest.satisfaction = "waiting";
    guest.customerId = null;
    renderGuest(guest);
    if (State.running && index < guestCapacityForLevel()) scheduleGuest(index, arrivalDelay(2800 + index * 450));
  }

  function expireGuest(guest) {
    if (!guest.active || guest.serving) return;
    guest.patience = 0;
    guest.serving = true;
    guest.satisfaction = "angry";
    State.missed += 1;
    recordCustomerMissed(guest.customerId);
    renderGuest(guest);
    Sound.sfx("wrong");
    Sound.haptic([20, 25, 35]);
    floatFeedback($(`[data-guest="${guest.index}"]`), "기다리다 떠나요", "warning");
    toast(`${guest.index + 1}번 손님이 기다리다 떠나요.`);
    const leaveTimer = setTimeout(() => dismissGuest(guest.index), 720);
    State.guestTimers.push(leaveTimer);
  }

  function tickGuests() {
    const now = performance.now();
    const elapsed = Math.min(250, Math.max(0, now - State.guestClock));
    State.guestClock = now;
    if (!State.running || State.paused || State.tutorialMode) return;
    Guests.forEach(guest => {
      if (!guest.active || guest.serving) return;
      guest.patience = Math.max(0, guest.patience - elapsed);
      if (guest.patience <= 0) expireGuest(guest);
      else renderPatience(guest);
    });
    TakeoutOrders.forEach(order => {
      if (!order.active || order.packed) return;
      order.patience = Math.max(0, order.patience - elapsed);
      if (order.patience <= 0) expireTakeout(order);
      else renderTakeoutOrder(order);
    });
  }

  function resetGuests() {
    clearGuestTimers();
    Guests.forEach(guest => {
      guest.active = false;
      guest.serving = false;
      guest.order = null;
      guest.patience = 0;
      guest.satisfaction = "waiting";
      guest.customerId = null;
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
    const levelOffset = guestCapacityForLevel() >= 4 ? 0 : Config.boreumi.idleOffset;
    boreumi.style.left = `${(laneWidth - Config.boreumi.idleWidth) / 2 + levelOffset}px`;
  }

  function setBoreumiIdle(delay = 0) {
    clearTimeout(State.boreumiTimer);
    const applyIdlePose = () => {
      const boreumi = $("#boreumi");
      boreumi.dataset.mode = "idle";
      boreumi.dataset.pose = "idle";
      setBoreumiIdlePosition();
      boreumi.classList.remove("teleport", "action");
    };
    if (delay <= 0) applyIdlePose();
    else State.boreumiTimer = setTimeout(applyIdlePose, delay);
  }

  function teleport(appliance, text) {
    const target = $(`[data-id="${appliance.id}"]`).getBoundingClientRect();
    const pose = appliance.type === "pot" ? (appliance.item === "egg" ? "egg" : "noodle") : appliance.type;
    animateBoreumi("cooking", pose, laneLeftFor(target, Config.boreumi.cookingWidth));
    State.boreumiTimer = setTimeout(() => setBoreumiIdle(), 920);
    burstAt($(`[data-id="${appliance.id}"]`), "drop", 5);
    say(text);
  }

  function teleportToGuest(guestIndex) {
    const target = $(`[data-guest="${guestIndex}"]`).getBoundingClientRect();
    animateBoreumi("serving", "serve", laneLeftFor(target, Config.boreumi.servingWidth));
    State.boreumiTimer = setTimeout(() => setBoreumiIdle(), 820);
  }

  function teleportToTakeout(orderIndex) {
    const target = $(`[data-takeout="${orderIndex}"]`).getBoundingClientRect();
    animateBoreumi("serving", "serve", laneLeftFor(target, Config.boreumi.servingWidth));
    State.boreumiTimer = setTimeout(() => setBoreumiIdle(), 820);
  }

  function teleportToPass() {
    const target = $("#completionPass").getBoundingClientRect();
    animateBoreumi("cooking", "grill", laneLeftFor(target, Config.boreumi.cookingWidth));
    State.boreumiTimer = setTimeout(() => setBoreumiIdle(), 720);
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
    appliance.cookRemaining = effectiveCookMs(recipe);
    appliance.burnRemaining = effectiveBurnMs(recipe);
    renderAppliance(appliance);
    Sound.sfx("cook");
    Sound.haptic(8);
    teleport(appliance, appliance.type === "pot" ? "조리 시작!" : appliance.type === "grill" ? "노릇하게 구울게!" : "따끈하게 데울게!");
    Tutorial.handle("cooking", { appliance });
  }

  function completeCooking(appliance) {
    if (appliance.state !== "cooking") return;
    appliance.state = "ready";
    appliance.cookRemaining = 0;
    appliance.burnRemaining = effectiveBurnMs(recipeFor(appliance));
    renderAppliance(appliance);
    Sound.sfx("complete");
    Sound.haptic([12, 24, 12]);
    burstAt($(`[data-id="${appliance.id}"]`), "complete", 10);
    floatFeedback($(`[data-id="${appliance.id}"]`), "완성!", "sale");
    toast(`${recipeFor(appliance).label} 완성!`);
    Tutorial.handle("ready", { appliance });
  }

  function burnFood(appliance) {
    if (appliance.state !== "ready") return;
    if (recipeFor(appliance)?.burns === false) return;
    appliance.state = "burnt";
    appliance.burnRemaining = 0;
    renderAppliance(appliance);
    Sound.sfx("burn");
    Sound.haptic([35, 28, 55]);
    burstAt($(`[data-id="${appliance.id}"]`), "burn", 9);
    floatFeedback($(`[data-id="${appliance.id}"]`), "타버렸어요!", "warning");
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
      } else if (appliance.state === "ready" && !State.tutorialMode && recipeFor(appliance)?.burns !== false) {
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
      Sound.sfx("drop");
      Sound.haptic(8);
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
    Sound.sfx("discard");
    Sound.haptic(10);
    burstAt($(`[data-id="${appliance.id}"]`), "drop", 5);
    say("깔끔하게 치울게!");
    toast(wasBurnt ? `${label}을(를) 버렸어요.` : `${label}을(를) 폐기했어요.`);
  }

  function storeFoodInPass(appliance, passIndex) {
    const slot = CompletionPassSlots[passIndex];
    if (passIndex >= completionPassCapacityForLevel()) return toast("아직 열리지 않은 완성대 칸이에요.");
    if (!slot || slot.recipeId) return toast("다른 빈 완성대 칸을 사용해 주세요.");
    if (appliance?.state !== "ready") return toast("완성된 음식만 완성대에 둘 수 있어요.");
    slot.recipeId = appliance.recipeId;
    resetAppliance(appliance);
    renderPassSlot(passIndex);
    teleportToPass();
    Sound.sfx("drop");
    Sound.haptic(10);
    burstAt($(`[data-pass-slot="${passIndex}"]`), "drop", 6);
    toast(`${MenuCatalog[slot.recipeId].label}을(를) 완성대에 보관했어요.`);
  }

  function discardPassSlot(passIndex) {
    const slot = CompletionPassSlots[passIndex];
    if (!slot?.recipeId) return toast("완성대가 비어 있어요.");
    const label = MenuCatalog[slot.recipeId].label;
    State.waste += 1;
    clearPassSlot(passIndex, false);
    Sound.sfx("discard");
    Sound.haptic(10);
    toast(`${label}을(를) 폐기했어요.`);
  }

  function rejectOrderItem(guest) {
    if (!State.tutorialMode) guest.patience = Math.max(0, guest.patience - Config.guests.wrongPenaltyMs);
    renderPatience(guest);
    const slot = $(`[data-guest="${guest.index}"]`);
    slot.classList.remove("wrong-order");
    void slot.offsetWidth;
    slot.classList.add("wrong-order");
    setTimeout(() => slot.classList.remove("wrong-order"), 430);
    Sound.sfx("wrong");
    Sound.haptic(22);
    if (!State.tutorialMode && guest.patience <= 0) expireGuest(guest);
    else toast(State.tutorialMode ? "연습 주문은 기본 라면과 소주예요." : "주문과 다른 메뉴예요. 인내심이 줄었어요.");
  }

  function satisfactionFor(guest) {
    const ratio = guest.maxPatience ? guest.patience / guest.maxPatience : 0;
    if (ratio >= .65) return "happy";
    if (ratio >= .3) return "okay";
    return "tired";
  }

  function completeOrder(guest) {
    if (State.tutorialMode) {
      guest.serving = true;
      guest.satisfaction = "happy";
      renderGuest(guest);
      say("연습 주문 완성!");
      const practiceSlot = $(`[data-guest="${guest.index}"]`);
      burstAt(practiceSlot, "serve", 10);
      floatFeedback(practiceSlot, "연습 완료", "sale");
      toast("잘했어요! 실제 영업 기록에는 영향을 주지 않아요.");
      return;
    }
    const price = guest.order.items.reduce((sum, item) => sum + menuPriceWithUpgrade(item.id), 0);
    guest.serving = true;
    guest.satisfaction = satisfactionFor(guest);
    State.sales += price;
    State.served += 1;
    State.ratings[guest.satisfaction] += 1;
    const storyMoment = recordCustomerStory(guest.customerId);
    renderGuest(guest);
    renderHud();
    say("맛있게 드세요!");
    const slot = $(`[data-guest="${guest.index}"]`);
    slot.animate([{ transform: "translateY(0)" }, { transform: "translateY(-8px)" }, { transform: "translateY(0)" }], { duration: 350 });
    floatFeedback(slot, `+${money(price)}`, "sale");
    const leaveTimer = setTimeout(() => dismissGuest(guest.index), 720);
    State.guestTimers.push(leaveTimer);
    toast(storyMoment?.text || `주문 완료 +${money(price)}`);
  }

  function deliverOrderItem(guestIndex, itemId, appliance = null) {
    const guest = Guests[guestIndex];
    if (!guest?.active) {
      toast("빈자리에는 서빙할 수 없어요.");
      return false;
    }
    if (guest.serving) {
      toast("지금 주문을 마무리하고 있어요.");
      return false;
    }
    const orderItem = guest.order?.items.find(item => item.id === itemId && !item.fulfilled);
    if (!orderItem) {
      rejectOrderItem(guest);
      return false;
    }

    orderItem.fulfilled = true;
    if (appliance) resetAppliance(appliance);
    teleportToGuest(guestIndex);
    renderGuest(guest);
    Sound.sfx("serve");
    Sound.haptic(16);
    burstAt($(`[data-guest="${guestIndex}"]`), "serve", 8);
    Tutorial.handle("served", { guest, itemId, kind: MenuCatalog[itemId]?.kind });
    const remaining = pendingItems(guest).length;
    if (remaining) {
      say(`${MenuCatalog[itemId].label} 먼저 드릴게요!`);
      toast(`${MenuCatalog[itemId].label} 전달 · ${remaining}개 남았어요.`);
    } else {
      completeOrder(guest);
    }
    return true;
  }

  function serve(appliance, guestIndex) {
    if (appliance.state !== "ready") return toast("완성된 음식만 서빙할 수 있어요.");
    deliverOrderItem(guestIndex, appliance.recipeId, appliance);
  }

  function serveDrink(drinkId, guestIndex) {
    if (MenuCatalog[drinkId]?.kind !== "drink") return toast("서빙할 수 없는 음료예요.");
    deliverOrderItem(guestIndex, drinkId);
  }

  function servePassFood(passIndex, guestIndex) {
    const slot = CompletionPassSlots[passIndex];
    if (!slot?.recipeId) return toast("완성대가 비어 있어요.");
    if (deliverOrderItem(guestIndex, slot.recipeId)) clearPassSlot(passIndex, false);
  }

  function satisfactionLabel() {
    const ratedOrders = State.ratings.happy + State.ratings.okay + State.ratings.tired;
    if (!ratedOrders) return "기록 없음";
    const score = (State.ratings.happy * 3 + State.ratings.okay * 2 + State.ratings.tired) / ratedOrders;
    if (score >= 2.5) return "최고예요";
    if (score >= 1.7) return "좋아요";
    return "조금 지쳤어요";
  }

  function stationEffectText(type, level = stationLevel(type)) {
    const upgrade = StationUpgradeCatalog[type];
    const speed = Math.round((1 - upgrade.speed[level - 1]) * 100);
    const burnSeconds = upgrade.burnBonus[level - 1] / 1000;
    const price = Math.round(upgrade.priceBonus[level - 1] * 100);
    const effects = [speed ? `조리 ${speed}% 단축` : "기본 조리 속도"];
    if (type === "oden") effects.push("완성 후 계속 보온");
    else if (burnSeconds) effects.push(`타기까지 +${burnSeconds}초`);
    if (price) effects.push(`음식값 +${price}%`);
    return effects.join(" · ");
  }

  function nextStallLevel() {
    return Math.min(StallUpgradeCatalog.maxLevel, Progress.stallLevel + 1);
  }

  function stationRequirementMet(level = nextStallLevel()) {
    return Object.values(Progress.stationLevels).every(station => station >= level);
  }

  function nextProgressionText() {
    const current = progressionMilestone(Progress.day, Progress.stallLevel);
    const next = ProgressionMilestones[ProgressionMilestones.indexOf(current) + 1];
    return next ? `${next.label}: 좌석 ${next.seats}석 · 손님 ${next.customers}명` : "최대 좌석 10석 · 손님 18명 해금 완료";
  }

  function renderUpgradeShop() {
    $("#shopGold").textContent = money(Progress.gold);
    const list = $("#upgradeList");
    const stationCards = Object.values(StationUpgradeCatalog).map(upgrade => {
      const level = stationLevel(upgrade.id);
      const maxLevel = 5;
      const cost = upgrade.costs[level - 1];
      const maxed = level >= 5;
      const disabled = maxed || Progress.gold < cost;
      const nextText = maxed ? "모든 강화 효과 적용 완료" : `다음: ${stationEffectText(upgrade.id, level + 1)}`;
      return `<article class="upgrade-card" data-upgrade-card="${upgrade.id}"><header><h4>${upgrade.title}</h4><span class="upgrade-level">LV.${level}/${maxLevel}</span></header><small>${upgrade.subtitle}</small><p><b>${stationEffectText(upgrade.id, level)}</b><br>${nextText}</p><button type="button" data-station-upgrade="${upgrade.id}" ${disabled ? "disabled" : ""}>${maxed ? "최대 강화" : `강화 · ${money(cost)}`}</button></article>`;
    }).join("");
    const stallLevel = Progress.stallLevel;
    const stallMaxed = stallLevel >= StallUpgradeCatalog.maxLevel;
    const targetLevel = nextStallLevel();
    const stallCost = StallUpgradeCatalog.costs[stallLevel - 1];
    const requirementMet = !stallMaxed && stationRequirementMet(targetLevel);
    const stallDisabled = stallMaxed || !requirementMet || Progress.gold < stallCost;
    const requirement = stallMaxed
      ? "모든 포차 확장 완료"
      : `조건: 냄비·그릴·오뎅바 모두 LV.${targetLevel}`;
    const benefit = stallMaxed ? StallUpgradeCatalog.benefits[5] : StallUpgradeCatalog.benefits[targetLevel];
    const stallCard = `<article class="upgrade-card stall-upgrade-card" data-upgrade-card="stall"><header><h4>포장마차 확장</h4><span class="upgrade-level">LV.${stallLevel}/5</span></header><small>${requirement}</small><p><b>${benefit}</b><br>${nextProgressionText()}</p><button type="button" data-stall-upgrade ${stallDisabled ? "disabled" : ""}>${stallMaxed ? "최대 확장" : !requirementMet ? "조리도구 레벨 부족" : `확장 · ${money(stallCost)}`}</button></article>`;
    list.innerHTML = stationCards + stallCard;
    list.querySelectorAll("[data-station-upgrade]").forEach(button => button.addEventListener("click", () => buyStationUpgrade(button.dataset.stationUpgrade)));
    list.querySelector("[data-stall-upgrade]")?.addEventListener("click", buyStallUpgrade);
  }

  function renderSettlement(settlement = State.lastSettlement) {
    if (!settlement) return;
    $("#settlementDay").textContent = String(settlement.completedDay);
    $("#settlementResult").textContent = settlement.levelUp ? `포차 LV.${settlement.newStallLevel} 확장!` : settlement.goalMet ? "목표 달성!" : "목표까지 조금 남았어요";
    $("#settlementResult").classList.toggle("failed", !settlement.goalMet);
    $("#settlementOverlay").classList.toggle("level-up", settlement.levelUp);
    $("#summaryGoal").textContent = money(settlement.goal);
    $("#summarySales").textContent = money(settlement.sales);
    $("#summaryServed").textContent = `${settlement.served}건 · 포장 ${settlement.takeoutServed}건`;
    $("#summaryMissed").textContent = `${settlement.missed}명 · 포장 ${settlement.takeoutMissed}건`;
    $("#summaryWaste").textContent = `${settlement.waste}개`;
    $("#summaryRating").textContent = settlement.rating;
    $("#rewardSales").textContent = `+${money(settlement.sales)}`;
    $("#rewardGoal").textContent = `+${money(settlement.goalBonus)}`;
    $("#rewardService").textContent = `+${money(settlement.serviceBonus)}`;
    $("#rewardTakeoutPenalty").textContent = `-${money(settlement.takeoutPenalty)}`;
    $("#rewardTotal").textContent = `+${money(settlement.totalReward)}`;
    $("#summaryStallLevel").textContent = String(effectiveStallLevel());
    const targetLevel = nextStallLevel();
    const minimumStationLevel = Math.min(...Object.values(Progress.stationLevels));
    const progress = Progress.stallLevel >= 5 ? 100 : Math.min(100, minimumStationLevel / targetLevel * 100);
    $("#growthFill").style.width = `${progress}%`;
    $("#growthText").textContent = settlement.levelUp
      ? StallUpgradeCatalog.benefits[settlement.newStallLevel]
      : settlement.storyMoments > 0
        ? `새 이야기 ${settlement.storyMoments}개 · ${nextProgressionText()}`
        : Progress.stallLevel >= 5
          ? "최대 포차 확장 완료 · DAY는 계속 이어져요"
          : `다음 포차 LV.${targetLevel}: 조리도구 모두 LV.${targetLevel} + ${money(StallUpgradeCatalog.costs[Progress.stallLevel - 1])}`;
    $("#nextDayButton").textContent = settlement.levelUp ? "확장된 포차에서 영업 시작" : "다음 날 영업 시작";
    renderUpgradeShop();
    $("#settlementOverlay").classList.remove("hidden");
    if (settlement.levelUp) {
      setTimeout(() => burstAt($("#settlementResult"), "complete", 18), 80);
      Sound.sfx("upgrade");
      Sound.haptic([18, 28, 18, 35, 45]);
    }
  }

  function buyStationUpgrade(type) {
    if (State.running || !StationUpgradeCatalog[type]) return;
    const level = stationLevel(type);
    const cost = StationUpgradeCatalog[type].costs[level - 1];
    if (cost == null) return toast("이미 최대 단계예요.");
    if (Progress.gold < cost) return toast("골드가 부족해요.");
    Progress.gold -= cost;
    Progress.stationLevels[type] += 1;
    saveProgress();
    renderHud();
    renderUpgradeShop();
    Sound.sfx("upgrade");
    Sound.haptic([10, 20, 10]);
    toast(`${StationUpgradeCatalog[type].title} LV.${Progress.stationLevels[type]} 강화!`);
  }

  function buyStallUpgrade() {
    if (State.running || Progress.stallLevel >= StallUpgradeCatalog.maxLevel) return;
    const targetLevel = Progress.stallLevel + 1;
    const cost = StallUpgradeCatalog.costs[Progress.stallLevel - 1];
    if (!stationRequirementMet(targetLevel)) return toast(`조리도구를 모두 LV.${targetLevel}로 강화해야 해요.`);
    if (Progress.gold < cost) return toast("포장마차 확장 골드가 부족해요.");
    Progress.gold -= cost;
    Progress.stallLevel = targetLevel;
    if (State.lastSettlement) {
      State.lastSettlement.levelUp = true;
      State.lastSettlement.newStallLevel = targetLevel;
    }
    saveProgress();
    applyStallLevel();
    renderHud();
    renderUpgradeShop();
    if (State.lastSettlement) renderSettlement(State.lastSettlement);
    Sound.sfx("upgrade");
    Sound.haptic([18, 28, 18, 35, 45]);
    burstAt($("#settlementResult"), "complete", 18);
    toast(`포장마차 LV.${targetLevel} 확장! ${StallUpgradeCatalog.benefits[targetLevel]}`);
  }

  function nextDay() {
    if (State.running) return;
    $("#settlementOverlay").classList.add("hidden");
    State.lastSettlement = null;
    State.goal = goalForDay();
    $("#startButton").disabled = false;
    $("#startButton").setAttribute("aria-label", "영업 시작");
    $("#startButton strong").textContent = "영업 시작";
    start();
  }

  let resetArmedUntil = 0;
  let resetArmTimer = null;

  function disarmResetButton() {
    resetArmedUntil = 0;
    clearTimeout(resetArmTimer);
    const button = $("#resetProgressButton");
    button.classList.remove("armed");
    button.textContent = "진행 초기화";
  }

  function resetProgress() {
    const now = Date.now();
    if (now > resetArmedUntil) {
      resetArmedUntil = now + 3500;
      const button = $("#resetProgressButton");
      button.classList.add("armed");
      button.textContent = "한 번 더 눌러 초기화";
      resetArmTimer = setTimeout(disarmResetButton, 3500);
      return;
    }
    Progress = freshProgress();
    saveProgress();
    Tutorial.completed = false;
    try { localStorage.removeItem(TutorialPreferenceKey); } catch { /* A fresh tutorial will still be available this session. */ }
    disarmResetButton();
    State.lastSettlement = null;
    State.goal = goalForDay();
    State.sales = 0;
    State.guests = 0;
    State.time = Config.daySeconds;
    State.dayStories = [];
    State.takeoutServed = 0;
    State.takeoutMissed = 0;
    State.takeoutPenalty = 0;
    State.takeoutSerial = 0;
    $("#settlementOverlay").classList.add("hidden");
    $("#startButton").disabled = false;
    $("#startButton").setAttribute("aria-label", "영업 시작");
    $("#startButton strong").textContent = "영업 시작";
    resetGuests();
    resetTakeoutOrders();
    resetCompletionPass();
    Appliances.forEach(resetAppliance);
    applyStallLevel();
    renderHud();
    toast("진행 상황을 처음부터 시작해요.");
    setTimeout(() => Tutorial.start(false), 420);
  }

  function settleDay() {
    const completedDay = Progress.day;
    const previousStallLevel = Progress.stallLevel;
    const goal = State.goal;
    const goalMet = State.sales >= goal;
    const goalBonus = goalMet ? goalBonusForDay(completedDay) : 0;
    const serviceBonus = State.ratings.happy * 400 + State.ratings.okay * 200;
    const totalReward = Math.max(0, State.sales + goalBonus + serviceBonus - State.takeoutPenalty);
    const settlement = {
      completedDay,
      goal,
      goalMet,
      sales: State.sales,
      served: State.served,
      missed: State.missed,
      takeoutServed: State.takeoutServed,
      takeoutMissed: State.takeoutMissed,
      takeoutPenalty: State.takeoutPenalty,
      waste: State.waste,
      rating: satisfactionLabel(),
      goalBonus,
      serviceBonus,
      totalReward,
      previousStallLevel,
      newStallLevel: previousStallLevel,
      levelUp: false,
      storyMoments: State.dayStories.length
    };
    Progress.gold += totalReward;
    Progress.day += 1;
    Progress.stats.completedDays += 1;
    Progress.stats.successfulDays += goalMet ? 1 : 0;
    Progress.stats.totalSales += State.sales;
    Progress.stats.totalServed += State.served;
    Progress.stats.totalMissed += State.missed;
    Progress.stats.totalWaste += State.waste;
    Progress.stats.totalTakeoutServed += State.takeoutServed;
    Progress.stats.totalTakeoutMissed += State.takeoutMissed;
    settlement.newStallLevel = Progress.stallLevel;
    settlement.levelUp = false;
    saveProgress();
    applyStallLevel();
    return settlement;
  }

  function finishDay() {
    if (!State.running) return;
    State.running = false;
    State.paused = false;
    clearInterval(State.dayTimer);
    clearGuestTimers();
    clearTakeoutTimers();
    Sound.stopBgm();
    Sound.sfx("finish");
    setBoreumiIdle();
    $(".hud").classList.remove("running");
    $("#startButton").style.removeProperty("display");
    $("#startButton").disabled = true;
    $("#startButton").setAttribute("aria-label", "영업 정산");
    $("#startButton strong").textContent = "정산중";
    State.lastSettlement = settleDay();
    renderHud();
    renderSettlement();
    toast(`영업 종료 · ${money(State.lastSettlement.totalReward)} 획득`);
  }

  function start() {
    if (State.running || !$("#settlementOverlay").classList.contains("hidden")) return;
    clearInterval(State.dayTimer);
    setBoreumiIdle();
    resetGuests();
    resetTakeoutOrders();
    resetCompletionPass();
    Appliances.forEach(resetAppliance);
    State.running = true;
    State.paused = false;
    State.time = Config.daySeconds;
    State.goal = goalForDay();
    State.sales = 0;
    State.guests = 0;
    State.waste = 0;
    State.served = 0;
    State.missed = 0;
    State.takeoutServed = 0;
    State.takeoutMissed = 0;
    State.takeoutPenalty = 0;
    State.takeoutSerial = 0;
    State.ratings = { happy: 0, okay: 0, tired: 0 };
    State.dayStories = [];
    State.cookingClock = performance.now();
    State.guestClock = performance.now();
    Sound.ensure();
    Sound.startBgm();
    $(".hud").classList.add("running");
    $("#startButton").style.removeProperty("display");
    $("#startButton").disabled = true;
    $("#startButton").setAttribute("aria-label", "영업중");
    $("#startButton strong").textContent = "영업중";
    renderHud();
    Config.firstArrivals.slice(0, guestCapacityForLevel()).forEach((delay, index) => scheduleGuest(index, arrivalDelay(delay)));
    Config.takeout.firstArrivals.slice(0, takeoutCapacityForLevel()).forEach((delay, index) => scheduleTakeout(index, delay));
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
    Tutorial.handle("started");
  }

  function payload(element) {
    if (element.matches(".ingredient")) {
      const image = element.querySelector("img");
      return { kind: element.dataset.kind === "drink" ? "drink" : "item", item: element.dataset.item, image: image?.src || "" };
    }
    if (element.matches(".pass-slot")) {
      const passIndex = Number(element.dataset.passSlot);
      const slot = CompletionPassSlots[passIndex];
      if (slot?.recipeId) return { kind: "pass-food", passIndex, recipeId: slot.recipeId, image: assetUrl(MenuCatalog[slot.recipeId].art) };
      return null;
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
    const logicalPoint = window.BoreumiPWA?.toLogicalPoint?.(point) || point;
    const ghost = $("#dragGhost");
    ghost.style.left = logicalPoint.x + "px";
    ghost.style.top = (logicalPoint.y - (event.pointerType === "touch" ? 48 : 18)) + "px";
  }

  function clearOver() {
    $$(".drop-over").forEach(element => element.classList.remove("drop-over"));
  }

  function showGhost(data) {
    const ghost = $("#dragGhost");
    ghost.querySelector("img").src = data.image;
    ghost.querySelector("span").textContent = "";
    ghost.classList.toggle("food-drag", ["food", "pass-food"].includes(data.kind));
    ghost.classList.add("show");
    $("#stage").dataset.dragKind = data.kind;
  }

  function hideGhost() {
    const ghost = $("#dragGhost");
    ghost.classList.remove("show", "food-drag");
    ghost.querySelector("img").removeAttribute("src");
    delete $("#stage").dataset.dragKind;
  }

  function startDrag(event, element) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const data = payload(element);
    if (!data) return;
    event.preventDefault();
    try { element.setPointerCapture?.(event.pointerId); } catch { /* Synthetic QA pointers are not browser-active pointers. */ }
    const point = pointer(event);
    const showImmediately = ["item", "drink"].includes(data.kind);
    State.drag = {
      pointer: event.pointerId,
      data,
      startX: point.x,
      startY: point.y,
      moved: false,
      ghostShown: showImmediately
    };
    if (showImmediately) {
      showGhost(data);
      moveGhost(event);
    }
  }

  function moveDrag(event) {
    if (State.drag?.pointer !== event.pointerId) return;
    event.preventDefault();
    const point = pointer(event);
    if (!State.drag.moved) {
      State.drag.moved = Math.hypot(point.x - State.drag.startX, point.y - State.drag.startY) >= 10;
      if (!State.drag.moved) return;
      if (State.drag.data.kind === "waste") return;
      if (!State.drag.ghostShown) {
        State.drag.ghostShown = true;
        showGhost(State.drag.data);
      }
    }
    moveGhost(event);
    clearOver();
    const target = targetAt(event);
    if (State.drag.data.kind === "item") target?.closest(".appliance")?.classList.add("drop-over");
    else if (State.drag.data.kind === "drink") {
      target?.closest(".guest-slot.active")?.classList.add("drop-over");
      target?.closest(".takeout-order.active")?.classList.add("drop-over");
    } else if (["food", "pass-food"].includes(State.drag.data.kind)) {
      target?.closest(".guest-slot.active")?.classList.add("drop-over");
      target?.closest(".takeout-order.active")?.classList.add("drop-over");
      if (State.drag.data.kind === "food") target?.closest(".pass-slot.empty")?.classList.add("drop-over");
    }
  }

  function endDrag(event) {
    if (State.drag?.pointer !== event.pointerId) return;
    event.preventDefault();
    const target = targetAt(event);
    const data = State.drag.data;
    const wasTap = !State.drag.moved;

    if (["food", "waste"].includes(data.kind) && wasTap) {
      discardAppliance(Appliances.find(item => item.id === data.id));
    } else if (data.kind === "item") {
      const applianceElement = target?.closest(".appliance");
      if (applianceElement) dropItem(Appliances.find(item => item.id === applianceElement.dataset.id), data.item);
      else toast("재료를 조리기구에 놓아주세요.");
    } else if (data.kind === "drink") {
      const guestSlot = target?.closest(".guest-slot.active");
      const takeoutOrder = target?.closest(".takeout-order.active");
      if (guestSlot) serveDrink(data.item, Number(guestSlot.dataset.guest));
      else if (takeoutOrder) deliverTakeoutItem(Number(takeoutOrder.dataset.takeout), data.item);
      else toast("주류를 손님이나 포장 주문표에 놓아주세요.");
    } else if (data.kind === "food") {
      const guestSlot = target?.closest(".guest-slot.active");
      const takeoutOrder = target?.closest(".takeout-order.active");
      const passSlot = target?.closest(".pass-slot.empty");
      const appliance = Appliances.find(item => item.id === data.id);
      if (passSlot) storeFoodInPass(appliance, Number(passSlot.dataset.passSlot));
      else if (guestSlot) serve(appliance, Number(guestSlot.dataset.guest));
      else if (takeoutOrder) deliverTakeoutItem(Number(takeoutOrder.dataset.takeout), data.recipeId, appliance);
      else toast(completionPassCapacityForLevel() ? "완성 음식을 손님, 포장 주문표 또는 완성대에 놓아주세요." : "완성 음식을 손님이나 포장 주문표에 놓아주세요.");
    } else if (data.kind === "pass-food") {
      const guestSlot = target?.closest(".guest-slot.active");
      const takeoutOrder = target?.closest(".takeout-order.active");
      if (wasTap) discardPassSlot(data.passIndex);
      else if (guestSlot) servePassFood(data.passIndex, Number(guestSlot.dataset.guest));
      else if (takeoutOrder) deliverTakeoutItem(Number(takeoutOrder.dataset.takeout), data.recipeId, null, data.passIndex);
      else toast("완성대 음식을 손님이나 포장 주문표에 놓아주세요.");
    } else if (data.kind === "waste") {
      toast("탄 음식은 짧게 눌러 바로 버릴 수 있어요.");
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

  function openHelp() {
    Tutorial.close(false);
    State.helpPausedGame = State.running && !State.paused;
    if (State.helpPausedGame) {
      State.paused = true;
      Sound.stopBgm();
      $("#stage").classList.add("paused-fx");
    }
    $("#helpOverlay").classList.remove("hidden");
    Sound.sfx("drop");
  }

  function closeHelp(resumeGame = true) {
    $("#helpOverlay").classList.add("hidden");
    if (resumeGame && State.helpPausedGame) {
      State.paused = false;
      State.helpPausedGame = false;
      $("#stage").classList.remove("paused-fx");
      Sound.startBgm();
    }
  }

  async function browserQA() {
    const qaParams = new URLSearchParams(location.search);
    if (!qaParams.has("qa")) return;
    if (window.BoreumiBoot?.readyPromise) await window.BoreumiBoot.readyPromise;
    await Promise.all($$(".dock img").map(image => image.complete
      ? Promise.resolve()
      : image.decode().catch(() => undefined)));
    const dockFrameImage = new Image();
    const dockSlotImage = new Image();
    dockFrameImage.src = "assets/art-v012/dock-rack-frame-v1.png";
    dockSlotImage.src = "assets/art-v012/dock-slot-v1.png";
    await Promise.all([dockFrameImage.decode().catch(() => undefined), dockSlotImage.decode().catch(() => undefined)]);
    const result = {};
    let pwaManifest = null;
    let pwaCssSource = "";
    let experienceCssSource = "";
    let bootSource = "";
    let serviceWorkerSource = "";
    try {
      const [manifestResponse, cssResponse, experienceResponse, bootResponse, workerResponse] = await Promise.all([
        fetch("app.webmanifest", { cache: "no-store" }),
        fetch("pwa-v022.css", { cache: "no-store" }),
        fetch("experience-v022.css", { cache: "no-store" }),
        fetch("boot-v022.js", { cache: "no-store" }),
        fetch("service-worker.js", { cache: "no-store" })
      ]);
      pwaManifest = await manifestResponse.json();
      pwaCssSource = await cssResponse.text();
      experienceCssSource = await experienceResponse.text();
      bootSource = await bootResponse.text();
      serviceWorkerSource = await workerResponse.text();
    } catch {
      // Individual checks below report the unavailable PWA resource.
    }
    const serviceWorkerRegistration = "serviceWorker" in navigator
      ? await Promise.race([navigator.serviceWorker.ready, new Promise(resolve => setTimeout(() => resolve(null), 5000))])
      : null;
    result.pwaManifestPresent = pwaManifest?.name === "보름이의 라면포차"
      && pwaManifest?.start_url?.includes("index.html")
      && pwaManifest?.icons?.some(icon => icon.sizes === "512x512");
    result.landscapeOnlyPwa = pwaManifest?.orientation === "landscape"
      && ["fullscreen", "standalone"].includes(pwaManifest?.display)
      && window.BoreumiPWA?.landscapeRequested === true;
    result.noRotateInstruction = !$(".rotate") && !document.body.textContent.includes("가로 모드로 돌려주세요");
    result.iosStandaloneMetadata = $('meta[name="apple-mobile-web-app-capable"]')?.content === "yes"
      && !!$('link[rel="apple-touch-icon"]')
      && $('meta[name="apple-mobile-web-app-status-bar-style"]')?.content === "black-translucent";
    result.pwaSafeAreaReady = pwaCssSource.includes("safe-area-inset-left")
      && pwaCssSource.includes("safe-area-inset-right")
      && pwaCssSource.includes("100dvh");
    result.portraitLandscapeFallbackReady = pwaCssSource.includes('data-force-landscape="true"')
      && pwaCssSource.includes("rotate(90deg)")
      && typeof window.BoreumiPWA?.toLogicalPoint === "function";
    result.loadingScreenPresent = !!$("#bootLoading")
      && !!$("#bootProgress")
      && bootSource.includes("criticalAssets")
      && experienceCssSource.includes("data-boot=\"ready\"");
    result.loadingCompletesBeforeGame = document.documentElement.dataset.boot === "ready"
      && window.BoreumiBoot?.state.complete === true
      && window.BoreumiBoot?.state.resourcesLoaded === window.BoreumiBoot?.state.resourcesTotal;
    result.serviceWorkerRegistered = !!serviceWorkerRegistration && window.BoreumiPWA?.serviceWorkerRegistered === true;
    result.offlineGameCacheReady = serviceWorkerSource.includes("CACHE_GAME")
      && serviceWorkerSource.includes("GAME_ASSETS")
      && serviceWorkerSource.includes("request.mode === \"navigate\"");
    result.ambienceLayerPresent = !!$("#atmosphereLayer") && $("#atmosphereLayer").children.length === 3;
    result.fxLayerPresent = !!$("#fxLayer");
    result.soundControlPresent = $("#soundButton")?.getAttribute("aria-pressed") === String(Sound.enabled);
    const soundBeforeToggle = Sound.enabled;
    Sound.setEnabled(!soundBeforeToggle);
    result.soundControlToggles = Sound.enabled !== soundBeforeToggle
      && $("#soundButton").getAttribute("aria-pressed") === String(!soundBeforeToggle);
    Sound.setEnabled(soundBeforeToggle);
    result.stationEffectsPresent = $$(".appliance .cook-fx").length === Appliances.length;
    burstAt($(`[data-id="${Appliances[0].id}"]`), "complete", 4);
    result.feedbackParticlesRender = $$("#fxLayer .fx-particle").length === 4;
    result.tutorialControlsPresent = !!$("#helpButton") && !!$("#tutorialCoach") && !!$("#helpOverlay");
    result.legacySaveMigrationReady = LegacySaveKeys.includes("boreumi-ramen-v021") && SaveKey.includes("v022");
    Tutorial.start();
    result.tutorialWelcomeVisible = !$("#tutorialCoach").classList.contains("hidden")
      && $("#tutorialTitle").textContent.includes("어서 오세요");
    const tutorialTimeBeforeQA = State.time;
    await new Promise(resolve => setTimeout(resolve, 120));
    result.tutorialIsolatedStage = State.tutorialMode
      && State.running
      && $("#stage").dataset.tutorial === "true"
      && !$("#tutorialStageBadge").hidden
      && State.time === tutorialTimeBeforeQA;
    result.tutorialFixedOrder = Tutorial.activeGuest()?.order?.items.map(item => item.id).join("+") === "ramen_plain+soju"
      && Tutorial.activeGuest()?.patience === Tutorial.activeGuest()?.maxPatience;
    Tutorial.setStep("addNoodle");
    await new Promise(resolve => setTimeout(resolve, 50));
    result.tutorialPathVisible = !$("#tutorialPath").classList.contains("hidden");
    result.tutorialNoodleHighlighted = $('.ingredient[data-item="noodle"]').classList.contains("tutorial-focus");
    result.tutorialPotHighlighted = $$('.appliance.pot').some(element => element.classList.contains("tutorial-focus"));
    Tutorial.close(false);
    openHelp();
    result.helpOverlayOpens = !$("#helpOverlay").classList.contains("hidden");
    result.helpGuideCards = $$("#helpOverlay .help-grid article").length === 5;
    closeHelp(true);
    Tutorial.active = true;
    Tutorial.complete();
    result.tutorialCompletionStored = Tutorial.completed
      && Tutorial.step === "done"
      && localStorage.getItem(TutorialPreferenceKey) === "done";
    Tutorial.close(false);
    Tutorial.completed = false;
    localStorage.removeItem(TutorialPreferenceKey);
    const qaPointerDrag = (source, target, pointerId) => {
      const sourceRect = source.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const sourcePoint = { clientX: sourceRect.left + sourceRect.width / 2, clientY: sourceRect.top + sourceRect.height / 2 };
      const targetPoint = { clientX: targetRect.left + targetRect.width / 2, clientY: targetRect.top + targetRect.height / 2 };
      source.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerId, pointerType: "mouse", button: 0, buttons: 1, ...sourcePoint }));
      document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, cancelable: true, pointerId, pointerType: "mouse", button: 0, buttons: 1, ...targetPoint }));
      document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, pointerId, pointerType: "mouse", button: 0, buttons: 0, ...targetPoint }));
    };
    const qaPointerTap = (target, pointerId) => {
      const rect = target.getBoundingClientRect();
      const point = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
      target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerId, pointerType: "mouse", button: 0, buttons: 1, ...point }));
      document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true, pointerId, pointerType: "mouse", button: 0, buttons: 0, ...point }));
    };
    const tutorialProgressBeforeQA = JSON.stringify(Progress);
    Tutorial.start();
    Tutorial.advance();
    Tutorial.advance();
    const tutorialPotQA = Appliances.find(appliance => appliance.type === "pot" && appliance.state === "empty");
    const tutorialGuestQA = Tutorial.activeGuest();
    dropItem(tutorialPotQA, "noodle");
    tutorialPotQA.cookRemaining = 0;
    completeCooking(tutorialPotQA);
    serve(tutorialPotQA, 0);
    serveDrink("soju", 0);
    result.tutorialPracticeFlowCompletes = Tutorial.step === "done"
      && tutorialGuestQA?.satisfaction === "happy"
      && State.sales === 0
      && State.served === 0
      && JSON.stringify(Progress) === tutorialProgressBeforeQA;
    Tutorial.close(false);
    Tutorial.completed = false;
    localStorage.removeItem(TutorialPreferenceKey);
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
    const stationRects = $$(".appliance:not([hidden]) .kitchen-sprite").map(sprite => sprite.getBoundingClientRect());
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
    result.emptySeatsBeforeStart = $$(".guest-slot:not([hidden]):not(.active)").length === guestCapacityForLevel()
      && $$(".guest-slot:not([hidden]) .guest-seat").length === guestCapacityForLevel();
    result.level1StationStart = $$(".appliance:not([hidden])").length === 4
      && $$(".appliance.pot:not([hidden])").length === 2
      && $$(".appliance.grill:not([hidden])").length === 1
      && $$(".appliance.oden:not([hidden])").length === 1;
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
    const qaFirstCustomerId = Guests[0].customerId;
    result.arrivalState = $$(".guest-slot:not([hidden]).active").length === 1
      && $$(".guest-slot:not([hidden]):not(.active)").length === guestCapacityForLevel() - 1;
    result.randomCustomerPool = CustomerCatalog.length === 18
      && unlockedCustomers().length === 3
      && CustomerCatalog.every(customer => customer.id && customer.name && customer.art.endsWith(".png"))
      && CustomerById[qaFirstCustomerId]?.name === $(`[data-guest="0"] .guest-art`).getAttribute("aria-label");
    result.combinationOrderAssigned = Guests[0].order?.items.length === 2
      && MenuCatalog[Guests[0].order.items[0].id].kind === "food"
      && MenuCatalog[Guests[0].order.items[1].id].kind === "drink"
      && $$(`[data-guest="0"] .order-item`).length === 2
      && $$(`[data-guest="0"] .order-plus`).length === 1;
    const sampledRandomOrders = new Set();
    for (let sample = 0; sample < 128; sample += 1) {
      const sampleGuest = { order: null };
      assignOrder(sampleGuest);
      sampledRandomOrders.add(sampleGuest.order.id);
    }
    result.unweightedRandomOrders = FoodOrderPool.length === 4
      && DrinkOrderPool.length === 4
      && sampledRandomOrders.size === FoodOrderPool.length * DrinkOrderPool.length;
    Guests[0].order = createOrder("ramen_plain", "soju");
    renderGuest(Guests[0]);
    result.menuCatalogIncludesDrinks = ["soju", "beer", "somaek", "makgeolli"].every(id => MenuCatalog[id]?.kind === "drink" && MenuCatalog[id].price > 0);
    result.drinksAreDraggable = $$(".drink-rack .drink-item").every(item => item.matches("button.ingredient") && payload(item)?.kind === "drink");
    result.patienceStartsFull = Guests[0].patience === Guests[0].maxPatience
      && parseFloat($(`[data-guest="0"] .patience i`).style.width) === 100;
    const activeBubbleRect = $(`[data-guest="0"] .bubble`).getBoundingClientRect();
    const activePatienceRect = $(`[data-guest="0"] .patience`).getBoundingClientRect();
    result.patienceBelowOrderBubble = activePatienceRect.top >= activeBubbleRect.bottom - 1
      && activePatienceRect.top - activeBubbleRect.bottom <= 10 * buttonStageScale
      && activePatienceRect.width >= 155 * buttonStageScale
      && getComputedStyle($(`[data-guest="0"] .patience`)).visibility === "visible"
      && parseInt(getComputedStyle($(`[data-guest="0"] .patience`)).zIndex, 10) > parseInt(getComputedStyle($(`[data-guest="0"] .bubble`)).zIndex, 10);
    result.relaxedGameTiming = Config.guests.patienceMs === 40000
      && Config.cooking.defaultBurnMs === 10000
      && Config.guests.patienceMs > RecipeCatalog.ramen_plain.cookMs * 8
      && Config.cooking.defaultBurnMs > RecipeCatalog.ramen_plain.cookMs * 2;
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
    await Promise.all(Object.keys(ingredientArtV4).map(item => {
      const image = $(`[data-item="${item}"] img`);
      return image?.complete ? Promise.resolve() : image?.decode().catch(() => undefined);
    }));
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
    result.odenEmptyPadding = odenSprite.left > odenArt.left + 5 * buttonStageScale && odenSprite.right < odenArt.right - 5 * buttonStageScale;
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
      && [RecipeCatalog.ramen_plain, RecipeCatalog.ramen_egg, RecipeCatalog.grilled_dumpling].every(recipe => recipe.cookMs > 0 && recipe.burns && recipe.burnMs === Config.cooking.defaultBurnMs)
      && RecipeCatalog.warm_oden.cookMs > 0 && !RecipeCatalog.warm_oden.burns && RecipeCatalog.warm_oden.burnMs === 0
      && RecipeCatalog.ramen_plain.ingredients.join("|") === "noodle"
      && RecipeCatalog.ramen_egg.ingredients.join("|") === "noodle|egg";
    dropItem(Appliances[2], "dumpling");
    result.invalidApplianceRejected = Appliances[2].state === "empty" && Appliances[2].ingredients.length === 0;
    dropItem(Appliances[2], "egg");
    result.addonRequiresBase = Appliances[2].state === "empty" && Appliances[2].ingredients.length === 0;
    qaPointerDrag($("[data-item='noodle']"), $(`[data-id="${Appliances[1].id}"]`), 901);
    result.pointerIngredientDrag = Appliances[1].state === "cooking"
      && Appliances[1].recipeId === "ramen_plain"
      && !$("#dragGhost").classList.contains("show");
    resetAppliance(Appliances[1]);

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
    const patienceBeforePause = Guests[0].patience;
    $("#pauseButton").click();
    await new Promise(resolve => setTimeout(resolve, 180));
    result.cookingPauses = State.paused
      && Math.abs(Appliances[0].cookRemaining - remainingBeforeCookingPause) < 1;
    result.patiencePauses = State.paused
      && Math.abs(Guests[0].patience - patienceBeforePause) < 1;
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
    result.odenStaysInBar = !!$(".sprite-oden-warm")
      && getComputedStyle($(".sprite-oden-warm")).backgroundImage.includes("cooking-oden-v2.png")
      && !$(".sprite-oden-food");
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
    const patienceBeforeWrongOrder = Guests[0].patience;
    serve(Appliances[3], 0);
    result.wrongOrderRejected = Appliances[3].state === "ready"
      && Guests[0].active
      && State.sales === salesBeforeWrongOrder
      && Guests[0].patience <= patienceBeforeWrongOrder - Config.guests.wrongPenaltyMs;
    result.wrongOrderPenaltyVisible = $(`[data-guest="0"]`).classList.contains("wrong-order")
      && parseFloat($(`[data-guest="0"] .patience i`).style.width) < 100;
    const wasteBeforeReadyTap = State.waste;
    qaPointerTap($(`[data-id="${Appliances[3].id}"]`), 904);
    result.readyTapDiscards = Appliances[3].state === "empty"
      && State.waste === wasteBeforeReadyTap + 1
      && !$("#dragGhost").classList.contains("show");

    Appliances[5].burnRemaining = 0;
    burnFood(Appliances[5]);
    await new Promise(resolve => setTimeout(resolve, 160));
    result.odenNeverBurns = Appliances[5].state === "ready"
      && payload($(`[data-id="${Appliances[5].id}"]`))?.kind === "food"
      && $(`[data-id="${Appliances[5].id}"]`).classList.contains("keeps-warm");

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
    result.dragDiscardRemoved = !$("#discardBin") && !document.querySelector(".discard-bin");
    const wasteBeforeDiscard = State.waste;
    qaPointerTap($(`[data-id="${Appliances[1].id}"]`), 905);
    result.burntTapDiscards = Appliances[1].state === "empty" && !$("#dragGhost").classList.contains("show");
    result.discardResetsStation = Appliances[1].state === "empty"
      && Appliances[1].recipeId === null
      && Appliances[1].ingredients.length === 0
      && State.waste === wasteBeforeDiscard + 1;
    if (qaParams.has("holdReady")) await new Promise(resolve => setTimeout(resolve, 1400));
    qaPointerDrag($(`[data-id="${Appliances[0].id}"]`), $(`[data-guest="0"] .guest-art`), 903);
    result.foodPointerDrag = Appliances[0].state === "empty" && !Guests[0].serving && !$("#dragGhost").classList.contains("show");
    result.partialOrderStays = Guests[0].active
      && !Guests[0].serving
      && Guests[0].order.items.find(item => item.id === "ramen_plain")?.fulfilled
      && !Guests[0].order.items.find(item => item.id === "soju")?.fulfilled
      && $(`[data-guest="0"] [data-order-item="ramen_plain"]`).classList.contains("fulfilled");
    result.serveBackPose = $("#boreumi").dataset.mode === "serving" && $("#boreumi").dataset.pose === "serve";
    const serveRect = $("#boreumi").getBoundingClientRect();
    const guestRowRect = $("#guestRow").getBoundingClientRect();
    const stageScale = $("#stage").getBoundingClientRect().width / Config.stage.currentWidth;
    const serveClearance = (serveRect.bottom - guestRowRect.bottom) / stageScale;
    result.serveOnFloor = parseFloat(getComputedStyle($("#boreumi")).height) >= 290 && serveClearance > 90;
    const sojuButton = $(`.drink-item[data-item="soju"]`);
    const sojuPayload = payload(sojuButton);
    showGhost(sojuPayload);
    result.drinkGhostIllustration = $("#dragGhost").classList.contains("show")
      && $("#dragGhost img").src === sojuPayload.image
      && !$("#dragGhost span").textContent;
    State.drag = null;
    hideGhost();
    qaPointerDrag(sojuButton, $(`[data-guest="0"] .bubble`), 906);
    result.drinkPointerServe = Guests[0].serving
      && Guests[0].order.items.every(item => item.fulfilled)
      && State.sales === MenuCatalog.ramen_plain.price + MenuCatalog.soju.price
      && State.served === 1;
    result.storyStartsAndPersists = Progress.regulars[qaFirstCustomerId].visits === 1
      && Progress.regulars[qaFirstCustomerId].served === 1
      && Progress.regulars[qaFirstCustomerId].chapters === 1
      && Progress.storyLog.at(-1)?.customerId === qaFirstCustomerId
      && Progress.storyLog.at(-1)?.day === 1;
    result.satisfactionAssigned = ["happy", "okay", "tired"].includes(Guests[0].satisfaction)
      && $(`[data-guest="0"]`).classList.contains("satisfied")
      && getComputedStyle($(`[data-guest="0"] .satisfaction`)).display === "grid";
    await new Promise(resolve => setTimeout(resolve, 850));
    result.guestLeavesAfterServe = !Guests[0].active && !$(`[data-guest="0"]`).classList.contains("active");
    result.returnsToIdle = $("#boreumi").dataset.mode === "idle" && $("#boreumi").dataset.pose === "idle";

    if (!Guests[1].active) activateGuest(1);
    if (!Guests[2].active) activateGuest(2);
    const currentCustomerIds = Guests.filter(guest => guest.active).map(guest => guest.customerId);
    result.noDuplicateSeatedCustomers = currentCustomerIds.length === new Set(currentCustomerIds).size;
    const waitingGuestPatience = Guests[2].patience;
    const missedBeforeTimeout = State.missed;
    const timedOutCustomerId = Guests[1].customerId;
    Guests[1].patience = 60;
    renderPatience(Guests[1]);
    await new Promise(resolve => setTimeout(resolve, 180));
    result.unservedGuestTimesOut = Guests[1].active
      && Guests[1].serving
      && Guests[1].satisfaction === "angry"
      && State.missed === missedBeforeTimeout + 1
      && Progress.regulars[timedOutCustomerId].missed === 1
      && $(`[data-guest="1"]`).classList.contains("angry");
    result.guestTimersIndependent = Guests[2].active
      && !Guests[2].serving
      && Guests[2].patience < waitingGuestPatience;
    await new Promise(resolve => setTimeout(resolve, 760));
    result.timedOutGuestLeavesWithoutSale = !Guests[1].active
      && State.sales === MenuCatalog.ramen_plain.price + MenuCatalog.soju.price;

    const stage = $("#stage").getBoundingClientRect();
    const dock = $(".dock").getBoundingClientRect();
    const left = $("#cookLeft").getBoundingClientRect();
    const right = $("#cookRight").getBoundingClientRect();
    result.landscape = stage.width > stage.height;
    result.noDockOverlap = dock.top >= Math.max(left.bottom, right.bottom) - 2;
    result.adaptive1080Stage = Config.stage.currentWidth >= Config.stage.safeWidth
      && Config.stage.currentWidth <= Config.stage.maxWidth
      && parseFloat(getComputedStyle($("#stage")).height) === Config.stage.height;
    result.futureExpansionReserved = Config.layout.futureGuestCapacity >= 10
      && Config.layout.reservedStations.includes("takeout")
      && Config.layout.reservedStations.includes("service-pass");

    result.managementProgressDefaults = Progress.day === 1
      && Progress.gold === 0
      && Progress.stallLevel === 1
      && Object.values(Progress.stationLevels).every(level => level === 1)
      && $("#dayNumber").textContent === "1"
      && $("#goalAmount").textContent === money(goalForDay(1));
    const walletRect = $("#walletBadge").getBoundingClientRect();
    result.walletBadgeReadable = walletRect.top >= hudRect.bottom - 2
      && walletRect.right <= stage.right
      && $("#walletGold").textContent === "0원"
      && $("#stallLevel").textContent === String(effectiveStallLevel());
    result.managementUpgradeCatalog = Object.keys(StationUpgradeCatalog).join("|") === "pot|grill|oden"
      && Object.values(StationUpgradeCatalog).every(upgrade => upgrade.costs.length === 4
        && upgrade.costs.every((cost, index) => cost > 0 && (!index || cost > upgrade.costs[index - 1])))
      && StallUpgradeCatalog.costs.length === 4
      && StallUpgradeCatalog.costs.every((cost, index) => !index || cost > StallUpgradeCatalog.costs[index - 1]);

    State.sales = State.goal + 500;
    State.served = 3;
    State.missed = 1;
    State.takeoutServed = 0;
    State.takeoutMissed = 0;
    State.takeoutPenalty = 0;
    State.waste = 2;
    State.ratings = { happy: 2, okay: 1, tired: 0 };
    const expectedGoalBonus = goalBonusForDay(Progress.day);
    const expectedServiceBonus = State.ratings.happy * 400 + State.ratings.okay * 200;
    const expectedReward = State.sales + expectedGoalBonus + expectedServiceBonus;
    finishDay();
    const managementPanelRect = $(".management-panel").getBoundingClientRect();
    result.settlementOverlayAppears = !$("#settlementOverlay").classList.contains("hidden")
      && !State.running
      && State.lastSettlement?.completedDay === 1
      && State.lastSettlement.goalMet
      && $("#settlementResult").textContent === "목표 달성!";
    result.settlementSummaryAccurate = $("#summaryGoal").textContent === money(State.lastSettlement.goal)
      && $("#summarySales").textContent === money(State.lastSettlement.sales)
      && $("#summaryServed").textContent === "3건 · 포장 0건"
      && $("#summaryMissed").textContent === "1명 · 포장 0건"
      && $("#summaryWaste").textContent === "2개"
      && $("#summaryRating").textContent === "최고예요";
    result.rewardBreakdownAccurate = State.lastSettlement.goalBonus === expectedGoalBonus
      && State.lastSettlement.serviceBonus === expectedServiceBonus
      && State.lastSettlement.takeoutPenalty === 0
      && State.lastSettlement.totalReward === expectedReward
      && Progress.gold === expectedReward
      && $("#rewardTotal").textContent === `+${money(expectedReward)}`;
    result.dayAndGrowthProgress = Progress.day === 2
      && Progress.stats.completedDays === 1
      && Progress.stats.successfulDays === 1
      && Progress.stats.totalSales === State.sales
      && Progress.stallLevel === 1;
    result.managementPanelFitsLandscape = managementPanelRect.left >= stage.left
      && managementPanelRect.right <= stage.right
      && managementPanelRect.top >= stage.top
      && managementPanelRect.bottom <= stage.bottom
      && $$(".upgrade-card").length === 4;

    Progress.gold = 1000000;
    renderHud();
    renderUpgradeShop();
    const goldBeforeUpgrade = Progress.gold;
    const potUpgradeCost = StationUpgradeCatalog.pot.costs[0];
    const stallButtonInitiallyDisabled = $("[data-stall-upgrade]").disabled;
    $("[data-station-upgrade='pot']").click();
    result.upgradePurchase = Progress.stationLevels.pot === 2
      && Progress.gold === goldBeforeUpgrade - potUpgradeCost
      && effectiveCookMs(RecipeCatalog.ramen_plain) === Math.round(RecipeCatalog.ramen_plain.cookMs * .92)
      && $("[data-upgrade-card='pot'] .upgrade-level").textContent === "LV.2/5";
    const grillBurnBeforeUpgrade = effectiveBurnMs(RecipeCatalog.grilled_dumpling);
    const odenCookBeforeUpgrade = effectiveCookMs(RecipeCatalog.warm_oden);
    $("[data-station-upgrade='grill']").click();
    $("[data-station-upgrade='oden']").click();
    result.allUpgradeEffectsApply = Progress.stationLevels.grill === 2
      && Progress.stationLevels.oden === 2
      && effectiveBurnMs(RecipeCatalog.grilled_dumpling) === grillBurnBeforeUpgrade + 2000
      && effectiveCookMs(RecipeCatalog.warm_oden) < odenCookBeforeUpgrade
      && StationUpgradeCatalog.oden.priceBonus[4] === .15;
    result.stallUpgradeRequiresStations = stallButtonInitiallyDisabled
      && stationRequirementMet(2)
      && !$("[data-stall-upgrade]").disabled
      && $("[data-upgrade-card='stall']").textContent.includes("냄비 3개")
      && $("[data-upgrade-card='stall']").textContent.includes("포장 주문 1건");
    const goldBeforeStallUpgrade = Progress.gold;
    const stallUpgradeCost = StallUpgradeCatalog.costs[0];
    $("[data-stall-upgrade]").click();
    result.paidStallUpgrade = Progress.stallLevel === 2
      && Progress.gold === goldBeforeStallUpgrade - stallUpgradeCost
      && $$(".appliance.pot:not([hidden])").length === 3
      && $$(".appliance.grill:not([hidden])").length === 1
      && $$(".appliance.oden:not([hidden])").length === 1;
    const savedProgress = JSON.parse(localStorage.getItem(SaveKey) || "null");
    result.progressSavedLocally = savedProgress?.day === 2
      && savedProgress?.gold === Progress.gold
      && savedProgress?.stationLevels?.pot === 2
      && savedProgress?.stationLevels?.grill === 2
      && savedProgress?.stationLevels?.oden === 2
      && savedProgress?.stallLevel === 2
      && savedProgress?.version === 6
      && savedProgress?.stats?.completedDays === 1
      && savedProgress?.regulars?.[qaFirstCustomerId]?.served === 1
      && savedProgress?.storyLog?.length >= 1;
    const dayBeforeResetArm = Progress.day;
    $("#resetProgressButton").click();
    result.resetRequiresConfirmation = Progress.day === dayBeforeResetArm
      && $("#resetProgressButton").classList.contains("armed")
      && $("#resetProgressButton").textContent.includes("한 번 더");
    disarmResetButton();

    if (qaParams.has("holdSettlement")) {
      result.nextDayProgression = Progress.day === 2 && !$("#settlementOverlay").classList.contains("hidden");
    } else {
      $("#nextDayButton").click();
      result.nextDayProgression = State.running
        && Progress.day === 2
        && State.goal === goalForDay(2)
        && State.sales === 0
        && $("#dayNumber").textContent === "2"
        && $("#goalAmount").textContent === money(goalForDay(2))
        && $("#settlementOverlay").classList.contains("hidden");
    }

    const dayBeforeExpansionQA = Progress.day;
    const levelBeforeExpansionQA = Progress.stallLevel;
    const stationLevelsBeforeExpansionQA = { ...Progress.stationLevels };
    const runningBeforeExpansionQA = State.running;
    const milestoneCases = [
      { day: 1, level: 1, seats: 3, customers: 3, width: 1920 },
      { day: 10, level: 1, seats: 4, customers: 6, width: 1920 },
      { day: 25, level: 1, seats: 5, customers: 8, width: 1920 },
      { day: 50, level: 2, seats: 6, customers: 10, width: 2160 },
      { day: 1, level: 3, seats: 7, customers: 12, width: 2340 },
      { day: 1, level: 4, seats: 8, customers: 15, width: 2340 },
      { day: 1, level: 5, seats: 10, customers: 18, width: 2340 }
    ];
    let milestoneLayoutPass = true;
    milestoneCases.forEach(testCase => {
      Progress.day = testCase.day;
      Progress.stallLevel = testCase.level;
      applyStallLevel();
      milestoneLayoutPass = milestoneLayoutPass
        && guestCapacityForLevel() === testCase.seats
        && customerPoolSize() === testCase.customers
        && $$(".guest-slot:not([hidden])").length === testCase.seats
        && Number($("#stage").dataset.layoutWidth) === testCase.width
        && Config.stage.currentWidth >= testCase.width;
    });
    result.seatAndCustomerMilestones = milestoneLayoutPass;
    Progress.day = 1;
    Progress.stallLevel = 1;
    applyStallLevel();
    const level1StationCount = $$(".appliance:not([hidden])").length;
    Progress.stallLevel = 2;
    applyStallLevel();
    const level2StationCount = $$(".appliance:not([hidden])").length;
    Progress.stallLevel = 3;
    applyStallLevel();
    const level3StationCount = $$(".appliance:not([hidden])").length;
    result.stationUnlockSequence = level1StationCount === 4 && level2StationCount === 5 && level3StationCount === 6;
    const facilityCases = [
      { level: 1, takeout: 0, pass: 0 },
      { level: 2, takeout: 1, pass: 0 },
      { level: 3, takeout: 1, pass: 2 },
      { level: 4, takeout: 2, pass: 3 },
      { level: 5, takeout: 3, pass: 4 }
    ];
    result.takeoutAndPassUnlockSequence = facilityCases.every(testCase => {
      Progress.stallLevel = testCase.level;
      applyStallLevel();
      return takeoutCapacityForLevel() === testCase.takeout
        && completionPassCapacityForLevel() === testCase.pass
        && $$(".takeout-order:not([hidden])").length === testCase.takeout
        && $$(".pass-slot:not([hidden])").length === testCase.pass
        && $("#takeoutBoard").hidden === (testCase.takeout === 0)
        && $("#completionPass").hidden === (testCase.pass === 0);
    });
    Progress.day = 1;
    Progress.stallLevel = 5;
    applyStallLevel();
    clearGuestTimers();
    resetGuests();
    State.running = true;
    for (let index = 0; index < 10; index += 1) activateGuest(index);
    const maxSeatCustomerIds = Guests.filter(guest => guest.active).map(guest => guest.customerId);
    result.tenSeatRandomVisitors = maxSeatCustomerIds.length === 10
      && new Set(maxSeatCustomerIds).size === 10
      && maxSeatCustomerIds.every(id => unlockedCustomers().some(customer => customer.id === id));
    const maxSeatRects = $$(".guest-slot:not([hidden])").map(slot => slot.getBoundingClientRect());
    result.tenSeatLayoutNoOverlap = maxSeatRects.length === 10
      && maxSeatRects.every((rect, index) => index === 0 || rect.left >= maxSeatRects[index - 1].right - 1);
    const customerArtLoaded = await Promise.all(CustomerCatalog.map(customer => new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(image.naturalWidth >= 200 && image.naturalHeight >= 300);
      image.onerror = () => resolve(false);
      image.src = customer.art;
    })));
    result.eighteenCustomerArt = customerArtLoaded.every(Boolean);
    clearGuestTimers();
    resetGuests();

    const facilityArtLoaded = await Promise.all(["assets/art-v012/takeout-package-v1.png", "assets/art-v012/completion-pass-vertical-v1.png"].map(source => new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(image.naturalWidth >= 900 && image.naturalHeight >= 600);
      image.onerror = () => resolve(false);
      image.src = source;
    })));
    result.takeoutFacilityArtLoaded = facilityArtLoaded.every(Boolean)
      && getComputedStyle($(".takeout-order .package-preview")).backgroundImage.includes("takeout-package-v1.png")
      && getComputedStyle($("#completionPass")).backgroundImage.includes("completion-pass-vertical-v1.png");

    const boardRect = $("#takeoutBoard").getBoundingClientRect();
    const maxGuestRowRect = $("#guestRow").getBoundingClientRect();
    const passRect = $("#completionPass").getBoundingClientRect();
    const maxKitchenRect = $("#cookRight").getBoundingClientRect();
    const maxDockRect = $(".dock").getBoundingClientRect();
    result.expansionFacilitiesUseSideWing = boardRect.right <= maxGuestRowRect.left + 2
      && passRect.left >= maxKitchenRect.right - 3
      && passRect.top < maxDockRect.top
      && boardRect.left >= $("#stage").getBoundingClientRect().left - 1;

    resetTakeoutOrders();
    const salesBeforeTakeoutQA = State.sales;
    const servedBeforeTakeoutQA = State.served;
    activateTakeout(0);
    const generatedLevel5Combination = TakeoutOrders[0].items.length === 2
      && MenuCatalog[TakeoutOrders[0].items[0].id].kind === "food"
      && MenuCatalog[TakeoutOrders[0].items[1].id].kind === "drink";
    TakeoutOrders[0].items = [{ id: "ramen_plain", fulfilled: false }];
    renderTakeoutOrder(TakeoutOrders[0]);
    Appliances[0].state = "ready";
    Appliances[0].item = "noodle";
    Appliances[0].ingredients = ["noodle"];
    Appliances[0].recipeId = "ramen_plain";
    Appliances[0].cookRemaining = 0;
    Appliances[0].burnRemaining = effectiveBurnMs(RecipeCatalog.ramen_plain);
    renderAppliance(Appliances[0]);
    const expectedTakeoutPrice = Math.round(menuPriceWithUpgrade("ramen_plain") * (1 + Config.takeout.bonusByLevel[5]));
    deliverTakeoutItem(0, "ramen_plain", Appliances[0]);
    result.randomTakeoutOrders = generatedLevel5Combination;
    result.takeoutPackingFlow = TakeoutOrders[0].packed
      && !TakeoutOrders[0].active
      && Appliances[0].state === "empty"
      && State.takeoutServed === 1
      && State.served === servedBeforeTakeoutQA + 1
      && State.sales === salesBeforeTakeoutQA + expectedTakeoutPrice;

    Appliances[3].state = "ready";
    Appliances[3].item = "dumpling";
    Appliances[3].ingredients = ["dumpling"];
    Appliances[3].recipeId = "grilled_dumpling";
    Appliances[3].cookRemaining = 0;
    Appliances[3].burnRemaining = effectiveBurnMs(RecipeCatalog.grilled_dumpling);
    renderAppliance(Appliances[3]);
    storeFoodInPass(Appliances[3], 0);
    result.completionPassStoresFood = Appliances[3].state === "empty"
      && CompletionPassSlots[0].recipeId === "grilled_dumpling"
      && $(`[data-pass-slot="0"] img`)?.src.includes("food-dumpling-v2.png");
    Guests[0].active = true;
    Guests[0].serving = false;
    Guests[0].customerId = "office";
    Guests[0].order = createOrder("grilled_dumpling", "soju");
    Guests[0].maxPatience = effectivePatienceMs();
    Guests[0].patience = Guests[0].maxPatience;
    Guests[0].satisfaction = "waiting";
    renderGuest(Guests[0]);
    servePassFood(0, 0);
    result.completionPassServesHall = CompletionPassSlots[0].recipeId === null
      && Guests[0].order.items[0].fulfilled
      && !Guests[0].order.items[1].fulfilled;
    resetGuests();

    const penaltyBeforeQA = State.takeoutPenalty;
    const missedTakeoutBeforeQA = State.takeoutMissed;
    activateTakeout(1);
    TakeoutOrders[1].items = [{ id: "warm_oden", fulfilled: false }];
    expireTakeout(TakeoutOrders[1]);
    result.missedTakeoutHasPenalty = State.takeoutMissed === missedTakeoutBeforeQA + 1
      && State.takeoutPenalty === penaltyBeforeQA + Config.takeout.missedPenalty
      && TakeoutOrders[1].missed
      && !TakeoutOrders[1].active;
    clearTakeoutTimers();
    resetTakeoutOrders();
    resetCompletionPass();
    Progress.day = dayBeforeExpansionQA;
    Progress.stallLevel = levelBeforeExpansionQA;
    Progress.stationLevels = stationLevelsBeforeExpansionQA;
    State.running = runningBeforeExpansionQA;
    applyStallLevel();
    renderHud();

    const dayBeforeInfiniteQA = Progress.day;
    Progress.day = 123456;
    State.goal = goalForDay();
    renderHud();
    result.infiniteDayCounter = $("#dayNumber").textContent === "123456"
      && $("#stage").dataset.dayDigits === "6"
      && sanitizeProgress({ day: 123456 }).day === 123456;
    result.infiniteDifficultyStaysPlayable = goalForDay(1) === 10000
      && goalForDay(1000000) <= 31500
      && goalBonusForDay(1000000) <= 10000;
    Progress.day = dayBeforeInfiniteQA;
    State.goal = goalForDay();
    renderHud();

    const output = document.createElement("pre");
    output.id = "qa-results";
    output.textContent = JSON.stringify(result, null, 2);
    output.style.cssText = "position:absolute;z-index:99999;left:0;top:0;width:360px;margin:0;padding:8px;background:white;color:black;font-size:11px;line-height:1.25;white-space:pre-wrap";
    if (!qaParams.has("silent")) $("#stage").append(output);
    document.documentElement.dataset.qa = Object.values(result).every(Boolean) ? "pass" : "fail";
  }

  build();
  Sound.syncButton();
  State.cookingTimer = setInterval(tickCooking, Config.cooking.tickMs);
  State.patienceTimer = setInterval(tickGuests, Config.guests.tickMs);
  $$(".ingredient,.appliance").forEach(bindDrag);
  document.addEventListener("pointermove", moveDrag, { passive: false });
  document.addEventListener("pointerup", endDrag, { passive: false });
  document.addEventListener("pointercancel", endDrag, { passive: false });
  $("#startButton").addEventListener("click", start);
  $("#nextDayButton").addEventListener("click", nextDay);
  $("#resetProgressButton").addEventListener("click", resetProgress);
  $("#pauseButton").addEventListener("click", () => {
    if (!State.running) return toast("영업 중에 사용할 수 있어요.");
    State.paused = true;
    Sound.stopBgm();
    Sound.sfx("drop");
    $("#stage").classList.add("paused-fx");
    $("#pauseOverlay").classList.remove("hidden");
  });
  $("#resumeButton").addEventListener("click", () => {
    State.paused = false;
    $("#stage").classList.remove("paused-fx");
    Sound.startBgm();
    Sound.sfx("drop");
    $("#pauseOverlay").classList.add("hidden");
  });
  $("#soundButton").addEventListener("click", () => Sound.setEnabled(!Sound.enabled));
  $("#helpButton").addEventListener("click", openHelp);
  $("#closeHelpButton").addEventListener("click", () => closeHelp(true));
  $("#restartTutorialButton").addEventListener("click", () => {
    if (State.running && !State.tutorialMode) {
      closeHelp(true);
      toast("현재 영업을 마친 뒤 연습 포차를 이용해 주세요.");
      return;
    }
    closeHelp(false);
    Tutorial.start();
  });
  $("#tutorialSkipButton").addEventListener("click", () => {
    Tutorial.close(true);
    toast("단계별 안내를 건너뛰었어요. ? 버튼에서 다시 볼 수 있어요.");
  });
  $("#tutorialActionButton").addEventListener("click", () => Tutorial.advance());
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("#helpOverlay").classList.contains("hidden")) closeHelp(true);
  });
  document.addEventListener("dragstart", event => event.preventDefault());
  window.addEventListener("resize", resize, { passive: true });
  window.visualViewport?.addEventListener("resize", resize, { passive: true });
  window.addEventListener("boreumi:viewport", resize, { passive: true });
  resize();
  startPpomiPoses();
  window.BoreumiBoot?.markGameReady();
  Tutorial.scheduleFirstRun();
  browserQA();
})();
