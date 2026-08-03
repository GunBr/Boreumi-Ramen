(() => {
"use strict";

const STAGE_W = 1600;
const STAGE_H = 900;
const DAY_SECONDS = 90;
const COOK_MS = 8000;
const SAFE_MS = 4200;
const WARNING_MS = 1800;
const GUEST_PATIENCE = 30000;

const $ = s => document.querySelector(s);

let running = false;
let paused = false;
let timeLeft = DAY_SECONDS;
let sales = 0;
let guestCount = 0;
let dayTimer = null;
let guestTimer = null;
let guestLeft = GUEST_PATIENCE;
let guestLast = 0;
let drag = null;

const pot = {
  phase: "empty",
  hasEgg: false,
  timers: [],
  cookStart: 0,
  progressTimer: null
};

function resizeStage(){
  const scale = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  $("#stage").style.transform = `scale(${scale})`;
}
window.addEventListener("resize", resizeStage);
window.addEventListener("orientationchange", resizeStage);
resizeStage();

function won(v){ return v.toLocaleString("ko-KR") + "원"; }
function formatTime(v){
  return `${String(Math.floor(v / 60)).padStart(2,"0")}:${String(v % 60).padStart(2,"0")}`;
}
function renderHud(){
  $("#time").textContent = formatTime(timeLeft);
  $("#timeFill").style.width = `${Math.max(0, timeLeft / DAY_SECONDS * 100)}%`;
  $("#sales").textContent = won(sales);
  $("#guestCount").textContent = `${guestCount}명`;
}
function toast(text){
  const el = $("#toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("show"), 1400);
}
function boreumi(text){
  const el = $("#boreumiText");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(boreumi.t);
  boreumi.t = setTimeout(() => el.classList.remove("show"), 1400);
}

function clearPotTimers(){
  pot.timers.forEach(clearTimeout);
  pot.timers = [];
  clearInterval(pot.progressTimer);
  pot.progressTimer = null;
}
function renderPot(){
  const el = $("#pot");
  const img = $("#potImage");
  el.className = "pot";

  if (pot.phase === "empty") img.src = "./assets/foods/pot_empty.svg";
  if (pot.phase === "noodle") img.src = "./assets/foods/pot_noodle.svg";
  if (pot.phase === "water") img.src = "./assets/foods/pot_water.svg";
  if (["cooking","ready","warning"].includes(pot.phase)){
    img.src = pot.hasEgg ? "./assets/foods/ramen_egg.svg" : "./assets/foods/ramen.svg";
    el.classList.add(pot.phase);
  }
  if (pot.phase === "burnt"){
    img.src = pot.hasEgg ? "./assets/foods/ramen_egg.svg" : "./assets/foods/ramen.svg";
    el.classList.add("burnt");
  }
}
function resetPot(){
  clearPotTimers();
  pot.phase = "empty";
  pot.hasEgg = false;
  pot.cookStart = 0;
  $("#cookFill").style.width = "0%";
  renderPot();
}
function startBase(){
  if (!running) return toast("먼저 영업을 시작해 주세요.");
  if (pot.phase !== "empty") return toast("빈 냄비에만 면을 넣을 수 있어요.");

  pot.phase = "noodle";
  renderPot();
  toast("면 투입!");
  boreumi("물과 스프는 내가 넣을게!");

  pot.timers.push(setTimeout(() => {
    if (!running || pot.phase !== "noodle") return;
    pot.phase = "water";
    renderPot();
    boreumi("물을 붓는 중…");

    pot.timers.push(setTimeout(() => {
      if (!running || pot.phase !== "water") return;
      pot.phase = "cooking";
      pot.cookStart = Date.now();
      renderPot();
      boreumi("스프 투입! 계란을 넣어줘.");
      toast("조리 시작");

      pot.progressTimer = setInterval(() => {
        if (paused) return;
        const ratio = Math.min(1, (Date.now() - pot.cookStart) / COOK_MS);
        $("#cookFill").style.width = `${ratio * 100}%`;
      }, 80);

      pot.timers.push(setTimeout(() => {
        if (!running || pot.phase !== "cooking") return;
        clearInterval(pot.progressTimer);
        $("#cookFill").style.width = "100%";
        pot.phase = "ready";
        renderPot();
        toast(pot.hasEgg ? "계란라면 완성!" : "기본라면 완성!");
        boreumi("주문 말풍선으로 옮겨줘!");

        pot.timers.push(setTimeout(() => {
          if (pot.phase !== "ready") return;
          pot.phase = "warning";
          renderPot();
          toast("곧 타요!");

          pot.timers.push(setTimeout(() => {
            if (pot.phase !== "warning") return;
            pot.phase = "burnt";
            renderPot();
            toast("탔어요. 냄비를 눌러 폐기하세요.");
          }, WARNING_MS));
        }, SAFE_MS));
      }, COOK_MS));
    }, 800));
  }, 550));
}
function addEgg(){
  if (!running) return toast("먼저 영업을 시작해 주세요.");
  if (pot.phase !== "cooking") return toast("자동 물·스프 투입 후 계란을 넣어주세요.");
  if (pot.hasEgg) return toast("이미 계란이 들어갔어요.");
  pot.hasEgg = true;
  renderPot();
  toast("계란 추가!");
  boreumi("계란라면으로 만들게!");
}

function spawnGuest(){
  if (!running) return;
  guestCount++;
  guestLeft = GUEST_PATIENCE;
  guestLast = Date.now();
  $(".guest-area").classList.add("active");
  renderHud();
  toast("손님이 왔어요!");

  clearInterval(guestTimer);
  guestTimer = setInterval(() => {
    if (!running || paused) return;
    const now = Date.now();
    guestLeft -= now - guestLast;
    guestLast = now;
    const ratio = Math.max(0, guestLeft / GUEST_PATIENCE);
    $("#patienceFill").style.width = `${ratio * 100}%`;
    if (ratio <= 0) leaveGuest("손님이 기다리다 돌아갔어요.");
  }, 120);
}
function leaveGuest(message){
  clearInterval(guestTimer);
  $(".guest-area").classList.remove("active");
  $("#patienceFill").style.width = "100%";
  toast(message);
}
function serve(){
  if (!$(".guest-area").classList.contains("active")) return toast("지금은 손님이 없어요.");
  if (!["ready","warning"].includes(pot.phase)) return toast("완성된 라면만 서빙할 수 있어요.");
  if (!pot.hasEgg) return toast("손님 주문은 계란라면이에요.");

  sales += 3500;
  renderHud();
  resetPot();
  boreumi("맛있게 드세요!");
  leaveGuest("계란라면 판매! +3,500원");
  setTimeout(spawnGuest, 2300);
}

function finishDay(){
  running = false;
  paused = false;
  clearInterval(dayTimer);
  clearInterval(guestTimer);
  $(".guest-area").classList.remove("active");
  $("#startButton").style.display = "flex";
  $("#startButton strong").textContent = "다시 시작";
  toast(`영업 종료 · 매출 ${won(sales)}`);
}
function startDay(){
  clearInterval(dayTimer);
  clearInterval(guestTimer);
  resetPot();
  timeLeft = DAY_SECONDS;
  sales = 0;
  guestCount = 0;
  running = true;
  paused = false;
  renderHud();

  $("#startButton").style.display = "none";
  $(".guest-area").classList.remove("active");
  boreumi("오늘도 따뜻한 한 그릇!");
  toast("영업 시작!");

  dayTimer = setInterval(() => {
    if (paused) return;
    timeLeft--;
    renderHud();
    if (timeLeft <= 0) finishDay();
  }, 1000);

  setTimeout(spawnGuest, 1200);
}

function payloadFor(el){
  if (el.classList.contains("ingredient")){
    const key = el.dataset.key;
    return {
      type: "ingredient",
      key,
      label: key === "noodle" ? "면" : "계란",
      image: el.querySelector("img").src
    };
  }
  if (el.id === "pot" && ["ready","warning"].includes(pot.phase)){
    return {
      type: "pot",
      label: pot.hasEgg ? "계란라면" : "기본라면",
      image: $("#potImage").src
    };
  }
  return null;
}
function moveGhost(e){
  const g = $("#dragGhost");
  g.style.left = `${e.clientX}px`;
  g.style.top = `${e.clientY}px`;
}
function clearOver(){
  document.querySelectorAll(".drop-over").forEach(el => el.classList.remove("drop-over"));
}
function startDrag(e, el){
  if (e.pointerType === "mouse" && e.button !== 0) return;
  const payload = payloadFor(el);
  if (!payload) return;

  e.preventDefault();
  el.setPointerCapture?.(e.pointerId);
  drag = { id: e.pointerId, payload };
  $("#dragGhost img").src = payload.image;
  $("#dragGhost span").textContent = payload.label;
  $("#dragGhost").classList.add("show");
  moveGhost(e);
}
function moveDrag(e){
  if (!drag || e.pointerId !== drag.id) return;
  e.preventDefault();
  moveGhost(e);
  clearOver();
  const target = document.elementFromPoint(e.clientX, e.clientY);
  if (drag.payload.type === "ingredient"){
    target?.closest("#pot")?.classList.add("drop-over");
  } else {
    target?.closest("#orderBubble")?.classList.add("drop-over");
  }
}
function endDrag(e){
  if (!drag || e.pointerId !== drag.id) return;
  e.preventDefault();
  const target = document.elementFromPoint(e.clientX, e.clientY);

  if (drag.payload.type === "ingredient"){
    if (target?.closest("#pot")){
      drag.payload.key === "noodle" ? startBase() : addEgg();
    } else {
      toast("재료를 냄비에 놓아주세요.");
    }
  } else {
    target?.closest("#orderBubble") ? serve() : toast("완성된 라면을 주문 말풍선에 놓아주세요.");
  }

  $("#dragGhost").classList.remove("show");
  clearOver();
  drag = null;
}
function bindDrag(el){
  el.addEventListener("pointerdown", e => startDrag(e, el));
  el.addEventListener("pointermove", moveDrag);
  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);
}

document.querySelectorAll(".ingredient,#pot").forEach(bindDrag);

$("#pot").addEventListener("click", () => {
  if (pot.phase !== "burnt") return;
  sales = Math.max(0, sales - 700);
  renderHud();
  resetPot();
  toast("탄 음식 자동 폐기 · -700원");
  boreumi("다음엔 안 태울게!");
});

$("#startButton").addEventListener("click", startDay);
$("#pauseButton").addEventListener("click", () => {
  if (!running) return toast("영업 중에 사용할 수 있어요.");
  paused = true;
  $("#pauseOverlay").classList.remove("hidden");
});
$("#resumeButton").addEventListener("click", () => {
  paused = false;
  guestLast = Date.now();
  $("#pauseOverlay").classList.add("hidden");
});

renderHud();
renderPot();
})();