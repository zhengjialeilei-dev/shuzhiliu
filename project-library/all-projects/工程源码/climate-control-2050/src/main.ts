import "./styles.css";
import { metricContent, policyMeta } from "./data/climate-content";
import type { ClimatePolicy, ClimateState, MetricKey } from "./core/types";
import { ClimateModel } from "./services/climate-model";
import { ClimateStore } from "./services/climate-store";

const node = document.querySelector<HTMLDivElement>("#app");
if (!node) throw new Error("App root not found");
const app: HTMLDivElement = node;
const store = new ClimateStore();
const model = new ClimateModel();

function render(state: ClimateState, change?: "controls") {
  if (change === "controls" && app.querySelector(".control-room")) {
    updatePolicyReadouts(state);
    return;
  }
  if (!state.started) {
    app.innerHTML = renderCover();
    document.querySelector("#enter-control")?.addEventListener("click", () => store.start());
    return;
  }

  const metrics = model.calculate(state.policy);
  const success = model.isSuccessful(metrics);
  const budgetOver = metrics.budget > 100;
  app.innerHTML = `<main class="control-room" style="--heat:${Math.round((metrics.warming-.8)/1.7*100)}%;--forest:${state.policy.forest};--ice:${Math.max(.38,1-(metrics.warming-.8)*.32)}">
    <header class="topbar"><div class="brand"><span>EC</span><div><b>地球气候控制台</b><small>EARTH CLIMATE CONTROL</small></div></div><div class="timeline"><span>2025</span><i></i><b>2050</b></div><div class="system-state"><i></i>SIMULATION ONLINE</div></header>
    <section class="workspace">
      <div class="earth-panel">
        <div class="panel-label"><span>GLOBAL LIVE MODEL</span><b>全球气候响应</b></div>
        ${renderEarth(state, metrics.warming)}
        <div class="emission-readout"><span>年排放估算</span><b>${metrics.emissions.toFixed(1)}</b><small>Gt CO₂e</small></div>
        <div class="model-note">教学简化模型 · 用于比较政策方向，不作为真实气候预测</div>
      </div>
      <aside class="metric-rail">
        <div class="rail-head"><span>2050 TARGETS</span><h2>行星指标</h2><p>点击指标，了解它为什么改变。</p></div>
        ${metricButton("warming", metrics.warming, "°C", metrics.warming <= 1.5, "≤ 1.5", state.activeMetric)}
        ${metricButton("airQuality", metrics.airQuality, "", metrics.airQuality >= 75, "≥ 75", state.activeMetric)}
        ${metricButton("biodiversity", metrics.biodiversity, "", metrics.biodiversity >= 65, "≥ 65", state.activeMetric)}
        ${metricButton("seaLevel", metrics.seaLevel, "cm", metrics.seaLevel <= 28, "≤ 28", state.activeMetric)}
        <div class="target-score"><span>已达标</span><b>${model.passedTargets(metrics)}<small>/4</small></b><i><em style="width:${model.passedTargets(metrics)*25}%"></em></i></div>
      </aside>
      <section class="policy-console">
        <header><div><span>POLICY MIXER</span><h1>分配你的地球预算</h1></div><button id="balanced-plan">载入建议方案</button></header>
        <div class="policy-grid">${(Object.keys(policyMeta) as (keyof ClimatePolicy)[]).map((key) => renderPolicy(key, state.policy[key])).join("")}</div>
        <div class="budget-line ${budgetOver ? "over" : ""}"><div><span>已使用预算</span><b>${metrics.budget.toFixed(0)}<small>/100</small></b></div><i><em style="width:${Math.min(100,metrics.budget)}%"></em></i><p>${budgetOver ? `超出预算 ${Math.ceil(metrics.budget-100)} 点，方案无法提交。` : `剩余 ${Math.floor(100-metrics.budget)} 点可用`}</p></div>
        <button id="submit-plan" class="submit-plan" ${budgetOver ? "disabled" : ""}><span>提交 2050 地球方案</span><i>→</i></button>
      </section>
    </section>
    ${state.showBriefing ? renderBriefing() : ""}
    ${state.activeMetric ? renderMetricDrawer(state.activeMetric, metrics[state.activeMetric]) : ""}
    ${state.submitted ? renderResult(success, metrics, state.policy) : ""}
  </main>`;
  bind(state);
}

