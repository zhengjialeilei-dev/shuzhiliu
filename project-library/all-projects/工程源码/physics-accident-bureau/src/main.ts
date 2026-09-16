import "./styles.css";
import { evidence, questions, roadLabels, verdicts } from "./data/case-data";
import type { InvestigationState, RoadCondition } from "./core/types";
import { InvestigationStore } from "./services/investigation-store";

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) throw new Error("App root not found");
const root: HTMLDivElement = appRoot;

const store = new InvestigationStore();
const fmt = (value: number) => value.toFixed(1);

function render(state: InvestigationState, change?: "controls") {
  if (change === "controls" && root.querySelector(".simulator")) {
    updateLabReadouts(state);
    return;
  }
  if (!state.entered) {
    root.innerHTML = renderCover();
    document.querySelector("#enter")?.addEventListener("click", () => store.enter());
    return;
  }

  const result = store.currentResult;
  const verdict = verdicts.find((item) => item.id === state.verdictId);
  root.innerHTML = `<main class="bureau">
    <header class="topbar">
      <div class="identity"><span>PA</span><div><b>物理事故调查局</b><small>PHYSICS ACCIDENT BUREAU</small></div></div>
      <div class="case-code"><i></i>CASE 001 / 调查中</div>
    </header>

    <section class="accident-scene" id="scene">
      ${renderRainScene()}
      <div class="scene-title"><span>23:17 / 南江公路 / 持续降雨</span><h1>他已经踩下刹车，<br><em>为什么还是停不下来？</em></h1><p>障碍物距发现点 55 米。检查现场，还原事故发生前的 3.8 秒。</p></div>
      ${renderEvidenceMarkers(state)}
      <div class="evidence-counter"><strong>${state.collectedEvidence.size}</strong><span>/ ${evidence.length}<br>现场证据</span></div>
      <div class="scroll-cue">向下进入制动实验室 <i>↓</i></div>
    </section>

    <nav class="process-nav">
      ${navItem("01", "封锁现场", state.collectedEvidence.size === evidence.length, "scene")}
      ${navItem("02", "复现实验", state.trials.length >= 2, "lab")}
      ${navItem("03", "原理研判", store.correctAnswers === questions.length, "analysis")}
      ${navItem("04", "结案报告", Boolean(verdict), "conclusion")}
    </nav>

    <section class="lab-section" id="lab">
      <header class="section-head"><span>02 / RECONSTRUCTION</span><h2>重建停车过程</h2><p>改变一次只需一个参数，对比记录，让数据替直觉作证。</p></header>
      <div class="lab-layout">
        <div class="simulator ${state.simulating ? "running" : ""} ${result.safe ? "safe" : "impact"}" style="--stop:${Math.min(94, 10 + result.totalDistance / 1.05)}%;--reaction:${Math.min(72, 10 + result.reactionDistance / 1.05)}%">
          <div class="lab-rain"></div><div class="distance-scale">${[0,10,20,30,40,50].map((n) => `<span style="left:${10 + n / 1.05}%">${n}m</span>`).join("")}</div>
          <div class="road-line"></div><div class="obstacle"><i></i><span>55m</span></div><div class="sim-car"><div class="headlight"></div></div>
          <div class="reaction-zone"><span>反应距离 ${fmt(result.reactionDistance)}m</span></div>
          <div class="braking-zone"><span>制动距离 ${fmt(result.brakingDistance)}m</span></div>
          <div class="simulation-status">${state.simulating ? "正在计算轨迹…" : result.safe ? "可在障碍前停下" : `预计碰撞速度 ${fmt(result.impactSpeed)} km/h`}</div>
        </div>
        <aside class="controls">
          <div class="preset-line"><span>试验条件</span><button id="preset">载入事故数据</button></div>
          ${rangeControl("speed", "初始车速", state.input.speedKmh, 20, 100, 1, "km/h")}
          ${rangeControl("reaction", "反应时间", state.input.reactionTime, .5, 2, .1, "s")}
          <div class="control-group"><label>路面状况</label><div class="road-options">${(Object.keys(roadLabels) as RoadCondition[]).map((road) => `<button data-road="${road}" class="${state.input.road === road ? "active" : ""}"><span>${roadLabels[road].short}</span><small>μ ${roadLabels[road].friction}</small></button>`).join("")}</div></div>
          <button id="run-trial" class="run-button" ${state.simulating ? "disabled" : ""}><span>${state.simulating ? "正在制动" : "开始制动测试"}</span><i>▶</i></button>
        </aside>
      </div>
      ${renderTrialLog(state)}
    </section>

    <section class="analysis-section" id="analysis">
      <header class="section-head light"><span>03 / ANALYSIS</span><h2>从数据到结论</h2><p>分清反应距离与制动距离，找到每个变量真正影响的部分。</p></header>
      <div class="formula-strip"><span><i>d<sub>反</sub></i> = vt</span><b>+</b><span><i>d<sub>制</sub></i> = v² / 2μg</span><b>=</b><span><i>d<sub>总</sub></i> = d<sub>反</sub> + d<sub>制</sub></span></div>
      <div class="analysis-list">${questions.map((q, i) => renderQuestion(q, i, state)).join("")}</div>
    </section>

    <section class="conclusion-section ${store.canConclude ? "ready" : "locked"}" id="conclusion">
      <div class="conclusion-copy"><span>04 / FINAL REPORT</span><h2>${store.canConclude ? "可以结案了" : "报告尚缺关键论据"}</h2><p>${store.canConclude ? "选择最符合证据链与物理规律的事故结论。" : `证据 ${state.collectedEvidence.size}/4 · 实验 ${state.trials.length}/2 · 研判 ${store.correctAnswers}/3`}</p></div>
      <div class="verdict-list">${verdicts.map((item) => `<button data-verdict="${item.id}" ${store.canConclude ? "" : "disabled"}><b>${item.title}</b><span>${item.description}</span><i>→</i></button>`).join("")}</div>
    </section>

    ${state.activeEvidenceId ? renderEvidenceDrawer(state.activeEvidenceId) : ""}
    ${verdict ? renderReport(verdict.correct) : ""}
  </main>`;
  bind(state);
  // A clue/answer can be opened while a trial is running. Reapply the same
  // disabled-control contract after such a full structural render.
  updateLabReadouts(state);
}

