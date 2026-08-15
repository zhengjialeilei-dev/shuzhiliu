import type { LayoutMode, ViewMode } from "../core/types";
import { layoutOptions, podiumBlocks, viewOptions } from "../data/workshop";
import { PodiumScene } from "../services/scene";

export class WorkshopView {
  private scene?: PodiumScene;
  private mode: LayoutMode = "solid";
  private view: ViewMode = "perspective";

  constructor(private readonly root: HTMLElement) {}

  mount(): void {
    this.root.innerHTML = `
      <main class="workshop-shell">
        <header class="topbar">
          <div class="brand-mark" aria-hidden="true"><span></span><span></span><span></span></div>
          <div class="title-block">
            <p class="eyebrow">空间想象 · 展开与折叠</p>
            <h1>领奖台展开工坊</h1>
          </div>
          <button class="quiet-button" type="button" data-action="reset" aria-label="复原领奖台与视角">
            <span aria-hidden="true">↻</span> 一键复原
          </button>
        </header>

        <section class="workspace" aria-label="领奖台展开实验区">
          <aside class="guide-panel">
            <div>
              <p class="panel-kicker">观察任务</p>
              <h2>从立体到平面</h2>
              <p class="guide-copy">领奖台由三个长方体组成。按顺序展开，留意每个面与公共棱的关系。</p>
            </div>
            <ol class="guide-steps">
              <li class="is-current" data-step-indicator="solid"><b>01</b><span>旋转模型，认出六个面</span></li>
              <li data-step-indicator="half"><b>02</b><span>观察面绕公共棱打开</span></li>
              <li data-step-indicator="flat"><b>03</b><span>比较三组完整展开图</span></li>
              <li data-step-indicator="separated"><b>04</b><span>逐面辨认长与宽</span></li>
            </ol>
            <p class="drag-tip"><span aria-hidden="true">↔</span> 在模型上拖动可自由旋转</p>
          </aside>

          <div class="stage-wrap">
            <div class="stage-label" aria-live="polite">
              <span class="status-dot"></span>
              <span id="stage-status">正在观察：立体图</span>
            </div>
            <div id="scene-host" class="scene-host"></div>
            <div class="place-legend" aria-label="领奖台名次颜色说明">
              <span><i class="gold"></i>正面</span>
              <span><i class="coral"></i>侧面</span>
              <span><i class="red"></i>顶面</span>
            </div>
          </div>

          <aside class="control-panel">
            <div class="control-section">
              <div class="section-heading"><span>展开步骤</span><small id="step-count">1 / 4</small></div>
              <div class="layout-controls" role="group" aria-label="展开步骤">
                ${layoutOptions.map((item, index) => `
                  <button type="button" data-layout="${item.mode}" class="control-button${index === 0 ? " is-active" : ""}">
                    <span class="control-index">${String(index + 1).padStart(2, "0")}</span>
                    <span>${item.label}</span>
                  </button>`).join("")}
              </div>
            </div>

            <div class="control-section view-section">
              <div class="section-heading"><span>观察视角</span><small>可继续拖动</small></div>
              <div class="view-controls" role="group" aria-label="观察视角">
                ${viewOptions.map((item) => `<button type="button" data-view="${item.mode}" class="view-button${item.mode === "perspective" ? " is-active" : ""}">${item.label}</button>`).join("")}
              </div>
            </div>

            <div class="task-card">
              <span class="task-icon" aria-hidden="true">✦</span>
              <div><b>当前提示</b><p id="task-copy">${layoutOptions[0].instruction}</p></div>
            </div>
          </aside>
        </section>

        <footer class="progress-panel">
          <div class="progress-copy">
            <span class="progress-number" id="progress-number">01</span>
            <div><b id="progress-title">${layoutOptions[0].shortLabel}</b><p>完成四步观察，建立“立体—展开图”的对应关系。</p></div>
          </div>
          <div class="progress-track" aria-hidden="true"><span id="progress-fill"></span></div>
          <button class="next-button" type="button" data-action="next">下一步 <span aria-hidden="true">→</span></button>
        </footer>
      </main>`;

    const sceneHost = this.requireElement<HTMLElement>("#scene-host");
    this.scene = new PodiumScene(sceneHost, podiumBlocks);
    this.bindEvents();
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-layout]").forEach((button) => {
      button.addEventListener("click", () => this.selectLayout(button.dataset.layout as LayoutMode));
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
      button.addEventListener("click", () => this.selectView(button.dataset.view as ViewMode));
    });
    this.requireElement<HTMLButtonElement>('[data-action="reset"]').addEventListener("click", () => {
      this.selectLayout("solid");
      this.selectView("perspective");
      this.scene?.reset();
    });
    this.requireElement<HTMLButtonElement>('[data-action="next"]').addEventListener("click", () => {
      const index = layoutOptions.findIndex((item) => item.mode === this.mode);
      this.selectLayout(layoutOptions[(index + 1) % layoutOptions.length].mode);
    });
  }

  private selectLayout(mode: LayoutMode): void {
    this.mode = mode;
    this.scene?.setLayout(mode);
    const index = layoutOptions.findIndex((item) => item.mode === mode);
    const option = layoutOptions[index];

    this.root.querySelectorAll<HTMLElement>("[data-layout]").forEach((element) => element.classList.toggle("is-active", element.dataset.layout === mode));
    this.root.querySelectorAll<HTMLElement>("[data-step-indicator]").forEach((element) => element.classList.toggle("is-current", element.dataset.stepIndicator === mode));
    this.requireElement("#stage-status").textContent = `正在观察：${option.label}`;
    this.requireElement("#task-copy").textContent = option.instruction;
    this.requireElement("#step-count").textContent = `${index + 1} / ${layoutOptions.length}`;
    this.requireElement("#progress-number").textContent = String(index + 1).padStart(2, "0");
    this.requireElement("#progress-title").textContent = option.shortLabel;
    this.requireElement<HTMLElement>("#progress-fill").style.width = `${((index + 1) / layoutOptions.length) * 100}%`;
    this.requireElement('[data-action="next"]').innerHTML = index === layoutOptions.length - 1 ? '重新开始 <span aria-hidden="true">↻</span>' : '下一步 <span aria-hidden="true">→</span>';
  }

  private selectView(mode: ViewMode): void {
    this.view = mode;
    this.scene?.setView(this.view);
    this.root.querySelectorAll<HTMLElement>("[data-view]").forEach((element) => element.classList.toggle("is-active", element.dataset.view === mode));
  }

  private requireElement<T extends Element = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing required element: ${selector}`);
    return element;
  }
}