// Input events update outputs only: keep the dragged control and animated
// globe in place instead of replacing their DOM nodes on every pointer move.
function updatePolicyReadouts(state: ClimateState) {
  const metrics = model.calculate(state.policy);
  const room = app.querySelector<HTMLElement>(".control-room")!;
  room.style.setProperty("--heat", `${Math.round((metrics.warming-.8)/1.7*100)}%`);
  room.style.setProperty("--forest", String(state.policy.forest));
  room.style.setProperty("--ice", String(Math.max(.38,1-(metrics.warming-.8)*.32)));
  app.querySelector(".temperature-tag b")!.textContent = `+${metrics.warming.toFixed(2)}°C`;
  app.querySelector(".emission-readout b")!.textContent = metrics.emissions.toFixed(1);
  const dots = app.querySelector(".forest-dots")!;
  const treeCount = Math.round(state.policy.forest / 2);
  if (dots.childElementCount !== treeCount) {
    dots.innerHTML = Array.from({length:treeCount},(_,i)=>`<i style="--x:${25+(i*37)%55}%;--y:${27+(i*23)%47}%"></i>`).join("");
  }
  const passed: Record<MetricKey, boolean> = {
    warming: metrics.warming <= 1.5, airQuality: metrics.airQuality >= 75,
    biodiversity: metrics.biodiversity >= 65, seaLevel: metrics.seaLevel <= 28,
  };
  app.querySelectorAll<HTMLElement>("[data-metric]").forEach((button) => {
    const key = button.dataset.metric as MetricKey;
    button.classList.toggle("pass", passed[key]);
    button.classList.toggle("risk", !passed[key]);
    button.querySelector("b")!.innerHTML = `${key === "warming" ? "+" : ""}${metrics[key].toFixed(key === "warming" ? 2 : 0)}<small>${key === "warming" ? "°C" : key === "seaLevel" ? "cm" : ""}</small>`;
    button.querySelector("i")!.textContent = passed[key] ? "✓" : "!";
  });
  const targets = model.passedTargets(metrics);
  app.querySelector(".target-score b")!.innerHTML = `${targets}<small>/4</small>`;
  app.querySelector<HTMLElement>(".target-score em")!.style.width = `${targets * 25}%`;
  app.querySelectorAll<HTMLInputElement>("[data-policy]").forEach((input) => {
    const key = input.dataset.policy as keyof ClimatePolicy;
    const meta = policyMeta[key];
    const value = state.policy[key];
    input.closest("label")!.querySelector("strong")!.innerHTML = `${value}<i>${meta.unit}</i>`;
    input.closest("label")!.querySelector<HTMLElement>("em i")!.style.width = `${(value-meta.min)/(meta.max-meta.min)*100}%`;
  });
  const over = metrics.budget > 100;
  const budget = app.querySelector(".budget-line")!;
  budget.classList.toggle("over", over);
  budget.querySelector("b")!.innerHTML = `${metrics.budget.toFixed(0)}<small>/100</small>`;
  budget.querySelector<HTMLElement>("em")!.style.width = `${Math.min(100,metrics.budget)}%`;
  budget.querySelector("p")!.textContent = over ? `超出预算 ${Math.ceil(metrics.budget-100)} 点，方案无法提交。` : `剩余 ${Math.floor(100-metrics.budget)} 点可用`;
  app.querySelector<HTMLButtonElement>("#submit-plan")!.disabled = over;
  app.querySelector(".result-shade")?.remove();
}

function renderCover() {
  return `<main class="cover"><div class="stars"></div><div class="cover-orbit"></div><div class="cover-earth">${worldSvg()}</div><div class="cover-copy"><div class="cover-brand"><span>EC</span>地球气候控制台</div><p>MISSION 2050 / PLANETARY BALANCE</p><h1>地球的未来，<br><em>还有 100 点选择。</em></h1><div class="cover-lead">能源、森林、交通和海岸。<br>你能让四项指标同时达标吗？</div><button id="enter-control"><span>连接地球模型</span><i>→</i></button></div><div class="cover-footer"><span>课题 · 气候与可持续发展</span><span>教学简化模拟</span></div></main>`;
}

function worldSvg() {
  return `<svg viewBox="0 0 800 800" aria-hidden="true"><defs><radialGradient id="ocean" cx="35%" cy="30%"><stop offset="0" stop-color="#4bc1c0"/><stop offset=".58" stop-color="#168696"/><stop offset="1" stop-color="#07515f"/></radialGradient></defs><circle cx="400" cy="400" r="360" fill="url(#ocean)"/><g class="continents"><path d="M116 267l78-92 88-33 66 41-20 61-48 17-18 66-54 50-50-32-5-49z"/><path d="M283 361l61 46 22 80-35 135-48 47-27-88 15-94-43-65z"/><path d="M410 164l77-36 141 51 66 73-26 66-89-3-24 58-75 5-53-60-52-42z"/><path d="M469 383l91 13 56 71-28 119-69 75-62-77-25-102z"/><path d="M637 539l70 29 25 72-61 36-73-42z"/></g><g class="ice"><path d="M188 130l96-56 146-30 147 36 69 48-116 21-126-16-102 30z"/><path d="M271 704l114-30 132 12 75 47-93 31-147-3z"/></g><g class="grid-lines"><ellipse cx="400" cy="400" rx="360" ry="120"/><ellipse cx="400" cy="400" rx="360" ry="240"/><path d="M400 40c-170 135-170 585 0 720M400 40c170 135 170 585 0 720"/></g></svg>`;
}

