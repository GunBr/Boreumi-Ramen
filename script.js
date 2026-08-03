(() => {
"use strict";
const CFG={day:180,cook:10000,safe:5000,warn:2000,patience:42000,price:3500,waste:700};
const ingredientNames={noodle:"면",soup:"스프",egg:"계란",greenOnion:"대파",riceCake:"떡",kimchi:"김치"};
const assetMap={
 noodle:"./assets/foods/noodle.svg",soup:"./assets/foods/soup.svg",egg:"./assets/foods/egg.svg",
 greenOnion:"./assets/foods/greenOnion.svg",riceCake:"./assets/foods/riceCake.svg",kimchi:"./assets/foods/kimchi.svg",
 ramen:"./assets/foods/ramen.svg",soju:"./assets/drinks/soju.svg",beer:"./assets/drinks/beer.svg",somaek:"./assets/drinks/somaek.svg",
 kimchiPancake:"./assets/sides/kimchiPancake.svg",eggRoll:"./assets/sides/eggRoll.svg",dumpling:"./assets/sides/dumpling.svg",sausage:"./assets/sides/sausage.svg"
};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let running=false,paused=false,remain=CFG.day,sales=0,guestCount=0,timer=null,active=null,drag=null;
const pots={pot1:newPot("pot1"),pot2:newPot("pot2")};
function newPot(id){return{id,phase:"empty",ingredients:[],timers:[]}}
function won(n){return n.toLocaleString("ko-KR")+"원"}
function show(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(show.t);show.t=setTimeout(()=>t.classList.remove("show"),1500)}
function hud(){ $("#time").textContent=`${String(Math.floor(remain/60)).padStart(2,"0")}:${String(remain%60).padStart(2,"0")}`;$("#timeFill").style.width=(remain/CFG.day*100)+"%";$("#sales").textContent=won(sales);$("#guests").textContent=guestCount+"명"}
function clearPotTimers(p){p.timers.forEach(clearTimeout);p.timers=[]}
function renderPot(p){
 const el=$(`[data-pot="${p.id}"]`),img=el.querySelector(".pot-art"),lab=el.querySelector(".pot-label");
 el.className="burner drop-pot";
 if(p.phase!=="empty")el.classList.add("has-pot",p.phase);
 if(p.phase==="empty"){img.removeAttribute("src");lab.textContent=""}
 else{img.src="./assets/ui/pot.svg";lab.textContent=p.ingredients.map(x=>ingredientNames[x]).join(" + ")}
}
function resetPot(p){clearPotTimers(p);p.phase="empty";p.ingredients=[];renderPot(p)}
function addIngredient(key,potId){
 if(!running)return show("먼저 영업을 시작해 주세요.");
 const p=pots[potId];
 if(["ready","warning","burnt"].includes(p.phase))return show("지금은 재료를 넣을 수 없어요.");
 if(p.ingredients.includes(key))return show("이미 들어간 재료예요.");
 const topping=p.ingredients.filter(x=>!["noodle","soup"].includes(x)).length;
 if(!["noodle","soup"].includes(key)&&topping>=2)return show("토핑은 최대 2개까지 가능해요.");
 if(p.phase==="empty"&&p.ingredients.length===0){p.phase="assembling";renderPot(p)}
 p.ingredients.push(key);renderPot(p);show(ingredientNames[key]+" 투입");
 if(p.ingredients.includes("noodle")&&p.ingredients.includes("soup")&&p.phase==="assembling")startCook(p);
}
function startCook(p){
 p.phase="cooking";renderPot(p);show("라면 조리 시작!");
 p.timers.push(setTimeout(()=>{if(!running)return;p.phase="ready";renderPot(p);show("라면 완성! 손님 말풍선으로 끌어주세요.");
 p.timers.push(setTimeout(()=>{if(p.phase!=="ready")return;p.phase="warning";renderPot(p);show("곧 타요!");
 p.timers.push(setTimeout(()=>{if(p.phase!=="warning")return;p.phase="burnt";renderPot(p);show("탔어요. 냄비를 눌러 폐기하세요.");},CFG.warn));},CFG.safe));},CFG.cook));
}
function recipe(p){
 const tops=p.ingredients.filter(x=>!["noodle","soup"].includes(x));
 if(!tops.length)return"일반라면";
 if(tops.length===1)return({egg:"계란라면",greenOnion:"대파라면",riceCake:"떡라면",kimchi:"김치라면"})[tops[0]]||"토핑라면";
 return tops.map(x=>ingredientNames[x]).join("·")+"라면";
}
function spawnGuest(){
 if(!running||active)return;
 const seats=$$(".seat"),seatIndex=Math.floor(Math.random()*seats.length),seat=seats[seatIndex];
 const orders=[{name:"일반라면",icons:["ramen"]},{name:"계란라면",icons:["ramen","egg"]},{name:"대파라면",icons:["ramen","greenOnion"]}];
 const order=orders[Math.floor(Math.random()*orders.length)];
 const avatars=["guest_office","guest_student","guest_cap"],avatar=avatars[Math.floor(Math.random()*avatars.length)];
 active={seatIndex,order,remain:CFG.patience,last:Date.now(),interval:null};guestCount++;
 seat.querySelector(".guest").src=`./assets/characters/${avatar}.svg`;
 const box=seat.querySelector(".order-icons");box.innerHTML="";
 order.icons.forEach((k,i)=>{if(i){const plus=document.createElement("span");plus.className="plus";plus.textContent="+";box.appendChild(plus)}const im=document.createElement("img");im.src=assetMap[k];im.alt="";box.appendChild(im)});
 seat.classList.add("active");seat.querySelector(".patience span").style.width="100%";hud();show("손님이 왔어요!");
 active.interval=setInterval(()=>{if(!active||paused)return;const now=Date.now();active.remain-=now-active.last;active.last=now;const r=Math.max(0,active.remain/CFG.patience);seat.querySelector(".patience span").style.width=(r*100)+"%";if(r<=0)leave("손님이 돌아갔어요.");},180);
}
function leave(msg){
 if(!active)return;const seat=$$(".seat")[active.seatIndex];clearInterval(active.interval);seat.classList.remove("active");seat.querySelector(".guest").removeAttribute("src");seat.querySelector(".order-icons").innerHTML="";seat.querySelector(".patience span").style.width="0%";active=null;show(msg);if(running)setTimeout(spawnGuest,2200);
}
function serve(p,seat){
 if(!active)return show("손님이 없어요.");
 if(!["ready","warning"].includes(p.phase))return show("완성된 라면만 전달할 수 있어요.");
 if($$(".seat").indexOf(seat)!==active.seatIndex)return show("주문한 손님에게 주세요.");
 const made=recipe(p);if(made!==active.order.name)return show("주문과 다른 메뉴예요.");
 sales+=CFG.price;hud();resetPot(p);leave(made+" 판매! +"+won(CFG.price));
}
function payload(el){
 if(el.dataset.type)return{kind:el.dataset.type,key:el.dataset.key,label:el.querySelector("span").textContent,img:el.querySelector("img").src};
 if(el.dataset.pot){const p=pots[el.dataset.pot];if(["ready","warning"].includes(p.phase))return{kind:"pot",pot:p,label:recipe(p),img:"./assets/foods/ramen.svg"};if(p.phase==="burnt"){sales=Math.max(0,sales-CFG.waste);hud();resetPot(p);show("폐기 비용 -"+won(CFG.waste))}}
 return null;
}
function startDrag(e,el){
 if(e.pointerType==="mouse"&&e.button!==0)return;const pl=payload(el);if(!pl)return;e.preventDefault();drag={id:e.pointerId,source:el,payload:pl};el.setPointerCapture?.(e.pointerId);const g=$("#ghost");g.querySelector("img").src=pl.img;g.querySelector("span").textContent=pl.label;g.classList.add("show");moveGhost(e);
}
function moveGhost(e){const g=$("#ghost");g.style.left=e.clientX+"px";g.style.top=e.clientY+"px"}
function clearOver(){$$(".drop-over").forEach(x=>x.classList.remove("drop-over"))}
function moveDrag(e){if(!drag||e.pointerId!==drag.id)return;e.preventDefault();moveGhost(e);clearOver();const t=document.elementFromPoint(e.clientX,e.clientY);if(!t)return;if(drag.payload.kind==="ingredient"){const z=t.closest(".drop-pot");if(z)z.classList.add("drop-over")}else if(drag.payload.kind==="pot"){const s=t.closest(".seat.active .speech");if(s)s.classList.add("drop-over")}}
function endDrag(e){
 if(!drag||e.pointerId!==drag.id)return;e.preventDefault();const t=document.elementFromPoint(e.clientX,e.clientY),pl=drag.payload;
 if(pl.kind==="ingredient"){const z=t?.closest(".drop-pot");z?addIngredient(pl.key,z.dataset.pot):show("재료를 냄비에 놓아주세요.")}
 else if(pl.kind==="pot"){const s=t?.closest(".seat.active .speech");s?serve(pl.pot,s.closest(".seat")):show("완성된 라면을 주문 말풍선에 놓아주세요.")}
 $("#ghost").classList.remove("show");clearOver();drag=null;
}
function bind(el){el.addEventListener("pointerdown",e=>startDrag(e,el));el.addEventListener("pointermove",moveDrag);el.addEventListener("pointerup",endDrag);el.addEventListener("pointercancel",endDrag)}
function resetDay(){sales=0;guestCount=0;remain=CFG.day;if(active){clearInterval(active.interval);active=null}$$(".seat").forEach(s=>{s.classList.remove("active");s.querySelector(".guest").removeAttribute("src");s.querySelector(".order-icons").innerHTML=""});Object.values(pots).forEach(resetPot);hud()}
function start(){clearInterval(timer);resetDay();running=true;paused=false;$("#start").hidden=true;timer=setInterval(()=>{if(paused)return;remain--;hud();if(remain<=0){running=false;clearInterval(timer);if(active)leave("영업 종료");$("#start").hidden=false;show("영업 종료 · 매출 "+won(sales))}},1000);show("영업 시작!");setTimeout(spawnGuest,2000)}
$("#start").addEventListener("click",start);$("#pause").addEventListener("click",()=>{if(!running)return;paused=!paused;show(paused?"일시정지":"계속 영업");if(active)active.last=Date.now()});
$("#trash").addEventListener("click",()=>{const p=Object.values(pots).find(x=>x.phase!=="empty");if(!p)return show("폐기할 음식이 없어요.");sales=Math.max(0,sales-CFG.waste);hud();resetPot(p);show("폐기 비용 -"+won(CFG.waste))});
$$(".asset-item,.drop-pot").forEach(bind);hud();Object.values(pots).forEach(renderPot);
})();