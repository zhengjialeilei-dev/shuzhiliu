import "./styles.css";
import { cityTasks } from "./data/city-tasks";
import type { CityState, TaskId, TaskValues } from "./core/types";
import { CityEngine } from "./services/city-engine";

const appNode = document.querySelector<HTMLDivElement>("#app");
if (!appNode) throw new Error("App root not found");
const app: HTMLDivElement = appNode;
const engine = new CityEngine();

function render(state: CityState, change?: "controls") {
  if (change === "controls" && app.querySelector(".task-sheet")) {
    updateTaskReadouts(state);
    return;
  }
  if (!state.started) {
    app.innerHTML = renderCover();
    document.querySelector("#start-city")?.addEventListener("click", () => engine.start());
    return;
  }

  app.innerHTML = `<main class="city-app">
    <header class="city-bar">
      <div class="brand"><span>MC</span><div><b>数学城市建造师</b><small>MATH CITY BUILDER</small></div></div>
      <div class="project-name"><span>项目</span><b>滨河新城</b></div>
      <div class="progress"><span>建设进度</span><b>${state.completed.size}<small>/4</small></b><i><em style="width:${state.completed.size * 25}%"></em></i></div>
    </header>
    <section class="city-workspace">
      <div class="map-toolbar"><button id="overview" class="active">◈ 总览</button><span>每一项城市决定，都需要数学作为依据。</span></div>
      <div class="city-map ${state.completed.size === 4 ? "complete" : ""}">
        ${renderCityScene(state)}
        ${cityTasks.map((task) => renderTaskMarker(task.id, state)).join("")}
        <div class="map-key"><span><i class="pending"></i>待规划</span><span><i class="built"></i>已建成</span></div>
      </div>
      <aside class="mission-rail">
        <div class="rail-heading"><span>CITY PLAN 01</span><h1>建设任务</h1><p>按任意顺序开始。完成四项计算，让新城正式运转。</p></div>
        <div class="mission-list">${cityTasks.map((task) => `<button data-task="${task.id}" class="${state.completed.has(task.id) ? "done" : ""}"><small>${state.completed.has(task.id) ? "✓" : task.order}</small><span><b>${task.reward}</b><em>${task.skill}</em></span><i>↗</i></button>`).join("")}</div>
        <div class="city-score"><span>城市活力</span><b>${35 + state.completed.size * 16}%</b><i><em style="width:${35 + state.completed.size * 16}%"></em></i></div>
      </aside>
    </section>
    ${state.activeTask ? renderTaskSheet(state.activeTask, state) : ""}
    ${state.showCertificate ? renderCertificate() : ""}
  </main>`;
  bind(state);
}

function updateTaskReadouts(state: CityState) {
  const v = state.values;
  // Never assign number-input values here: an empty/partially typed number
  // belongs to the student until submission, not to the rendered readout.
  app.querySelectorAll<HTMLInputElement>("[data-value]").forEach((input) => {
    const key = input.dataset.value as keyof TaskValues;
    input.closest("label")!.querySelector("b")!.textContent = `${v[key]}${key === "mapLength" ? "cm" : "m"}`;
  });
  const sheet = app.querySelector(".task-sheet")!;
  sheet.className = "task-sheet idle";
  sheet.querySelector(".task-feedback")?.remove();
  sheet.querySelector("#finish-task")?.remove();
  const check = sheet.querySelector<HTMLButtonElement>("#check-task")!;
  check.disabled = false;
  check.innerHTML = '提交施工方案<i>→</i>';
  if (state.activeTask === "park") {
    const plot = sheet.querySelector<HTMLElement>(".plot")!;
    plot.style.setProperty("--w", String(v.parkWidth));
    plot.style.setProperty("--h", String(v.parkHeight));
    plot.querySelector("span")!.textContent = `${v.parkWidth}m`;
    plot.querySelector("b")!.textContent = `${v.parkHeight}m`;
    const area = v.parkWidth * v.parkHeight;
    const perimeter = 2 * (v.parkWidth + v.parkHeight);
    const outputs = sheet.querySelectorAll(".live-math > span");
    outputs[0].querySelector("b")!.textContent = `${area} m²`;
    outputs[1].querySelector("b")!.textContent = `${perimeter} m`;
    outputs[0].querySelector("em")!.classList.toggle("pass", area >= 30);
    outputs[1].querySelector("em")!.classList.toggle("pass", perimeter <= 26);
  } else if (state.activeTask === "road") {
    const road = sheet.querySelector<HTMLElement>(".blueprint-road")!;
    road.style.width = `${v.mapLength/16*100}%`;
    road.querySelector("span")!.textContent = `${v.mapLength} cm`;
    sheet.querySelector(".equation b")!.textContent = `${v.mapLength} cm × 20 000 = ${(v.mapLength*200).toLocaleString()} m`;
    sheet.querySelector(".equation strong")!.textContent = `${(v.mapLength/5).toFixed(1)} km`;
  } else if (state.activeTask === "market") {
    sheet.querySelector(".total b")!.textContent = `¥${v.salePrice.toFixed(2)}`;
  }
}