function renderEarth(state: ClimateState, warming: number) {
  const trees = Math.round(state.policy.forest / 2);
  return `<div class="earth-stage"><div class="heat-halo"></div><div class="earth">${worldSvg()}<div class="forest-dots">${Array.from({length:trees},(_,i)=>`<i style="--x:${25+(i*37)%55}%;--y:${27+(i*23)%47}%"></i>`).join("")}</div></div><div class="orbit-ring"><i></i></div><div class="temperature-tag"><span>2050 温度轨迹</span><b>+${warming.toFixed(2)}°C</b></div></div>`;
}

function metricButton(key: MetricKey, value: number, unit: string, pass: boolean, target: string, active: MetricKey | null) {
  const labels: Record<MetricKey,string> = {warming:"全球升温",airQuality:"空气质量",biodiversity:"生物多样性",seaLevel:"海平面风险"};
  return `<button class="metric ${pass?"pass":"risk"} ${active===key?"active":""}" data-metric="${key}"><span>${labels[key]}<small>目标 ${target}</small></span><b>${key==="warming"?"+":""}${value.toFixed(key==="warming"?2:0)}<small>${unit}</small></b><i>${pass?"✓":"!"}</i></button>`;
}

function renderPolicy(key: keyof ClimatePolicy, value: number) {
  const meta = policyMeta[key];
  return `<label class="policy"><span><b>${meta.label}</b><small>${meta.cost}</small></span><strong>${value}<i>${meta.unit}</i></strong><input data-policy="${key}" type="range" min="${meta.min}" max="${meta.max}" step="${meta.step}" value="${value}"><em><i style="width:${(value-meta.min)/(meta.max-meta.min)*100}%"></i></em></label>`;
}

function renderBriefing() {
  return `<div class="briefing-shade"><section class="briefing"><div class="brief-code">MISSION BRIEF / 2050</div><h2>这不是一道<br>只有一个答案的题。</h2><p>你拥有 100 点地球预算。调整四项政策，观察它们如何共同影响升温、空气、生物和海平面。</p><div class="mission-targets"><span><b>≤1.5°C</b>控制升温</span><span><b>≥75</b>空气质量</span><span><b>≥65</b>生物多样性</span><span><b>≤28cm</b>海平面风险</span></div><button id="begin-mission">开始分配预算 <i>→</i></button></section></div>`;
}

function renderMetricDrawer(key: MetricKey, value: number) {
  const item = metricContent[key];
  return `<div class="drawer-shade" data-close-metric></div><aside class="metric-drawer"><button data-close-metric>×</button><span>METRIC EXPLAINER</span><div class="drawer-value">${key==="warming"?"+":""}${value.toFixed(key==="warming"?2:0)}</div><h2>${item.title}</h2><div class="drawer-target"><span>2050 目标</span><b>${item.target}</b></div><p>${item.explanation}</p><div class="action-note"><span>调整建议</span><b>${item.action}</b></div><button class="return" data-close-metric>返回控制台</button></aside>`;
}

function renderResult(success: boolean, metrics: ReturnType<ClimateModel["calculate"]>, policy: ClimatePolicy) {
  return `<div class="result-shade"><section class="result ${success?"success":"retry"}"><div class="result-orbit"></div><div class="result-code">2050 PLANETARY REVIEW</div><div class="result-mark">${success?"达标":"待优化"}</div><h2>${success?"你为地球找到了一种平衡。":"地球不只有一项指标。"}</h2><p>${success?`在 ${metrics.budget.toFixed(0)} 点预算内，方案同时控制了升温与海平面风险，并提升了空气质量和生物多样性。`:`当前方案有 ${model.passedTargets(metrics)}/4 项指标达标。查看未达标指标的解释，重新调整政策组合。`}</p><div class="result-metrics"><span><b>${policy.renewable}%</b>清洁能源</span><span><b>${policy.forest}M</b>森林恢复</span><span><b>${policy.transport}%</b>绿色交通</span><span><b>${policy.coastal}%</b>海岸防护</span></div><div class="result-actions"><button id="result-back">${success?"继续观察地球":"返回优化方案"} <i>→</i></button>${success?`<button id="restart">重新模拟</button>`:""}</div></section></div>`;
}

function bind(state: ClimateState) {
  document.querySelectorAll<HTMLInputElement>("[data-policy]").forEach((input) => input.addEventListener("input", () => store.update(input.dataset.policy as keyof ClimatePolicy, Number(input.value))));
  document.querySelectorAll<HTMLElement>("[data-metric]").forEach((button) => button.addEventListener("click", () => store.openMetric(button.dataset.metric as MetricKey)));
  document.querySelectorAll("[data-close-metric]").forEach((button) => button.addEventListener("click", () => store.closeMetric()));
  document.querySelector("#begin-mission")?.addEventListener("click", () => store.closeBriefing());
  document.querySelector("#balanced-plan")?.addEventListener("click", () => store.loadBalancedPlan());
  document.querySelector("#submit-plan")?.addEventListener("click", () => store.submit());
  document.querySelector("#result-back")?.addEventListener("click", () => store.dismissResult());
  document.querySelector("#restart")?.addEventListener("click", () => store.restart());
  if (state.submitted) document.querySelector(".result")?.scrollTo({ top: 0 });
}

store.subscribe(render);
