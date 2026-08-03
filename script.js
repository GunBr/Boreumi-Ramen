(() => {
  "use strict";

  const CONFIG = {
    daySeconds: 180,
    firstGuestDelayMs: 2000,
    cookMs: 10000,
    toppingWindowMs: 5000,
    readySafeMs: 5000,
    warningMs: 2000,
    guestPatienceMs: 42000,
    salePrice: 3500,
    wasteCost: 700
  };

  const INGREDIENTS = {
    noodle: "면",
    soup: "스프",
    egg: "계란",
    greenOnion: "대파",
    riceCake: "떡",
    kimchi: "김치"
  };

  let remainingSeconds = CONFIG.daySeconds;
  let timerId = null;
  let running = false;
  let paused = false;
  let sales = 0;
  let guestCount = 0;
  let activeGuest = null;
  let dragState = null;

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
  const trashButton = $("#trashButton");
  const toast = $("#toast");
  const dragGhost = $("#dragGhost");
  const dragHint = $("#dragHint");
  const seats = $$(".customer-seat");

  function createPotState(id) {
    return {
      id,
      phase: "empty",
      ingredients: [],
      cookStartedAt: 0,
      timers: []
    };
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
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => toast.classList.remove("show"), 1650);
  }

  function clearPotTimers(pot) {
    pot.timers.forEach(clearTimeout);
    pot.timers.length = 0;
  }

  function potElement(id) {
    return document.querySelector(`[data-station="${id}"]`);
  }

  function renderPot(pot) {
    const el = potElement(pot.id);
    el.classList.remove("cooking", "ready", "warning", "burnt");
    if (pot.phase !== "empty") el.classList.add(pot.phase);

    let contents = el.querySelector(".pot-contents");
    if (!contents) {
      contents = document.createElement("div");
      contents.className = "pot-contents";
      el.appendChild(contents);
    }
    contents.textContent = pot.ingredients.map(x => INGREDIENTS[x]).join(" + ");

    const label = el.querySelector("span");
    const labels = {
      empty: pot.id === "pot1" ? "냄비 1" : "냄비 2",
      cooking: "조리 중",
      ready: "완성",
      warning: "곧 타요!",
      burnt: "탄 음식"
    };
    label.textContent = labels[pot.phase];
  }

  function beginCookingIfReady(pot) {
    if (pot.phase !== "empty") return;
    if (!pot.ingredients.includes("noodle") || !pot.ingredients.includes("soup")) return;

    pot.phase = "cooking";
    pot.cookStartedAt = Date.now();
    renderPot(pot);
    showToast("라면 조리 시작 · 토핑은 5초 안에 추가 가능");

    pot.timers.push(setTimeout(() => {
      if (!running || pot.phase !== "cooking") return;
      pot.phase = "ready";
      renderPot(pot);
      showToast("라면이 완성됐어요! 손님에게 끌어 주세요.");

      pot.timers.push(setTimeout(() => {
        if (pot.phase !== "ready") return;
        pot.phase = "warning";
        renderPot(pot);
        showToast("곧 타요!");

        pot.timers.push(setTimeout(() => {
          if (pot.phase !== "warning") return;
          pot.phase = "burnt";
          renderPot(pot);
          showToast("음식이 탔어요. 냄비를 눌러 폐기하세요.");
        }, CONFIG.warningMs));
      }, CONFIG.readySafeMs));
    }, CONFIG.cookMs));
  }

  function addIngredientToPot(ingredient, potId) {
    if (!running) return showToast("먼저 영업을 시작해 주세요.");
    const pot = pots[potId];

    if (pot.phase === "ready" || pot.phase === "warning" || pot.phase === "burnt") {
      return showToast("완성되거나 탄 음식에는 재료를 넣을 수 없어요.");
    }

    if (pot.phase === "cooking" && Date.now() - pot.cookStartedAt > CONFIG.toppingWindowMs) {
      return showToast("지금은 토핑을 추가하기 늦었어요.");
    }

    if (pot.ingredients.includes(ingredient)) {
      return showToast("이미 들어간 재료예요.");
    }

    const toppingCount = pot.ingredients.filter(x => !["noodle", "soup"].includes(x)).length;
    if (!["noodle", "soup"].includes(ingredient) && toppingCount >= 2) {
      return showToast("토핑은 최대 2개까지 가능해요.");
    }

    if (pot.phase === "cooking" && ["noodle", "soup"].includes(ingredient)) {
      return showToast("면과 스프는 조리 시작 전에 넣어야 해요.");
    }

    pot.ingredients.push(ingredient);
    renderPot(pot);
    showToast(`${INGREDIENTS[ingredient]} 투입`);
    dragHint.classList.add("hidden");
    beginCookingIfReady(pot);
  }

  function recipeName(ingredients) {
    const toppings = ingredients.filter(x => !["noodle", "soup"].includes(x));
    if (toppings.length === 0) return "일반라면";
    if (toppings.length === 1) {
      return {
        egg: "계란라면",
        greenOnion: "대파라면",
        riceCake: "떡라면",
        kimchi: "김치라면"
      }[toppings[0]] || "토핑라면";
    }
    const short = {
      egg: "계란",
      greenOnion: "대파",
      riceCake: "떡",
      kimchi: "김치"
    };
    return toppings.map(x => short[x] || x).join("·") + "라면";
  }

  function resetPot(pot) {
    clearPotTimers(pot);
    pot.phase = "empty";
    pot.ingredients = [];
    pot.cookStartedAt = 0;
    renderPot(pot);
  }

  function servePotToOrder(pot, orderCard) {
    if (!activeGuest) return showToast("서빙할 손님이 없어요.");
    if (!["ready", "warning"].includes(pot.phase)) {
      return showToast("완성된 음식만 서빙할 수 있어요.");
    }

    const seat = orderCard.closest(".customer-seat");
    if (seats.indexOf(seat) !== activeGuest.seatIndex) {
      return showToast("주문한 손님에게 전달해 주세요.");
    }

    const made = recipeName(pot.ingredients);
    if (made !== activeGuest.order) {
      return showToast(`주문은 ${activeGuest.order}이에요.`);
    }

    sales += CONFIG.salePrice;
    renderHud();
    resetPot(pot);
    clearActiveGuest(`${made} 판매! +${formatWon(CONFIG.salePrice)}`);
  }

  function discardPot(pot) {
    if (pot.phase === "empty") return showToast("냄비가 비어 있어요.");
    resetPot(pot);
    sales = Math.max(0, sales - CONFIG.wasteCost);
    renderHud();
    showToast(`폐기 비용 -${formatWon(CONFIG.wasteCost)}`);
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
      interval: null,
      remainingMs: CONFIG.guestPatienceMs,
      lastTickAt: Date.now()
    };

    guestCount += 1;
    seat.classList.add("active");
    seat.querySelector(".order-title").textContent = "오늘의 주문";
    seat.querySelector(".order-menu").textContent = order;
    seat.querySelector(".patience span").style.width = "100%";
    renderHud();
    showToast("손님이 왔어요!");

    activeGuest.interval = setInterval(() => {
      if (!activeGuest || paused) return;
      const now = Date.now();
      activeGuest.remainingMs -= now - activeGuest.lastTickAt;
      activeGuest.lastTickAt = now;
      const ratio = Math.max(0, activeGuest.remainingMs / CONFIG.guestPatienceMs);
      seat.querySelector(".patience span").style.width = `${ratio * 100}%`;

      if (ratio <= 0) clearActiveGuest("손님이 기다리다 돌아갔어요.");
    }, 180);
  }

  function clearActiveGuest(message) {
    if (!activeGuest) return;
    const seat = seats[activeGuest.seatIndex];
    clearInterval(activeGuest.interval);
    seat.classList.remove("active");
    seat.querySelector(".order-title").textContent = "빈자리";
    seat.querySelector(".order-menu").textContent = "다음 손님을 기다려요";
    seat.querySelector(".patience span").style.width = "0%";
    activeGuest = null;
    showToast(message);
    if (running) setTimeout(spawnGuest, 2200);
  }

  function dragPayloadFrom(el) {
    if (el.dataset.ingredient) {
      return { type: "ingredient", ingredient: el.dataset.ingredient, label: el.textContent.trim() };
    }
    if (el.dataset.station) {
      const pot = pots[el.dataset.station];
      if (!["ready", "warning"].includes(pot.phase)) return null;
      return { type: "pot", potId: pot.id, label: recipeName(pot.ingredients) };
    }
    return null;
  }

  function moveGhost(x, y) {
    dragGhost.style.left = `${x}px`;
    dragGhost.style.top = `${y}px`;
  }

  function clearDragTargets() {
    $$(".drag-over").forEach(el => el.classList.remove("drag-over"));
  }

  function startDrag(ev, el) {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    const payload = dragPayloadFrom(el);
    if (!payload) {
      if (el.dataset.station && pots[el.dataset.station].phase === "burnt") {
        discardPot(pots[el.dataset.station]);
      }
      return;
    }

    ev.preventDefault();
    el.setPointerCapture?.(ev.pointerId);
    dragState = { pointerId: ev.pointerId, source: el, payload };
    el.classList.add("drag-source");
    dragGhost.textContent = payload.label;
    dragGhost.classList.add("show");
    moveGhost(ev.clientX, ev.clientY);
  }

  function moveDrag(ev) {
    if (!dragState || ev.pointerId !== dragState.pointerId) return;
    ev.preventDefault();
    moveGhost(ev.clientX, ev.clientY);
    clearDragTargets();

    const target = document.elementFromPoint(ev.clientX, ev.clientY);
    if (!target) return;

    if (dragState.payload.type === "ingredient") {
      const pot = target.closest("[data-station]");
      if (pot && pots[pot.dataset.station]) pot.classList.add("drag-over");
    } else if (dragState.payload.type === "pot") {
      const card = target.closest(".order-card");
      if (card) card.classList.add("drag-over");
    }
  }

  function endDrag(ev) {
    if (!dragState || ev.pointerId !== dragState.pointerId) return;
    ev.preventDefault();

    const target = document.elementFromPoint(ev.clientX, ev.clientY);
    const { payload, source } = dragState;

    if (payload.type === "ingredient") {
      const pot = target?.closest("[data-station]");
      if (pot && pots[pot.dataset.station]) addIngredientToPot(payload.ingredient, pot.dataset.station);
      else showToast("재료를 냄비 안에 놓아주세요.");
    } else if (payload.type === "pot") {
      const card = target?.closest(".order-card");
      if (card) servePotToOrder(pots[payload.potId], card);
      else showToast("완성된 라면을 손님의 주문칸에 놓아주세요.");
    }

    source.classList.remove("drag-source");
    dragGhost.classList.remove("show");
    clearDragTargets();
    dragState = null;
  }

  function bindDraggable(el) {
    el.addEventListener("pointerdown", ev => startDrag(ev, el));
    el.addEventListener("pointermove", moveDrag);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
  }

  function resetDay() {
    sales = 0;
    guestCount = 0;
    remainingSeconds = CONFIG.daySeconds;
    if (activeGuest) {
      clearInterval(activeGuest.interval);
      activeGuest = null;
    }
    Object.values(pots).forEach(resetPot);
    seats.forEach(seat => {
      seat.classList.remove("active");
      seat.querySelector(".order-title").textContent = "빈자리";
      seat.querySelector(".order-menu").textContent = "영업 시작 후 손님이 와요";
      seat.querySelector(".patience span").style.width = "0%";
    });
    dragHint.classList.remove("hidden");
    renderHud();
  }

  function finishDay() {
    running = false;
    paused = false;
    clearInterval(timerId);
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
    clearInterval(timerId);
    resetDay();
    running = true;
    paused = false;
    startButton.hidden = true;
    timerId = setInterval(tick, 1000);
    showToast("영업을 시작합니다!");
    setTimeout(spawnGuest, CONFIG.firstGuestDelayMs);
  }

  startButton.addEventListener("click", startDay);
  pauseButton.addEventListener("click", () => {
    if (!running) return showToast("영업 시작 후 사용할 수 있어요.");
    paused = true;
    pauseOverlay.classList.remove("hidden");
  });
  resumeButton.addEventListener("click", () => {
    paused = false;
    if (activeGuest) activeGuest.lastTickAt = Date.now();
    pauseOverlay.classList.add("hidden");
  });
  settingsButton.addEventListener("click", () => {
    if (running) paused = true;
    settingsOverlay.classList.remove("hidden");
  });
  closeSettingsButton.addEventListener("click", () => {
    settingsOverlay.classList.add("hidden");
    if (running) {
      paused = false;
      if (activeGuest) activeGuest.lastTickAt = Date.now();
    }
  });

  trashButton.addEventListener("click", () => {
    const candidates = Object.values(pots).filter(p => p.phase !== "empty");
    if (candidates.length === 0) return showToast("폐기할 음식이 없어요.");
    discardPot(candidates[0]);
  });

  $$(".draggable-item, .draggable-pot").forEach(bindDraggable);

  $$(".item:not(.draggable-item), .station:not(.draggable-pot):not(.locked)").forEach(button => {
    button.addEventListener("click", () => {
      const label = button.dataset.label || button.textContent.trim();
      showToast(`${label}은 다음 버전에서 사용할 수 있어요.`);
    });
  });

  window.addEventListener("pointermove", ev => {
    if (!dragState) {
      const x = (ev.clientX / window.innerWidth - .5) * 8;
      const y = (ev.clientY / window.innerHeight - .5) * 5;
      document.querySelector(".background").style.backgroundPosition = `calc(50% + ${x}px) calc(50% + ${y}px)`;
    }
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(() => window.scrollTo(0, 0), 180);
  });

  resetDay();
})();