function renderCover() {
  return `<main class="cover">
    <div class="cover-grid"></div><div class="river-ribbon"></div>
    <div class="cover-city" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i};--x:${8 + (i * 17) % 86}%;--y:${18 + (i * 29) % 67}%;--h:${35 + (i * 19) % 85}px"></i>`).join("")}</div>
    <div class="cover-copy"><div class="cover-brand"><span>MC</span>数学城市建造师</div><p>PROJECT 01 / RIVERSIDE CITY</p><h1>一座城市，<br><em>从数字中生长。</em></h1><div class="cover-brief">面积决定公园有多大，比例尺决定道路有多长。<br>今天，由你为滨河新城落下第一笔。</div><button id="start-city"><span>打开城市蓝图</span><i>→</i></button></div>
    <div class="cover-meta"><span>适用 · 小学高年级</span><span>4 项城市任务</span></div>
  </main>`;
}

function renderCityScene(state: CityState) {
  const built = (id: TaskId) => state.completed.has(id) ? "built" : "ghost";
  return `<div class="plan-grid"></div><div class="river"><i></i><b></b></div><div class="bridge ${built("road")}"><i></i><b></b></div>
    <div class="avenue horizontal ${built("road")}"><i></i><b></b><span class="vehicle v1"></span><span class="vehicle v2"></span></div><div class="avenue vertical ${built("road")}"><i></i></div>
    <div class="district residential"><div class="tower t1"></div><div class="tower t2"></div><div class="tower t3"></div><div class="small-block"></div></div>
    <div class="park-zone ${built("park")}"><div class="park-ground"><i></i><b></b><span></span></div><div class="park-trees">${Array.from({length:8},()=>"<i></i>").join("")}</div><label>中心公园</label></div>
    <div class="market-zone ${built("market")}"><div class="market-hall"><i></i><b></b></div><div class="market-stalls">${Array.from({length:4},()=>"<i></i>").join("")}</div><label>创意市集</label></div>
    <div class="school-zone ${built("school")}"><div class="school-main"><i></i><b></b></div><div class="playground"><i></i></div><label>未来学校</label></div>
    <div class="civic-zone"><div class="civic-building"><i></i></div><label>城市中心</label></div>
    <div class="map-title"><span>RIVER CITY / MASTER PLAN</span><b>滨河新城总体规划图</b></div>`;
}

function renderTaskMarker(id: TaskId, state: CityState) {
  const task = cityTasks.find((item) => item.id === id)!;
  return `<button class="task-marker ${id} ${state.completed.has(id) ? "done" : ""}" data-task="${id}"><i>${state.completed.has(id) ? "✓" : task.order}</i><span><b>${task.reward}</b><small>${state.completed.has(id) ? "已建成" : "点击规划"}</small></span></button>`;
}

function renderTaskSheet(id: TaskId, state: CityState) {
  const task = cityTasks.find((item) => item.id === id)!;
  return `<div class="sheet-shade" data-close></div><section class="task-sheet ${state.feedback}">
    <button class="sheet-close" data-close>×</button><header><span>${task.order} / ${task.district}</span><h2>${task.title}</h2><p>${task.brief}</p><div class="skill-tag">${task.skill}</div></header>
    <div class="task-work">${renderTaskWork(id, state)}</div>
    ${renderFeedback(id, state)}
    <footer><button id="check-task" class="check" ${state.feedback === "correct" ? "disabled" : ""}>${state.feedback === "wrong" ? "重新验算" : "提交施工方案"}<i>→</i></button>${state.feedback === "correct" ? `<button id="finish-task" class="finish">落成${task.reward} <i>✓</i></button>` : ""}</footer>
  </section>`;
}

function renderTaskWork(id: TaskId, state: CityState) {
  const v = state.values;
  if (id === "park") {
    const area = v.parkWidth * v.parkHeight;
    const perimeter = 2 * (v.parkWidth + v.parkHeight);
    return `<div class="park-planner"><div class="plot" style="--w:${v.parkWidth};--h:${v.parkHeight}"><div><span>${v.parkWidth}m</span><b>${v.parkHeight}m</b></div></div><div class="task-controls">${slider("parkWidth","公园长度",v.parkWidth,4,8,1,"m")}${slider("parkHeight","公园宽度",v.parkHeight,3,7,1,"m")}<div class="live-math"><span><small>面积</small><b>${area} m²</b><em class="${area>=30?"pass":""}">至少 30m²</em></span><span><small>周长</small><b>${perimeter} m</b><em class="${perimeter<=26?"pass":""}">最多 26m</em></span></div></div></div>`;
  }
  if (id === "road") {
    const realKm = v.mapLength * 20000 / 100000;
    return `<div class="road-planner"><div class="scale-drawing"><div class="ruler">${Array.from({length:17},(_,i)=>`<i style="left:${i*6.25}%"><small>${i}</small></i>`).join("")}</div><div class="blueprint-road" style="width:${v.mapLength/16*100}%"><span>${v.mapLength} cm</span></div></div><div class="task-controls">${slider("mapLength","蓝图长度",v.mapLength,6,16,1,"cm")}<div class="equation"><span>比例尺 1 : 20 000</span><b>${v.mapLength} cm × 20 000 = ${(v.mapLength*200).toLocaleString()} m</b><p>对应实际长度 <strong>${realKm.toFixed(1)} km</strong></p></div></div></div>`;
  }
  if (id === "market") {
    return `<div class="market-planner"><div class="receipt"><span>RIVER MARKET</span><h3>开业商品</h3><div><small>原价</small><b>¥240.00</b></div><div><small>优惠 15%</small><b>− ¥${(240*.15).toFixed(2)}</b></div><i></i><div class="total"><small>应付</small><b>¥${v.salePrice.toFixed(2)}</b></div></div><div class="number-entry"><label for="salePrice">输入你核算的应付金额</label><div><span>¥</span><input id="salePrice" type="number" min="0" max="240" value="${v.salePrice}"></div><p>提示：优惠金额 = 原价 × 15%</p></div></div>`;
  }
  const current = 480 + 360 + 240;
  return `<div class="school-planner"><div class="population-chart"><div style="--value:80%"><span>480</span><i></i><small>小学</small></div><div style="--value:60%"><span>360</span><i></i><small>中学</small></div><div style="--value:40%"><span>240</span><i></i><small>幼儿园</small></div></div><div class="number-entry"><div class="seat-summary"><span>现有需求 <b>${current}</b></span><span>规划目标 <b>1200</b></span></div><label for="extraSeats">还需增加多少个学位？</label><div><input id="extraSeats" type="number" min="0" max="500" value="${v.extraSeats}"><span>个</span></div><p>480 + 360 + 240 + ？ = 1200</p></div></div>`;
}

function slider(id: keyof TaskValues, label: string, value: number, min: number, max: number, step: number, unit: string) {
  return `<label class="slider"><span>${label}<b>${value}${unit}</b></span><input data-value="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
}