function updateLabReadouts(state: InvestigationState) {
  const result = store.currentResult;
  const simulator = root.querySelector<HTMLElement>(".simulator")!;
  simulator.classList.toggle("running", state.simulating);
  simulator.classList.toggle("safe", result.safe);
  simulator.classList.toggle("impact", !result.safe);
  simulator.style.setProperty("--stop", `${Math.min(94, 10 + result.totalDistance / 1.05)}%`);
  simulator.style.setProperty("--reaction", `${Math.min(72, 10 + result.reactionDistance / 1.05)}%`);
  simulator.querySelector(".reaction-zone span")!.textContent = `反应距离 ${fmt(result.reactionDistance)}m`;
  simulator.querySelector(".braking-zone span")!.textContent = `制动距离 ${fmt(result.brakingDistance)}m`;
  simulator.querySelector(".simulation-status")!.textContent = state.simulating ? "正在计算轨迹…" : result.safe ? "可在障碍前停下" : `预计碰撞速度 ${fmt(result.impactSpeed)} km/h`;
  for (const [id, value, unit] of [["speed", state.input.speedKmh, "km/h"], ["reaction", state.input.reactionTime, "s"]] as const) {
    const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
    if (input.value !== String(value)) input.value = String(value);
    input.disabled = state.simulating;
    root.querySelector(`label[for="${id}"] b`)!.innerHTML = `${value} <small>${unit}</small>`;
  }
  root.querySelectorAll<HTMLButtonElement>("[data-road]").forEach((button) => {
    button.classList.toggle("active", button.dataset.road === state.input.road);
    button.disabled = state.simulating;
  });
  root.querySelector<HTMLButtonElement>("#preset")!.disabled = state.simulating;
  const run = root.querySelector<HTMLButtonElement>("#run-trial")!;
  run.disabled = state.simulating;
  run.querySelector("span")!.textContent = state.simulating ? "正在制动" : "开始制动测试";
  root.querySelector(".trial-log")!.outerHTML = renderTrialLog(state);
  const compared = state.trials.length >= 2;
  const step = root.querySelector('[data-scroll="lab"]')!;
  step.classList.toggle("done", compared);
  step.querySelector("small")!.textContent = compared ? "✓" : "02";
  const ready = store.canConclude;
  const conclusion = root.querySelector(".conclusion-section")!;
  conclusion.classList.toggle("ready", ready);
  conclusion.classList.toggle("locked", !ready);
  conclusion.querySelector("h2")!.textContent = ready ? "可以结案了" : "报告尚缺关键论据";
  conclusion.querySelector("p")!.textContent = ready ? "选择最符合证据链与物理规律的事故结论。" : `证据 ${state.collectedEvidence.size}/4 · 实验 ${state.trials.length}/2 · 研判 ${store.correctAnswers}/3`;
  conclusion.querySelectorAll<HTMLButtonElement>("[data-verdict]").forEach((button) => { button.disabled = !ready; });
}

