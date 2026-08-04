(() => {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const Config = {
    stage: { width: 1600, height: 780 },
    daySeconds: 90,
    cookMs: { pot: 4200, grill: 3600, oden: 3000 },
    prices: { pot: 3500, grill: 2200, oden: 1800 },
    firstArrivals: [700, 4500, 8500]
  };

  const FoodArt = {
    pot: "assets/art-v012/food-ramen-v2.png",
    grill: "assets/art-v012/food-dumpling-v2.png",
    oden: "assets/art-v012/food-oden.png"
  };

  const State = {
    running: false,
    paused: false,
    time: Config.daySeconds,
    sales: 0,
    guests: 0,
    drag: null,
    dayTimer: null,
    guestTimers: []
  };

  const Appliances = [
    ...Array.from({ length: 3 }, (_, index) => ({ id: `pot-${index}`, type: "pot", slot: index, state: "empty", item: null, timer: null })),
    ...Array.from({ length: 2 }, (_, index) => ({ id: `grill-${index}`, type: "grill", slot: index, state: "empty", item: null, timer: null })),
    { id: "oden-0", type: "oden", slot: 0, state: "empty", item: null, timer: null }
  ];

  const Guests = ["pot", "grill", "oden"].map((order, index) => ({ index, order, active: false }));

  function assetUrl(path) {
    return new URL(path, document.baseURI).href;
  }

  function build() {
    const left = $("#cookLeft");
    const right = $("#cookRight");

    Appliances.forEach(appliance => {
      const button = document.createElement("button");
      button.className = `appliance ${appliance.type}`;
      button.dataset.id = appliance.id;
      button.innerHTML = `<label>${appliance.type === "pot" ? `냄비 ${appliance.slot + 1}` : appliance.type === "grill" ? `그릴 ${appliance.slot + 1}` : "오뎅바"}</label><span class="art"></span><span class="bar"><i></i></span>`;
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
    const scale = Math.min(viewport.width / Config.stage.width, viewport.height / Config.stage.height);
    $("#stage").style.transform = `scale(${scale})`;
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
    if (appliance.type === "pot") return "ramen";
    if (appliance.type === "grill") return "dumpling";
    return "oden-food";
  }

  function renderAppliance(appliance) {
    const element = $(`[data-id="${appliance.id}"]`);
    const art = element.querySelector(".art");
    element.classList.toggle("ready", appliance.state === "ready");
    element.classList.toggle("cooking", appliance.state === "cooking");
    element.classList.toggle("burnt", appliance.state === "burnt");
    art.innerHTML = `<i class="kitchen-sprite sprite-${spriteFor(appliance)}"></i>`;
  }

  function renderAll() {
    Appliances.forEach(renderAppliance);
    renderHud();
  }

  function renderGuest(guest) {
    const slot = $(`[data-guest="${guest.index}"]`);
    slot.classList.toggle("active", guest.active);
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
    renderGuest(guest);
    if (State.running) scheduleGuest(index, 2800 + index * 450);
  }

  function resetGuests() {
    clearGuestTimers();
    Guests.forEach(guest => {
      guest.active = false;
      renderGuest(guest);
    });
  }

  function teleport(appliance, text) {
    const target = $(`[data-id="${appliance.id}"]`).getBoundingClientRect();
    const lane = $(".characters").getBoundingClientRect();
    const scale = lane.width / Config.stage.width;
    const boreumi = $("#boreumi");
    let left = (target.left + target.width / 2 - lane.left) / scale - 92;
    left = Math.max(10, Math.min(1385, left));
    boreumi.dataset.pose = appliance.type === "pot" ? (appliance.item === "egg" ? "egg" : "noodle") : appliance.type;
    boreumi.style.left = left + "px";
    boreumi.classList.remove("teleport", "action");
    void boreumi.offsetWidth;
    boreumi.classList.add("teleport");
    setTimeout(() => {
      boreumi.classList.remove("teleport");
      boreumi.classList.add("action");
    }, 110);
    setTimeout(() => boreumi.classList.remove("action"), 650);
    say(text);
  }

  function accepts(appliance, item) {
    if (appliance.type === "pot") return item === "noodle" || item === "egg";
    if (appliance.type === "grill") return item === "dumpling";
    return item === "oden";
  }

  function dropItem(appliance, item) {
    if (!State.running) return toast("먼저 영업을 시작해 주세요.");
    if (!accepts(appliance, item)) return toast("이 재료는 다른 조리기구에 넣어주세요.");

    if (appliance.type === "pot" && item === "egg") {
      if (appliance.state !== "cooking") return toast("면이 끓고 있는 냄비에 계란을 넣어주세요.");
      appliance.item = "egg";
      teleport(appliance, "계란 톡!");
      renderAppliance(appliance);
      return;
    }

    if (appliance.state !== "empty") return toast("다른 빈 조리기구를 사용해 주세요.");
    appliance.state = "cooking";
    appliance.item = item;
    renderAppliance(appliance);
    teleport(appliance, appliance.type === "pot" ? "조리 시작!" : appliance.type === "grill" ? "노릇하게 구울게!" : "따끈하게 데울게!");

    const element = $(`[data-id="${appliance.id}"]`);
    const bar = element.querySelector(".bar i");
    const duration = Config.cookMs[appliance.type];
    bar.style.transition = `width ${duration}ms linear`;
    requestAnimationFrame(() => bar.style.width = "100%");
    clearTimeout(appliance.timer);
    appliance.timer = setTimeout(() => {
      appliance.state = "ready";
      renderAppliance(appliance);
      toast(`${appliance.type === "pot" ? "라면" : appliance.type === "grill" ? "군만두" : "오뎅"} 완성!`);
    }, duration);
  }

  function resetAppliance(appliance) {
    appliance.state = "empty";
    appliance.item = null;
    clearTimeout(appliance.timer);
    const element = $(`[data-id="${appliance.id}"]`);
    const bar = element.querySelector(".bar i");
    bar.style.transition = "none";
    bar.style.width = "0";
    renderAppliance(appliance);
  }

  function serve(appliance, guestIndex) {
    const guest = Guests[guestIndex];
    if (!guest?.active) return toast("빈자리에는 서빙할 수 없어요.");
    if (appliance.state !== "ready") return toast("완성된 음식만 서빙할 수 있어요.");
    if (guest.order !== appliance.type) return toast("손님의 주문과 다른 음식이에요.");

    State.sales += Config.prices[appliance.type];
    resetAppliance(appliance);
    renderHud();
    say("맛있게 드세요!");
    const slot = $(`[data-guest="${guestIndex}"]`);
    slot.animate([{ transform: "translateY(0)" }, { transform: "translateY(-8px)" }, { transform: "translateY(0)" }], { duration: 350 });
    dismissGuest(guestIndex);
    toast(`판매 +${money(Config.prices[appliance.type])}`);
  }

  function finishDay() {
    State.running = false;
    State.paused = false;
    clearInterval(State.dayTimer);
    clearGuestTimers();
    $("#startButton").style.display = "flex";
    $("#startButton strong").textContent = "다시 시작";
    toast(`영업 종료 · 매출 ${money(State.sales)}`);
  }

  function start() {
    clearInterval(State.dayTimer);
    resetGuests();
    Appliances.forEach(resetAppliance);
    State.running = true;
    State.paused = false;
    State.time = Config.daySeconds;
    State.sales = 0;
    State.guests = 0;
    $("#startButton").style.display = "none";
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
      return { kind: "food", id: appliance.id, image: assetUrl(FoodArt[appliance.type]) };
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
    ghost.classList.add("show");
  }

  function startDrag(event, element) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const data = payload(element);
    if (!data) return;
    event.preventDefault();
    element.setPointerCapture?.(event.pointerId);
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
    else target?.closest(".guest-slot.active .bubble")?.classList.add("drop-over");
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
    } else {
      const bubble = target?.closest(".guest-slot.active .bubble");
      if (bubble) serve(Appliances.find(item => item.id === data.id), Number(bubble.closest(".guest-slot").dataset.guest));
      else toast("완성 음식을 손님 주문 말풍선에 놓아주세요.");
    }

    State.drag = null;
    const ghost = $("#dragGhost");
    ghost.classList.remove("show", "food-drag");
    ghost.querySelector("img").removeAttribute("src");
    clearOver();
  }

  function bindDrag(element) {
    element.addEventListener("pointerdown", event => startDrag(event, element));
    element.addEventListener("pointermove", moveDrag);
    element.addEventListener("pointerup", endDrag);
    element.addEventListener("pointercancel", endDrag);
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
    if (!new URLSearchParams(location.search).has("qa")) return;
    const result = {};
    result.emptySeatsBeforeStart = $$(".guest-slot:not(.active)").length === 3 && $$(".guest-seat").length === 3;
    $("#startButton").click();
    result.startButton = State.running && getComputedStyle($("#startButton")).display === "none";
    activateGuest(0);
    result.arrivalState = $$(".guest-slot.active").length === 1 && $$(".guest-slot:not(.active)").length === 2;
    const topping = $("[data-item='dumpling']");
    const toppingPayload = payload(topping);
    showGhost(toppingPayload);
    result.ingredientDragArt = !!payload($("[data-item='noodle']")).image && !!toppingPayload.image;
    result.ingredientGhostIllustration = $("#dragGhost").classList.contains("show")
      && $("#dragGhost img").src === toppingPayload.image
      && !$("#dragGhost span").textContent;
    State.drag = null;
    $("#dragGhost").classList.remove("show", "food-drag");
    $("#dragGhost img").removeAttribute("src");

    dropItem(Appliances[0], "noodle");
    dropItem(Appliances[0], "egg");
    result.eggPose = $("#boreumi").dataset.pose === "egg";
    dropItem(Appliances[3], "dumpling");
    result.grillPose = $("#boreumi").dataset.pose === "grill";
    dropItem(Appliances[5], "oden");
    result.odenPose = $("#boreumi").dataset.pose === "oden";
    result.appliancesPersist = $$(".kitchen-sprite").length === 6;
    result.immediateCooking = Appliances[0].state === "cooking" && Appliances[3].state === "cooking" && Appliances[5].state === "cooking";

    await new Promise(resolve => setTimeout(resolve, 4400));
    result.independentTimers = Appliances[0].state === "ready" && Appliances[3].state === "ready" && Appliances[5].state === "ready";
    result.completeFoodArt = getComputedStyle($(".sprite-ramen")).backgroundImage.includes("food-ramen-v2") && getComputedStyle($(".sprite-dumpling")).backgroundImage.includes("food-dumpling-v2");
    const readyPayload = payload($(`[data-id="${Appliances[0].id}"]`));
    result.sameReadyDragArt = readyPayload?.image.includes("food-ramen-v2.png");
    showGhost(readyPayload);
    result.readyGhostSameIllustration = $("#dragGhost").classList.contains("food-drag")
      && $("#dragGhost img").src === readyPayload.image
      && !$("#dragGhost span").textContent;
    State.drag = null;
    $("#dragGhost").classList.remove("show", "food-drag");
    $("#dragGhost img").removeAttribute("src");
    serve(Appliances[0], 0);
    result.guestLeavesAfterServe = !Guests[0].active && !$(`[data-guest="0"]`).classList.contains("active");

    const stage = $("#stage").getBoundingClientRect();
    const dock = $(".dock").getBoundingClientRect();
    const left = $("#cookLeft").getBoundingClientRect();
    const right = $("#cookRight").getBoundingClientRect();
    result.landscape = stage.width > stage.height;
    result.noDockOverlap = dock.top >= Math.max(left.bottom, right.bottom) - 2;

    const output = document.createElement("pre");
    output.id = "qa-results";
    output.textContent = JSON.stringify(result, null, 2);
    output.style.cssText = "position:absolute;z-index:99999;left:0;top:0;width:360px;margin:0;padding:8px;background:white;color:black;font-size:11px;line-height:1.25;white-space:pre-wrap";
    $("#stage").append(output);
    document.documentElement.dataset.qa = Object.values(result).every(Boolean) ? "pass" : "fail";
  }

  build();
  $$(".ingredient,.appliance").forEach(bindDrag);
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