function renderFeedback(id: TaskId, state: CityState) {
  if (state.feedback === "idle") return "";
  const success = state.feedback === "correct";
  const explanations: Record<TaskId, string> = {
    park: success ? `方案同时满足面积不小于 30m²，且围栏长度不超过 26m。` : `两个条件要同时满足：面积至少 30m²，周长最多 26m。`,
    road: success ? `2.4km = 240000cm，240000 ÷ 20000 = 12cm。` : `先把 2.4km 换算成 240000cm，再按照比例尺缩小。`,
    market: success ? `优惠 240×15%=36 元，应付 240−36=204 元。` : `15% 是优惠比例，不是最终付款比例。`,
    school: success ? `480+360+240=1080，1200−1080=120 个学位。` : `先合计三类儿童人数，再用规划目标减去它。`,
  };
  return `<div class="task-feedback"><i>${success ? "✓" : "!"}</i><div><b>${success ? "方案通过数学验算" : "方案还需调整"}</b><p>${explanations[id]}</p></div></div>`;
}

function renderCertificate() {
  return `<div class="certificate-shade"><section class="certificate"><div class="city-seal">MC</div><span>RIVER CITY / COMPLETION REPORT</span><h2>滨河新城<br>正式亮灯。</h2><p>你用面积规划空间，用比例尺连接城市，用百分数核对交易，用统计为社区做出决策。数学不只在答案里，它就在城市的每一条道路上。</p><div class="certificate-stats"><span><b>4</b>项工程</span><span><b>100%</b>城市验收</span><span><b>4</b>类数学能力</span></div><div class="certificate-actions"><button id="view-city">回到城市 <i>→</i></button><button id="restart">重新规划</button></div></section></div>`;
}

function bind(state: CityState) {
  document.querySelectorAll<HTMLElement>("[data-task]").forEach((element) => element.addEventListener("click", () => engine.openTask(element.dataset.task as TaskId)));
  document.querySelectorAll("[data-close]").forEach((element) => element.addEventListener("click", () => engine.closeTask()));
  document.querySelectorAll<HTMLInputElement>("[data-value]").forEach((element) => element.addEventListener("input", () => engine.updateValue(element.dataset.value as keyof TaskValues, Number(element.value))));
  document.querySelector("#salePrice")?.addEventListener("input", (event) => engine.updateValue("salePrice", Number((event.target as HTMLInputElement).value)));
  document.querySelector("#extraSeats")?.addEventListener("input", (event) => engine.updateValue("extraSeats", Number((event.target as HTMLInputElement).value)));
  document.querySelector("#check-task")?.addEventListener("click", () => engine.checkActiveTask());
  document.querySelector("#finish-task")?.addEventListener("click", () => engine.finishTask());
  document.querySelector("#view-city")?.addEventListener("click", () => engine.dismissCertificate());
  document.querySelector("#restart")?.addEventListener("click", () => engine.restart());
  document.querySelector("#overview")?.addEventListener("click", () => document.querySelector(".city-map")?.scrollIntoView({ behavior: "smooth" }));
  if (state.feedback === "correct") document.querySelector(".task-sheet")?.scrollTo({ top: 9999, behavior: "smooth" });
}

engine.subscribe(render);