function renderCover() {
  return `<main class="cover"><div class="rain-field"></div><div class="cover-glow"></div><div class="cover-road"><i></i><b></b></div><div class="cover-car"><span></span></div><div class="cover-copy"><div class="cover-brand"><span>PA</span>物理事故调查局</div><p class="case-label">CASE 001 / BRAKING DISTANCE</p><h1>雨夜<br><em>刹车之谜</em></h1><p class="cover-lead">从发现障碍到发生碰撞，只有 3.8 秒。<br>是车的问题，路的问题，还是人的问题？</p><button id="enter"><span>进入事故现场</span><i>→</i></button></div><div class="cover-footer"><span>课题 · 运动与力</span><span>适用 · 初中物理</span></div></main>`;
}

function renderRainScene() {
  return `<div class="night"><div class="rain"></div><div class="city-glow"></div><div class="guardrail"></div><div class="night-road"><i></i><b></b></div><div class="wreck-car"><i></i><span></span></div><div class="warning-sign">50</div><div class="cone c1"></div><div class="cone c2"></div><div class="skid s1"></div><div class="skid s2"></div><div class="phone-evidence"></div></div>`;
}

function renderEvidenceMarkers(state: InvestigationState) {
  const positions = [["skid","55%","73%"],["sign","78%","45%"],["road","43%","82%"],["phone","68%","66%"]];
  return positions.map(([id,left,top],i) => { const item=evidence.find((e)=>e.id===id)!; return `<button class="marker ${state.collectedEvidence.has(id)?"found":""}" data-evidence="${id}" style="--x:${left};--y:${top};--delay:${i*.15}s"><i>${state.collectedEvidence.has(id)?"✓":"+"}</i><span>${item.index} ${item.name}</span></button>`; }).join("");
}

function navItem(index:string,label:string,done:boolean,target:string){return `<button data-scroll="${target}" class="${done?"done":""}"><small>${done?"✓":index}</small><span>${label}</span></button>`}

function rangeControl(id:string,label:string,value:number,min:number,max:number,step:number,unit:string){return `<div class="control-group"><label for="${id}">${label}<b>${value} <small>${unit}</small></b></label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></div>`}

function renderTrialLog(state: InvestigationState){return `<div class="trial-log"><div class="trial-title"><span>实验记录</span><small>至少完成 2 次对比试验</small></div><div class="trial-table"><div class="trial-row head"><span>车速</span><span>反应</span><span>路面</span><span>反应距离</span><span>制动距离</span><span>总距离</span><span>结果</span></div>${state.trials.length?state.trials.map(t=>`<div class="trial-row"><span>${t.speedKmh} km/h</span><span>${t.reactionTime}s</span><span>${roadLabels[t.road].short}</span><span>${fmt(t.reactionDistance)}m</span><span>${fmt(t.brakingDistance)}m</span><span>${fmt(t.totalDistance)}m</span><span class="${t.safe?"pass":"fail"}">${t.safe?"安全停下":"发生碰撞"}</span></div>`).join(""):`<div class="empty-trials">暂无记录—调整参数后开始第一次测试</div>`}</div></div>`}

