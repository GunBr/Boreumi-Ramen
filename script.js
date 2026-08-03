(() => {
  "use strict";

  const CONFIG = {
    daySeconds: 180,
    firstGuestDelayMs: 2000,
    cookMs: 10000,
    readySafeMs: 5000,
    warningMs: 2000,
    guestPatienceMs: 42000,
    salePrice: 3500,
    wasteCost: 700
  };

  let remainingSeconds = CONFIG.daySeconds;
  let timerId = null;
  let running = false;
  let paused = false;
  let sales = 0;
  let guestCount = 0;
  let activeGuest = null;
  let selectedPot = null;
  let selectedIngredients = new Set();

  const pots = {
    pot1: createPotState("pot1"),
    pot2: createPotState("pot2")
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const timerValue = $("#timerValue");
  const timerFill = $("#timerFill");
  const salesValue = $("#salesValue");
  const guestValue = $("#guestValue");
  const startButton = $("#startButton");
  const pauseButton = $("#pauseButton");
  const settingsButton = $("#settingsButton");
  const pauseOverlay = $("#pauseOverlay");
  const settingsOverlay = $("#settingsOverlay");
  const resumeButton = $("#resumeButton");
  const closeSettingsButton = $("#closeSettingsButton");
  const serveButton = $("#serveButton");
  const trashButton = $("#trashButton");
  const toast = $("#toast");
  const seats = $$(".customer-seat");
  const ingredientButtons = $$("[data-ingredient]");

  function createPotState(id) {
    return { id, phase: "empty", ingredients: [], timers: [] };
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
  }

  function formatWon(value) {
    return `${value.toLocaleString("ko-KR")}원`;
  }

  function renderHud() {
    timerValue.textContent = formatTime(remainingSeconds);
    timerFill.style.width = `${(remainingSeconds / CONFIG.daySeconds) * 100}%`;
    salesValue.textContent = formatWon(sales);
    guestValue.textContent = `${guestCount}명`;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove("show"), 1600);
  }

  function clearPotTimers(pot) {
    pot.timers.forEach(window.clearTimeout);
    pot.timers.length = 0;
  }

  function renderPot(pot) {
    const el = document.querySelector(`[data-station="${pot.id}"]`);
    el.classList.remove("selected", "cooking", "ready", "warning", "burnt");
    if (selectedPot === pot.id) el.classList.add("selected");
    if (pot.phase !== "empty") el.classList.add(pot.phase);
    const label = el.querySelector("span");
    const labels = {
      empty: pot.id === "pot1" ? "냄비 1" : "냄비 2",
      cooking: "조리 중",
      ready: "완성",
      warning: "꺼내세요!",
      burnt: "탄 음식"
    };
    label.textContent = labels[pot.phase];
  }

  function resetIngredients() {
    selectedIngredients.clear();
    ingredientButtons.forEach((button) => button.classList.remove("selected"));
  }

  function selectPot(id) {
    if (!running) return showToast("먼저 영업을 시작해 주세요.");
    selectedPot = id;
    Object.values(pots).forEach(renderPot);
    showToast(`${id === "pot1" ? "냄비 1" : "냄비 2"} 선택`);
  }

  function toggleIngredient(button) {
    if (!running) return showToast("영업 시작 후 재료를 사용할 수 있어요.");
    if (!selectedPot) return showToast("먼저 냄비를 선택해 주세요.");

    const pot = pots[selectedPot];
    if (pot.phase !== "empty") return showToast("사용 중인 냄비예요.");

    const ingredient = button.dataset.ingredient;
    if (selectedIngredients.has(ingredient)) {
      selectedIngredients.delete(ingredient);
      button.classList.remove("selected");
    } else {
      selectedIngredients.add(ingredient);
      button.classList.add("selected");
    }

    const hasBase = selectedIngredients.has("noodle") && selectedIngredients.has("soup");
    const toppings = [...selectedIngredients].filter((x) => !["noodle", "soup"].includes(x));
    if (hasBase && toppings.length <= 2) {
      showToast("냄비를 다시 누르면 조리를 시작해요.");
    } else if (toppings.length > 2) {
      selectedIngredients.delete(ingredient);
      button.classList.remove("selected");
      showToast("토핑은 최대 2개까지 가능해요.");
    }
  }

  function startCooking(pot) {
    const ingredients = [...selectedIngredients];
    if (!ingredients.includes("noodle") || !ingredients.includes("soup")) {
      return showToast("면과 스프를 먼저 선택해 주세요.");
    }
    const toppings = ingredients.filter((x) => !["noodle", "soup"].includes(x));
    if (toppings.length > 2) return showToast("토핑은 최대 2개까지 가능해요.");

    pot.phase = "cooking";
    pot.ingredients = ingredients;
    clearPotTimers(pot);
    resetIngredients();
    renderPot(pot);
    showToast("라면 조리를 시작했어요. 10초!");

    pot.timers.push(window.setTimeout(() => {
      if (!running) return;
      pot.phase = "ready";
      renderPot(pot);
      showToast("라면이 완성됐어요!");

      pot.timers.push(window.setTimeout(() => {
        if (pot.phase !== "ready") return;
        pot.phase = "warning";
        renderPot(pot);
        showToast("곧 타요!");

        pot.timers.push(window.setTimeout(() => {
          if (pot.phase !== "warning") return;
          pot.phase = "burnt";
          renderPot(pot);
          showToast("음식이 탔어요. 폐기해 주세요.");
        }, CONFIG.warningMs));
      }, CONFIG.readySafeMs));
    }, CONFIG.cookMs));
  }

  function handlePotClick(id) {
    const pot = pots[id];
    if (!running) return showToast("먼저 영업을 시작해 주세요.");

    if (selectedPot !== id) {
      selectPot(id);
      return;
    }

    if (pot.phase === "empty") startCooking(pot);
    else if (pot.phase === "ready" || pot.phase === "warning") servePot(pot);
    else if (pot.phase === "burnt") discardPot(pot);
    else showToast("아직 조리 중이에요.");
  }

  function recipeName(ingredients) {
    const names = {
      egg: "계란라면",
      greenOnion: "대파라면",
      riceCake: "떡라면",
      kimchi: "김치라면"
    };
    const toppings = ingredients.filter((x) => !["noodle", "soup"].includes(x));
    if (toppings.length === 0) return "일반라면";
    if (toppings.length === 1) return names[toppings[0]] || "토핑라면";
    return toppings.map((x) => names[x]?.replace("라면", "") || x).join("·") + " 라면";
  }

  function spawnGuest() {
    if (!running || activeGuest) return;

    const seatIndex = Math.floor(Math.random() * seats.length);
    const seat = seats[seatIndex];
    const orders = ["일반라면", "계란라면", "대파라면"];
    const order = orders[Math.floor(Math.random() * orders.length)];

    activeGuest = {
      seatIndex,
      order,
      patience: 100,
      interval: null
    };

    guestCount += 1;
    seat.classList.add("active");
    seat.querySelector(".order-title").textContent = "오늘의 주문";
    seat.querySelector(".order-menu").textContent = order;
    seat.querySelector(".patience span").style.width = "100%";
    renderHud();
    showToast("첫 손님이 왔어요!");

    const startedAt = Date.now();
    activeGuest.interval = window.setInterval(() => {
      if (!activeGuest || paused) return;
      const elapsed = Date.now() - startedAt;
      const ratio = Math.max(0, 1 - elapsed / CONFIG.guestPatienceMs);
      activeGuest.patience = ratio * 100;
      seat.querySelector(".patience span").style.width = `${activeGuest.patience}%`;

      if (ratio <= 0) {
        clearActiveGuest("손님이 기다리다 돌아갔어요.");
      }
    }, 200);
  }

  function clearActiveGuest(message) {
    if (!activeGuest) return;
    const seat = seats[activeGuest.seatIndex];
    window.clearInterval(activeGuest.interval);
    seat.classList.remove("active");
    seat.querySelector(".order-title").textContent = "빈자리";
    seat.querySelector(".order-menu").textContent = "다음 손님을 기다려요";
    seat.querySelector(".patience span").style.width = "0%";
    activeGuest = null;
    showToast(message);
    if (running) window.setTimeout(spawnGuest, 2200);
  }

  function servePot(pot) {
    if (!activeGuest) return showToast("서빙할 손님이 없어요.");
    const made = recipeName(pot.ingredients);
    if (made !== activeGuest.order) {
      return showToast(`주문은 ${activeGuest.order}이에요.`);
    }
    sales += CONFIG.salePrice;
    renderHud();
    clearPotTimers(pot);
    pot.phase = "empty";
    pot.ingredients = [];
    renderPot(pot);
    clearActiveGuest(`${made} 판매! +${formatWon(CONFIG.salePrice)}`);
  }

  function discardPot(pot) {
    if (pot.phase === "empty") return showToast("냄비가 비어 있어요.");
    clearPotTimers(pot);
    pot.phase = "empty";
    pot.ingredients = [];
    sales = Math.max(0, sales - CONFIG.wasteCost);
    renderHud();
    renderPot(pot);
    showToast(`폐기 비용 -${formatWon(CONFIG.wasteCost)}`);
  }

  function discardSelected() {
    if (!selectedPot) return showToast("폐기할 냄비를 선택해 주세요.");
    discardPot(pots[selectedPot]);
  }

  function serveSelected() {
    if (!selectedPot) return showToast("서빙할 냄비를 선택해 주세요.");
    const pot = pots[selectedPot];
    if (!["ready", "warning"].includes(pot.phase)) return showToast("서빙 가능한 완성품이 없어요.");
    servePot(pot);
  }

  function resetDay() {
    sales = 0;
    guestCount = 0;
    remainingSeconds = CONFIG.daySeconds;
    activeGuest = null;
    selectedPot = null;
    resetIngredients();
    Object.values(pots).forEach((pot) => {
      clearPotTimers(pot);
      pot.phase = "empty";
      pot.ingredients = [];
      renderPot(pot);
    });
    seats.forEach((seat) => {
      seat.classList.remove("active");
      seat.querySelector(".order-title").textContent = "빈자리";
      seat.querySelector(".order-menu").textContent = "영업 시작 후 손님이 와요";
      seat.querySelector(".patience span").style.width = "0%";
    });
    renderHud();
  }

  function finishDay() {
    running = false;
    paused = false;
    window.clearInterval(timerId);
    timerId = null;
    if (activeGuest) clearActiveGuest("오늘 영업이 끝났어요.");
    startButton.hidden = false;
    startButton.querySelector("strong").textContent = "다시 시작";
    showToast(`영업 종료 · 매출 ${formatWon(sales)}`);
  }

  function tick() {
    if (!running || paused) return;
    remainingSeconds -= 1;
    renderHud();
    if (remainingSeconds <= 0) finishDay();
  }

  function startDay() {
    window.clearInterval(timerId);
    resetDay();
    running = true;
    paused = false;
    startButton.hidden = true;
    timerId = window.setInterval(tick, 1000);
    showToast("영업을 시작합니다!");
    window.setTimeout(spawnGuest, CONFIG.firstGuestDelayMs);
  }

  function pauseDay() {
    if (!running) return showToast("영업 시작 후 사용할 수 있어요.");
    paused = true;
    pauseOverlay.classList.remove("hidden");
  }

  function resumeDay() {
    paused = false;
    pauseOverlay.classList.add("hidden");
  }

  startButton.addEventListener("click", startDay);
  pauseButton.addEventListener("click", pauseDay);
  resumeButton.addEventListener("click", resumeDay);
  serveButton.addEventListener("click", serveSelected);
  trashButton.addEventListener("click", discardSelected);

  settingsButton.addEventListener("click", () => {
    if (running) paused = true;
    settingsOverlay.classList.remove("hidden");
  });

  closeSettingsButton.addEventListener("click", () => {
    settingsOverlay.classList.add("hidden");
    if (running) paused = false;
  });

  document.querySelectorAll("[data-station]").forEach((button) => {
    button.addEventListener("click", () => handlePotClick(button.dataset.station));
  });

  ingredientButtons.forEach((button) => {
    button.addEventListener("click", () => toggleIngredient(button));
  });

  document.querySelectorAll(".item:not([data-ingredient]), .station:not([data-station]):not(.locked)").forEach((button) => {
    button.addEventListener("click", () => {
      const label = button.dataset.label || button.textContent.trim();
      showToast(`${label}은 다음 버전에서 사용할 수 있어요.`);
    });
  });

  window.addEventListener("orientationchange", () => {
    window.setTimeout(() => window.scrollTo(0, 0), 180);
  });

  resetDay();
})();