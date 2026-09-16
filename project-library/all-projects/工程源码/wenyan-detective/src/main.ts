import "./styles.css";
import { clues, questions, verdicts } from "./data/case-file";
import { CaseEngine } from "./services/case-engine";
import type { CaseState } from "./core/types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root not found");

const engine = new CaseEngine();
let experimentTime = 6;

const icon = (name: "sound" | "close" | "scroll" | "sun" | "seal") => {
  const paths = {
    sound: '<path d="M5 10v4h3l4 3V7L8 10H5Z"/><path d="M15 9.2a4 4 0 0 1 0 5.6M17.5 6.8a7.5 7.5 0 0 1 0 10.4"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    scroll: '<path d="M7 4h10v16H7zM10 8h4M10 12h4M10 16h3"/>',
    sun: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>',
    seal: '<circle cx="12" cy="12" r="8"/><path d="M8.5 8.5h7v7h-7zM12 8.5v7M8.5 12h7"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
};

const render = (state: CaseState) => {
  if (!state.entered) {
    app.innerHTML = renderCover();
    bindCover();
    return;
  }

  const verdict = verdicts.find((item) => item.id === state.verdictId);
  app.innerHTML = `
    <main class="case-shell">
      <header class="topbar">
        <div class="brand"><span class="brand-mark">文案</span><div><b>文言文案件推理馆</b><small>第一案 · 两小儿辩日</small></div></div>
        <div class="case-status"><span class="status-dot"></span>案件调查中 <b>${state.collectedClues.size}/${clues.length}</b></div>
      </header>

      <section id="scene" class="scene" aria-label="古道案发现场">
        ${renderLandscape()}
        <div class="scene-copy">
          <span class="chapter">河南 · 古道 · 日初出</span>
          <h1>太阳，<br><em>究竟何时离人更近？</em></h1>
          <p>两个孩子争论不休，路过的孔子也无法决断。请你走进现场，让证据说话。</p>
        </div>
        ${renderHotspots(state)}
        <div class="scene-hint"><span></span>点击发光线索，记录证言</div>
      </section>

      <section class="workbench">
        <nav class="case-steps" aria-label="推理流程">
          ${stepButton("01", "勘查现场", state.collectedClues.size === clues.length, "scene")}
          ${stepButton("02", "验证太阳", state.experimentComplete, "experiment")}
          ${stepButton("03", "破译古文", engine.solvedTranslations === questions.length, "translation")}
          ${stepButton("04", "提交判词", Boolean(verdict), "verdict")}
        </nav>

        <section id="experiment" class="case-section experiment-section">
          <div class="section-number">02</div>
          <div class="section-heading">
            <span>求证</span>
            <h2>把一天拉到眼前</h2>
            <p>拖动时辰，分别观察太阳的“大小”与地面温度。</p>
          </div>
          ${renderExperiment(state)}
        </section>

        <section id="translation" class="case-section translation-section">
          <div class="section-number">03</div>
          <div class="section-heading">
            <span>破译</span>
            <h2>古文里藏着的口供</h2>
            <p>准确理解关键字句，才不会错读证人的意思。</p>
          </div>
          <div class="question-list">${questions.map((question, index) => renderQuestion(question, index, state)).join("")}</div>
        </section>

        <section id="verdict" class="case-section verdict-section ${engine.canJudge ? "ready" : "locked"}">
          <div class="verdict-copy">
            <span class="seal-icon">${icon("seal")}</span>
            <span>终案</span>
            <h2>${engine.canJudge ? "请落下你的判词" : "证据尚未齐备"}</h2>
            <p>${engine.canJudge ? "不只问“谁对”，更要问“证据能否支持结论”。" : `已找到 ${state.collectedClues.size}/${clues.length} 条线索，完成 ${engine.solvedTranslations}/${questions.length} 道破译。`}</p>
          </div>
          <div class="verdict-options">
            ${verdicts.map((item) => `<button class="verdict-option ${state.verdictId === item.id ? "selected" : ""}" data-verdict="${item.id}" ${engine.canJudge ? "" : "disabled"}><b>${item.title}</b><span>${item.summary}</span></button>`).join("")}
          </div>
        </section>
      </section>

      ${state.activeClueId ? renderClueDrawer(state.activeClueId) : ""}
      ${verdict ? renderResult(verdict.correct) : ""}
    </main>
  `;
  bindWorkspace(state);
};

function renderCover(): string {
  return `<main class="cover">
    <div class="cover-sun"></div>
    <div class="cover-mountains back"></div><div class="cover-mountains front"></div>
    <div class="cover-birds">⌁　⌁</div>
    <div class="cover-content">
      <div class="museum-label">文言文案件推理馆 <span>ARCHIVE 001</span></div>
      <p class="cover-kicker">一场持续了两千多年的争论</p>
      <h1>两小儿<br><em>辩日</em></h1>
      <p class="cover-intro">两份证言，一个太阳。<br>今日，由你重审此案。</p>
      <button id="enter-case" class="enter-button"><span>启封案卷</span><i>→</i></button>
    </div>
    <div class="cover-meta"><span>《列子·汤问》</span><span>适用 · 小学高年级</span></div>
  </main>`;
}

function renderLandscape(): string {
  return `<div class="landscape" aria-hidden="true">
    <div class="sun-disc"></div><div class="sun-halo"></div>
    <svg class="mountain-layer far" viewBox="0 0 1600 720" preserveAspectRatio="none"><path d="M0 410C180 330 240 390 365 292c80-62 126-52 215 22 124 103 169-28 270-74 100-45 165 75 239 84 102 12 159-150 292-120 89 20 127 112 219 112v404H0Z"/></svg>
    <svg class="mountain-layer near" viewBox="0 0 1600 720" preserveAspectRatio="none"><path d="M0 520c139-69 227-45 330-130 93-77 157 47 252 63 116 20 194-120 307-98 104 20 131 117 244 92 98-22 152-98 260-75 80 17 111 75 207 81v267H0Z"/></svg>
    <div class="road"></div><div class="tree t1"></div><div class="tree t2"></div><div class="pavilion"><i></i></div>
    <div class="figure confucius"><i></i><b></b></div><div class="figure child-one"><i></i><b></b></div><div class="figure child-two"><i></i><b></b></div>
  </div>`;
}

function renderHotspots(state: CaseState): string {
  const spots = [
    ["child-dawn", "证人甲", "25%", "62%"],
    ["child-noon", "证人乙", "39%", "67%"],
    ["wheel", "车盖", "68%", "70%"],
    ["water", "汤盂", "53%", "78%"],
    ["confucius", "孔子", "33%", "50%"],
  ];
  return spots.map(([id, label, left, top], index) => `<button class="hotspot ${state.collectedClues.has(id) ? "found" : ""}" data-clue="${id}" style="--left:${left};--top:${top};--delay:${index * 0.12}s"><i></i><span>${label}</span></button>`).join("");
}

function stepButton(number: string, label: string, complete: boolean, target: string): string {
  return `<button data-scroll="${target}" class="case-step ${complete ? "complete" : ""}"><small>${complete ? "✓" : number}</small><span>${label}</span></button>`;
}

function renderExperiment(state: CaseState): string {
  const progress = ((experimentTime - 6) / 12) * 100;
  const sunY = 74 - Math.sin(((experimentTime - 6) / 12) * Math.PI) * 56;
  const temp = Math.round(15 + Math.sin(Math.max(0, ((experimentTime - 7) / 13) * Math.PI)) * 18);
  const period = experimentTime < 9 ? "日初出" : experimentTime < 15 ? "日中" : "日将入";
  return `<div class="experiment-board">
    <div class="sky-lab" style="--day-progress:${progress}%;--sun-y:${sunY}%">
      <div class="lab-sun"></div><div class="lab-horizon"></div><div class="lab-person"></div>
      <div class="measurement apparent"><span>视直径</span><b>几乎不变</b></div>
      <div class="measurement temperature"><span>地表感温</span><b>${temp}°C</b></div>
    </div>
    <div class="lab-controls">
      <div class="time-readout"><small>${period}</small><strong>${String(experimentTime).padStart(2, "0")}:00</strong></div>
      <input id="time-slider" type="range" min="6" max="18" step="1" value="${experimentTime}" aria-label="调整时辰">
      <div class="time-labels"><span>卯时</span><span>午时</span><span>酉时</span></div>
      <div class="lab-finding"><b>实验纪要</b><p>太阳在一天中的视直径几乎不变；地面需要持续吸收热量，通常午后才更热。</p></div>
      <button id="record-experiment" class="ink-button ${state.experimentComplete ? "done" : ""}">${state.experimentComplete ? "✓ 已录入案卷" : "录入实验结果"}</button>
    </div>
  </div>`;
}

function renderQuestion(question: (typeof questions)[number], index: number, state: CaseState): string {
  const chosen = state.translationAnswers[question.id];
  const answered = chosen !== undefined;
  const correct = chosen === question.answer;
  return `<article class="question ${answered ? (correct ? "correct" : "wrong") : ""}">
    <div class="question-index">${String(index + 1).padStart(2, "0")}</div>
    <div class="question-body"><blockquote>${question.quote}</blockquote><h3>${question.prompt}</h3>
      <div class="answer-row">${question.options.map((option, optionIndex) => `<button data-question="${question.id}" data-option="${optionIndex}" class="answer ${chosen === optionIndex ? "chosen" : ""}">${option}</button>`).join("")}</div>
      ${answered ? `<p class="answer-feedback"><b>${correct ? "破译正确" : "再看一眼原句"}</b>${question.explanation}</p>` : ""}
    </div>
  </article>`;
}

function renderClueDrawer(id: string): string {
  const clue = clues.find((item) => item.id === id);
  if (!clue) return "";
  return `<div class="drawer-backdrop" data-close-clue></div><aside class="clue-drawer" aria-live="polite">
    <button class="drawer-close" data-close-clue aria-label="关闭">${icon("close")}</button>
    <div class="clue-type">${icon(clue.kind === "object" ? "scroll" : "seal")}<span>${clue.eyebrow}</span></div>
    <h2>${clue.title}</h2>
    <blockquote>${clue.classical}</blockquote>
    <button class="speak-button" data-speak="${clue.classical}">${icon("sound")} 听原文</button>
    <div class="translation"><span>今译</span><p>${clue.translation}</p></div>
    <div class="detective-note"><span>推理注记</span><p>${clue.note}</p></div>
    <button class="ink-button full" data-close-clue>记入案卷</button>
  </aside>`;
}

function renderResult(correct: boolean): string {
  return `<div class="result-overlay"><section class="result-sheet ${correct ? "solved" : "retry"}">
    <div class="result-stamp">${correct ? "案毕" : "驳回"}</div>
    <span class="result-eyebrow">第一案 · 最终判词</span>
    <h2>${correct ? "你找到了比答案更重要的东西" : "观察是起点，还不是证明"}</h2>
    <p>${correct ? "两小儿都善于观察，但“看起来大”和“感觉更热”都不足以证明距离。孔子不能决，展现了实事求是的态度。" : "你选择的结论把“现象”当成了“原因”。回到实验，再比较两份证言。"}</p>
    <div class="lesson-line"><b>今日所得</b><span>敢于质疑 · 仔细观察 · 依证推理 · 诚实求知</span></div>
    <button id="result-action" class="enter-button"><span>${correct ? "重新审理" : "返回补证"}</span><i>→</i></button>
  </section></div>`;
}

function bindCover() {
  document.querySelector("#enter-case")?.addEventListener("click", () => engine.enter());
}

function bindWorkspace(state: CaseState) {
  document.querySelectorAll<HTMLElement>("[data-clue]").forEach((element) => element.addEventListener("click", () => engine.openClue(element.dataset.clue ?? "")));
  document.querySelectorAll("[data-close-clue]").forEach((element) => element.addEventListener("click", () => engine.closeClue()));
  document.querySelectorAll<HTMLElement>("[data-scroll]").forEach((element) => element.addEventListener("click", () => document.querySelector(`#${element.dataset.scroll}`)?.scrollIntoView({ behavior: "smooth" })));
  document.querySelector("#time-slider")?.addEventListener("input", (event) => {
    experimentTime = Number((event.target as HTMLInputElement).value);
    const sky = document.querySelector<HTMLElement>(".sky-lab")!;
    sky.style.setProperty("--day-progress", `${((experimentTime - 6) / 12) * 100}%`);
    sky.style.setProperty("--sun-y", `${74 - Math.sin(((experimentTime - 6) / 12) * Math.PI) * 56}%`);
    document.querySelector(".measurement.temperature b")!.textContent = `${Math.round(15 + Math.sin(Math.max(0, ((experimentTime - 7) / 13) * Math.PI)) * 18)}°C`;
    document.querySelector(".time-readout small")!.textContent = experimentTime < 9 ? "日初出" : experimentTime < 15 ? "日中" : "日将入";
    document.querySelector(".time-readout strong")!.textContent = `${String(experimentTime).padStart(2, "0")}:00`;
  });
  document.querySelector("#record-experiment")?.addEventListener("click", () => engine.completeExperiment());
  document.querySelectorAll<HTMLElement>("[data-question]").forEach((element) => element.addEventListener("click", () => engine.answerQuestion(element.dataset.question ?? "", Number(element.dataset.option))));
  document.querySelectorAll<HTMLElement>("[data-verdict]").forEach((element) => element.addEventListener("click", () => engine.submitVerdict(element.dataset.verdict ?? "")));
  document.querySelectorAll<HTMLElement>("[data-speak]").forEach((element) => element.addEventListener("click", () => speak(element.dataset.speak ?? "")));
  document.querySelector("#result-action")?.addEventListener("click", () => {
    if (verdicts.find((item) => item.id === state.verdictId)?.correct) { experimentTime = 6; engine.restart(); }
    else engine.dismissVerdict();
  });
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 0.78;
  window.speechSynthesis.speak(utterance);
}

engine.subscribe(render);
