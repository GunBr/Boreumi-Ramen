(() => {
"use strict";

const CFG = {
  daySeconds: 180,
  autoWaterMs: 700,
  autoSoupMs: 700,
  cookMs: 10000,
  safeMs: 5000,
  warningMs: 2200,
  guestPatienceMs: 45000,
  salePrice: 3500,
  wasteCost: 700
};

const NAMES = {
  noodle:"면", egg:"계란", cheese:"치즈", greenOnion:"대파",
  kimchi:"김치", riceCake:"떡", dumpling:"만두", sausage:"소시지", chili:"청양고추"
};

const ICONS = Object.fromEntries(Object.keys(NAMES).map(k => [k, `./assets/foods/${k}.png`]));
const RECIPE_ORDER = ["egg","cheese","greenOnion","kimchi","riceCake","dumpling","sausage","chili"];

const RECIPES = {
  "": {name:"기본라면", image:"ramen_base.png"},
  "egg": {name:"계란라면", image:"ramen_egg.png"},
  "cheese": {name:"치즈라면", image:"ramen_cheese.png"},
  "greenOnion": {name:"대파라면", image:"ramen_greenOnion.png"},
  "kimchi": {name:"김치라면", image:"ramen_kimchi.png"},
  "chili": {name:"청양고추라면", image:"ramen_chili.png"},
  "egg|cheese": {name:"계란치즈라면", image:"ramen_egg_cheese.png"},
  "egg|greenOnion": {name:"계란대파라면", image:"ramen_egg_greenOnion.png"},
  "egg|kimchi": {name:"계란김치라면", image:"ramen_egg_kimchi.png"},
  "cheese|greenOnion": {name:"치즈대파라면", image:"ramen_cheese_greenOnion.png"},
  "cheese|kimchi": {name:"치즈김치라면", image:"ramen_cheese_kimchi.png"},
  "greenOnion|kimchi": {name:"대파김치라면", image:"ramen_greenOnion_kimchi.png"},
  "egg|chili": {name:"청양계란라면", image:"ramen_chili_egg.png"},
  "chili|kimchi": {name:"매운김치라면", image:"ramen_chili_kimchi.png"},
  "chili|greenOnion": {name:"청양대파라면", image:"ramen_chili_greenOnion.png"},
  "egg|sausage": {name:"소시지계란라면", image:"ramen_sausage_egg.png"},
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let running = false;
let paused = false;
let remaining = CFG.daySeconds;
let sales = 0;
let guestCount = 0;
let mainTimer = null;
let activeGuest = null;
let drag = null;

function newPot(id){
  return {id, phase:"empty", toppings:[], timers:[], cookStarted:0, progressTimer:null};
}
const pots = {pot1:newPot("pot1"), pot2:newPot("pot2")};

function formatTime(s){
  return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}
function won(n){ return n.toLocaleString("ko-KR") + "원"; }

function renderHud(){
  $("#time").textContent = formatTime(remaining);
  $("#timeFill").style.width = `${remaining / CFG.daySeconds * 100}%`;
  $("#sales").textContent = won(sales);
  $("#guestCount").textContent = `${guestCount}명`;
}
function toast(msg){
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("show"), 1550);
}
function boreumi(msg){
  const el = $("#boreumiBubble");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(boreumi.t);
  boreumi.t = setTimeout(() => el.classList.remove("show"), 1400);
}

function clearPotTimers(p){
  p.timers.forEach(clearTimeout);
  p.timers = [];
  clearInterval(p.progressTimer);
  p.progressTimer = null;
}

function recipeKey(toppings){
  return [...toppings].sort((a,b)=>RECIPE_ORDER.indexOf(a)-RECIPE_ORDER.indexOf(b)).join("|");
}
function currentRecipe(p){
  return RECIPES[recipeKey(p.toppings)] || null;
}

function potEl(p){ return document.querySelector(`[data-pot="${p.id}"]`); }

function renderPot(p){
  const el = potEl(p);
  const img = el.querySelector(".pot-image");
  el.className = "pot-zone";
  if (p.phase !== "empty") el.classList.add(p.phase);

  if (p.phase === "empty") img.src = "./assets/foods/stage_empty.png";
  else if (p.phase === "noodle") img.src = "./assets/foods/stage_noodle.png";
  else if (p.phase === "water") img.src = "./assets/foods/stage_water.png";
  else if (p.phase === "soup") img.src = "./assets/foods/stage_soup.png";
  else if (p.phase === "burnt") img.src = "./assets/foods/stage_burnt.png";
  else {
    const rec = currentRecipe(p);
    img.src = rec ? `./assets/foods/${rec.image}` : "./assets/foods/stage_boiling.png";
  }
}

function resetPot(p){
  clearPotTimers(p);
  p.phase = "empty";
  p.toppings = [];
  p.cookStarted = 0;
  potEl(p).querySelector(".cook-progress span").style.width = "0%";
  renderPot(p);
}

function beginAutoBase(p){
  p.phase = "noodle";
  renderPot(p);
  boreumi("물과 스프는 내가 넣을게!");
  toast("면 투입!");

  p.timers.push(setTimeout(() => {
    if (!running || p.phase !== "noodle") return;
    p.phase = "water";
    renderPot(p);
    boreumi("물을 붓는 중…");
    p.timers.push(setTimeout(() => {
      if (!running || p.phase !== "water") return;
      p.phase = "soup";
      renderPot(p);
      boreumi("스프도 자동 투입!");
      p.timers.push(setTimeout(() => startCooking(p), CFG.autoSoupMs));
    }, CFG.autoWaterMs));
  }, 350));
}

function startCooking(p){
  if (!running) return;
  p.phase = "cooking";
  p.cookStarted = Date.now();
  renderPot(p);
  boreumi("이제 토핑을 넣어줘!");
  toast("조리 시작 · 토핑 최대 2개");

  const bar = potEl(p).querySelector(".cook-progress span");
  clearInterval(p.progressTimer);
  p.progressTimer = setInterval(() => {
    if (paused) return;
    const ratio = Math.min(1, (Date.now() - p.cookStarted) / CFG.cookMs);
    bar.style.width = `${ratio * 100}%`;
  }, 80);

  p.timers.push(setTimeout(() => {
    if (!running || p.phase !== "cooking") return;
    clearInterval(p.progressTimer);
    bar.style.width = "100%";
    p.phase = "ready";
    renderPot(p);
    boreumi("완성! 주문 말풍선으로 옮겨줘.");
    toast(`${currentRecipe(p)?.name || "라면"} 완성`);

    p.timers.push(setTimeout(() => {
      if (p.phase !== "ready") return;
      p.phase = "warning";
      renderPot(p);
      toast("곧 타요!");

      p.timers.push(setTimeout(() => {
        if (p.phase !== "warning") return;
        p.phase = "burnt";
        renderPot(p);
        toast("탔어요! 냄비를 눌러 폐기하세요.");
      }, CFG.warningMs));
    }, CFG.safeMs));
  }, CFG.cookMs));
}

function addIngredient(key, potId){
  if (!running) return toast("먼저 영업을 시작해 주세요.");
  const p = pots[potId];

  if (key === "noodle"){
    if (p.phase !== "empty") return toast("빈 냄비에만 면을 넣을 수 있어요.");
    beginAutoBase(p);
    return;
  }

  if (!["cooking"].includes(p.phase)) return toast("면을 먼저 넣고 자동 조리가 시작되면 토핑을 넣어주세요.");
  if (p.toppings.includes(key)) return toast("이미 넣은 토핑이에요.");
  if (p.toppings.length >= 2) return toast("토핑은 최대 2개까지 가능해요.");

  const next = [...p.toppings, key];
  const rec = RECIPES[recipeKey(next)];
  if (!rec) return toast("등록되지 않은 레시피 조합이에요.");

  p.toppings = next;
  renderPot(p);
  boreumi(`${NAMES[key]} 추가!`);
  toast(`${rec.name} 조리 중`);
}

const orders = Object.entries(RECIPES)
  .filter(([k]) => ["","egg","greenOnion","kimchi","chili","egg|cheese","egg|greenOnion","egg|kimchi","chili|kimchi","chili|greenOnion"].includes(k))
  .map(([key,v]) => ({key, ...v, toppings:key ? key.split("|") : []}));

function spawnGuest(){
  if (!running || activeGuest) return;
  const seats = $$(".seat");
  const seatIndex = Math.floor(Math.random() * seats.length);
  const seat = seats[seatIndex];
  const customerFiles = ["office.png","student.png","rider.png"];
  const order = orders[Math.floor(Math.random() * orders.length)];

  activeGuest = {
    seatIndex, order,
    remaining: CFG.guestPatienceMs,
    last: Date.now(),
    interval: null
  };
  guestCount++;
  renderHud();

  seat.querySelector(".guest").src = `./assets/customers/${customerFiles[Math.floor(Math.random()*customerFiles.length)]}`;
  const box = seat.querySelector(".order-icons");
  box.innerHTML = "";
  const ramen = document.createElement("img");
  ramen.src = `./assets/foods/${order.image}`;
  ramen.alt = order.name;
  box.appendChild(ramen);

  seat.classList.add("active");
  seat.querySelector(".patience span").style.width = "100%";
  toast("손님이 왔어요!");

  activeGuest.interval = setInterval(() => {
    if (!activeGuest || paused) return;
    const now = Date.now();
    activeGuest.remaining -= now - activeGuest.last;
    activeGuest.last = now;
    const ratio = Math.max(0, activeGuest.remaining / CFG.guestPatienceMs);
    seat.querySelector(".patience span").style.width = `${ratio*100}%`;
    if (ratio <= 0) leaveGuest("손님이 기다리다 돌아갔어요.");
  }, 160);
}

function leaveGuest(msg){
  if (!activeGuest) return;
  const seat = $$(".seat")[activeGuest.seatIndex];
  clearInterval(activeGuest.interval);
  seat.classList.remove("active");
  seat.querySelector(".guest").removeAttribute("src");
  seat.querySelector(".order-icons").innerHTML = "";
  seat.querySelector(".patience span").style.width = "0%";
  activeGuest = null;
  toast(msg);
  if (running) setTimeout(spawnGuest, 2100);
}

function serve(p, seat){
  if (!activeGuest) return toast("서빙할 손님이 없어요.");
  if (!["ready","warning"].includes(p.phase)) return toast("완성된 라면만 서빙할 수 있어요.");
  if ($$(".seat").indexOf(seat) !== activeGuest.seatIndex) return toast("주문한 손님에게 전달해 주세요.");

  const made = currentRecipe(p);
  if (!made || made.name !== activeGuest.order.name) return toast(`주문은 ${activeGuest.order.name}이에요.`);

  sales += CFG.salePrice;
  renderHud();
  resetPot(p);
  boreumi("맛있게 드세요!");
  leaveGuest(`${made.name} 판매! +${won(CFG.salePrice)}`);
}

function getPayload(el){
  if (el.classList.contains("item")){
    return {kind:"ingredient", key:el.dataset.key, label:NAMES[el.dataset.key], img:el.querySelector("img").src};
  }
  if (el.classList.contains("pot-zone")){
    const p = pots[el.dataset.pot];
    if (["ready","warning"].includes(p.phase)){
      const rec = currentRecipe(p);
      return {kind:"pot", pot:p, label:rec?.name || "라면", img:potEl(p).querySelector(".pot-image").src};
    }
  }
  return null;
}

function moveGhost(e){
  const g = $("#dragGhost");
  g.style.left = `${e.clientX}px`;
  g.style.top = `${e.clientY}px`;
}
function clearOver(){ $$(".drop-over").forEach(x => x.classList.remove("drop-over")); }

function startDrag(e, el){
  if (e.pointerType === "mouse" && e.button !== 0) return;
  const payload = getPayload(el);
  if (!payload) return;
  e.preventDefault();
  el.setPointerCapture?.(e.pointerId);
  drag = {id:e.pointerId, source:el, payload};
  const ghost = $("#dragGhost");
  ghost.querySelector("img").src = payload.img;
  ghost.querySelector("span").textContent = payload.label;
  ghost.classList.add("show");
  moveGhost(e);
}
function moveDrag(e){
  if (!drag || e.pointerId !== drag.id) return;
  e.preventDefault();
  moveGhost(e);
  clearOver();
  const target = document.elementFromPoint(e.clientX,e.clientY);
  if (!target) return;

  if (drag.payload.kind === "ingredient"){
    target.closest(".pot-zone")?.classList.add("drop-over");
  } else {
    target.closest(".seat.active .order-bubble")?.classList.add("drop-over");
  }
}
function endDrag(e){
  if (!drag || e.pointerId !== drag.id) return;
  e.preventDefault();
  const target = document.elementFromPoint(e.clientX,e.clientY);
  const pl = drag.payload;

  if (pl.kind === "ingredient"){
    const pot = target?.closest(".pot-zone");
    pot ? addIngredient(pl.key,pot.dataset.pot) : toast("재료를 냄비에 놓아주세요.");
  } else {
    const bubble = target?.closest(".seat.active .order-bubble");
    bubble ? serve(pl.pot,bubble.closest(".seat")) : toast("완성된 라면을 주문 말풍선에 놓아주세요.");
  }

  $("#dragGhost").classList.remove("show");
  clearOver();
  drag = null;
}
function bindDrag(el){
  el.addEventListener("pointerdown",e=>startDrag(e,el));
  el.addEventListener("pointermove",moveDrag);
  el.addEventListener("pointerup",endDrag);
  el.addEventListener("pointercancel",endDrag);
}

function discardIfBurnt(el){
  const p = pots[el.dataset.pot];
  if (p.phase !== "burnt") return;
  sales = Math.max(0,sales-CFG.wasteCost);
  renderHud();
  resetPot(p);
  boreumi("다음엔 안 태울게!");
  toast(`탄 음식 자동 폐기 · -${won(CFG.wasteCost)}`);
}

function resetDay(){
  remaining = CFG.daySeconds; sales = 0; guestCount = 0;
  if (activeGuest){clearInterval(activeGuest.interval);activeGuest=null;}
  $$(".seat").forEach(s=>{s.classList.remove("active");s.querySelector(".guest").removeAttribute("src");s.querySelector(".order-icons").innerHTML="";});
  Object.values(pots).forEach(resetPot);
  renderHud();
}

function finishDay(){
  running=false; paused=false; clearInterval(mainTimer);
  if(activeGuest) leaveGuest("오늘 영업이 끝났어요.");
  $("#startButton").hidden=false;
  $("#startButton strong").textContent="다시 시작";
  toast(`영업 종료 · 매출 ${won(sales)}`);
}

function startDay(){
  clearInterval(mainTimer);
  resetDay();
  running=true;paused=false;
  $("#startButton").hidden=true;
  boreumi("오늘도 따뜻한 한 그릇!");
  toast("영업 시작!");
  mainTimer=setInterval(()=>{
    if(paused)return;
    remaining--;
    renderHud();
    if(remaining<=0)finishDay();
  },1000);
  setTimeout(spawnGuest,1800);
}

$("#startButton").addEventListener("click",startDay);
$("#pauseButton").addEventListener("click",()=>{
  if(!running)return toast("영업 중에 사용할 수 있어요.");
  paused=true;$("#pauseOverlay").classList.remove("hidden");
});
$("#resumeButton").addEventListener("click",()=>{
  paused=false;
  if(activeGuest)activeGuest.last=Date.now();
  $("#pauseOverlay").classList.add("hidden");
});
$$(".item,.pot-zone").forEach(bindDrag);
$$(".pot-zone").forEach(el=>el.addEventListener("click",()=>discardIfBurnt(el)));

Object.values(pots).forEach(renderPot);
renderHud();
})();