function renderQuestion(q:(typeof questions)[number],index:number,state:InvestigationState){const chosen=state.answers[q.id];const answered=chosen!==undefined;const correct=chosen===q.answer;return `<article class="analysis-question ${answered?(correct?"correct":"wrong"):""}"><span>${String(index+1).padStart(2,"0")}</span><div><h3>${q.prompt}</h3><div class="answers">${q.options.map((option,i)=>`<button data-question="${q.id}" data-option="${i}" class="${chosen===i?"selected":""}">${option}</button>`).join("")}</div>${answered?`<p><b>${correct?"判断正确":"证据不支持"}</b>${q.explanation}</p>`:""}</div></article>`}

function renderEvidenceDrawer(id:string){const item=evidence.find((e)=>e.id===id);if(!item)return"";return `<div class="drawer-shade" data-close></div><aside class="evidence-drawer"><button class="close" data-close>×</button><div class="evidence-index">${item.index} / EVIDENCE</div><div class="evidence-value">${item.value}</div><h2>${item.name}</h2><div class="evidence-block"><span>现场观察</span><p>${item.observation}</p></div><div class="evidence-block inference"><span>初步推断</span><p>${item.inference}</p></div><button class="archive" data-close>录入证据库 <i>→</i></button></aside>`}

function renderReport(correct:boolean){return `<div class="report-overlay"><section class="report ${correct?"solved":"rejected"}"><div class="report-code">PAB / CASE 001 / FINAL</div><div class="report-stamp">${correct?"结案":"驳回"}</div><h2>${correct?"事故从来不只有一个原因":"这个结论遗漏了证据"}</h2><p>${correct?"车速 72 km/h 带来更长的反应距离与成平方增长的制动距离；1.4 秒反应时间让车辆先前进约 28 米；湿滑路面又降低了摩擦力。三者叠加，使 55 米已经不足以停车。":"请回到实验记录，比较车速、反应时间与路面条件各自改变了哪段距离。"}</p><div class="report-formula">d<sub>停</sub> = vt + v²/2μg</div><button id="report-action">${correct?"重新调查":"返回补充论据"} <i>→</i></button></section></div>`}

function bind(state:InvestigationState){
  document.querySelectorAll<HTMLElement>("[data-evidence]").forEach(el=>el.addEventListener("click",()=>store.openEvidence(el.dataset.evidence??"")));
  document.querySelectorAll("[data-close]").forEach(el=>el.addEventListener("click",()=>store.closeEvidence()));
  document.querySelectorAll<HTMLElement>("[data-scroll]").forEach(el=>el.addEventListener("click",()=>document.querySelector(`#${el.dataset.scroll}`)?.scrollIntoView({behavior:"smooth"})));
  document.querySelector("#speed")?.addEventListener("input",e=>store.updateInput("speedKmh",Number((e.target as HTMLInputElement).value)));
  document.querySelector("#reaction")?.addEventListener("input",e=>store.updateInput("reactionTime",Number((e.target as HTMLInputElement).value)));
  document.querySelectorAll<HTMLElement>("[data-road]").forEach(el=>el.addEventListener("click",()=>store.setRoad(el.dataset.road as RoadCondition)));
  document.querySelector("#preset")?.addEventListener("click",()=>store.loadAccidentPreset());
  document.querySelector("#run-trial")?.addEventListener("click",()=>store.runTrial());
  document.querySelectorAll<HTMLElement>("[data-question]").forEach(el=>el.addEventListener("click",()=>store.answer(el.dataset.question??"",Number(el.dataset.option))));
  document.querySelectorAll<HTMLElement>("[data-verdict]").forEach(el=>el.addEventListener("click",()=>store.submitVerdict(el.dataset.verdict??"")));
  document.querySelector("#report-action")?.addEventListener("click",()=>{if(verdicts.find(v=>v.id===state.verdictId)?.correct)store.restart();else store.dismissVerdict()});
}

store.subscribe(render);
