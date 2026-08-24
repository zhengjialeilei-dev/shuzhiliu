import type { AtlasFilters, DynastyFilter, Poem, RegionId, ThemeFilter } from "../core/types";
import { dynastyFilters, poems, regions, themeFilters } from "../data/poems";
import { PoetryMap } from "../services/student-map";
import { getSceneVisual } from "../services/scene-visual";
import { BrowserNarrator, type Narrator } from "../services/narration";

export class PoetryAtlasApp {
  private readonly filters: AtlasFilters = { region: "national", dynasty: "全部", theme: "全部" };
  private activePoemId = poems[0].id;
  private routeVisible = true;
  private map?: PoetryMap;
  private scenePoem?: Poem;
  private narrating = false;
  private sceneTimer?: number;

  constructor(
    private readonly root: HTMLElement,
    private readonly narrator: Narrator = new BrowserNarrator()
  ) {}

  mount(): void {
    this.root.innerHTML = `
      <main class="atlas-shell">
        <header class="atlas-header">
          <div class="brand-seal" aria-hidden="true"><span>诗</span></div>
          <div class="brand-copy">
            <p>小学生古诗研学地图</p>
            <h1>诗贯山河</h1>
          </div>
          <div class="header-note">
            <span id="visible-count">${poems.length}</span>
            <small>首诗 · 等你沿着地图发现</small>
          </div>
        </header>

        <section class="atlas-workspace">
          <nav class="region-rail map-overlay" aria-label="诗歌区域">
            <p class="rail-label">诗域</p>
            ${regions.map((region, index) => `
              <button type="button" data-region="${region.id}" class="region-button${index === 0 ? " is-active" : ""}">
                <span class="region-index">${String(index + 1).padStart(2, "0")}</span>
                <span><b>${region.label}</b><small>${region.description}</small></span>
              </button>`).join("")}
          </nav>

          <section class="map-stage" aria-label="诗歌地图">
            <div class="stage-topline">
              <div>
                <p id="region-description">${regions[0].description}</p>
                <b id="filter-summary">全部朝代 · 全部主题</b>
              </div>
              <div class="stage-actions">
                <span class="map-gesture-hint">点击诗点簇放大 · 点击“诗”字进入诗境</span>
                <button type="button" class="route-toggle is-active" data-action="route" aria-pressed="true">
                  <span class="route-swatch" aria-hidden="true"></span><span data-route-label>隐藏诗路</span>
                </button>
              </div>
            </div>
            <div id="map-host" class="map-host"></div>
            <div class="map-controls" aria-label="地图缩放控制">
              <button type="button" data-action="zoom-in" aria-label="放大地图">＋</button>
              <button type="button" data-action="zoom-out" aria-label="缩小地图">−</button>
              <button type="button" data-action="reset-map" class="reset-map">全图</button>
            </div>
            <div id="journey-player" class="journey-player" aria-live="polite" hidden>
              <div class="journey-player-heading">
                <span>路线演示</span>
                <b id="journey-title"></b>
                <button type="button" data-action="stop-journey">结束</button>
              </div>
              <div class="journey-player-content">
                <span id="journey-step-number">01</span>
                <div><b id="journey-stop-name"></b><p id="journey-stop-note"></p></div>
              </div>
              <div class="journey-progress-track"><i id="journey-progress"></i></div>
            </div>
            <div class="map-caption" aria-hidden="true">
              <span>西域</span><i></i><span>中原</span><i></i><span>江南</span>
            </div>
            <div class="poem-strip" aria-label="当前诗歌">
              <span class="strip-label">诗选</span>
              <div id="poem-list" class="poem-list"></div>
            </div>
          </section>

        </section>

        <footer class="filter-dock">
          <div class="filter-group">
            <span class="filter-label">朝代</span>
            <div class="filter-options" data-filter-group="dynasty">
              ${dynastyFilters.map((item, index) => `<button type="button" data-dynasty="${item}" class="filter-button${index === 0 ? " is-active" : ""}">${item}</button>`).join("")}
            </div>
          </div>
          <div class="dock-divider"></div>
          <div class="filter-group">
            <span class="filter-label">诗境</span>
            <div class="filter-options" data-filter-group="theme">
              ${themeFilters.map((item, index) => `<button type="button" data-theme="${item}" class="filter-button${index === 0 ? " is-active" : ""}">${item}</button>`).join("")}
            </div>
          </div>
        </footer>
      </main>

      <dialog id="scene-dialog" class="scene-dialog" aria-labelledby="scene-title">
        <article class="scene-theatre">
          <button type="button" class="scene-close" data-action="close-scene" aria-label="关闭诗境">×</button>
          <section id="scene-canvas" class="scene-canvas" aria-label="诗歌场景插画">
            <div class="scene-sky" aria-hidden="true"><i></i></div>
            <div class="scene-cloud scene-cloud-one" aria-hidden="true"></div>
            <div class="scene-cloud scene-cloud-two" aria-hidden="true"></div>
            <div class="scene-ridge scene-ridge-far" aria-hidden="true"></div>
            <div class="scene-ridge scene-ridge-near" aria-hidden="true"></div>
            <div class="scene-water" aria-hidden="true"></div>
            <div class="scene-weather" aria-hidden="true"></div>
            <div class="scene-motif" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
            <div class="scene-landmark" aria-hidden="true"><i></i><i></i><i></i></div>
            <div class="scene-boat" aria-hidden="true"><i></i></div>
            <div class="scene-verse">
              <span id="scene-moment"></span>
              <blockquote id="scene-lines"></blockquote>
            </div>
          </section>
          <section class="scene-story">
            <p class="scene-kicker">诗境故事 · <span id="scene-number"></span></p>
            <h2 id="scene-title"></h2>
            <p id="scene-byline" class="scene-byline"></p>
            <div class="scene-divider" aria-hidden="true"><span>来历</span></div>
            <p id="scene-origin" class="scene-origin"></p>
            <div class="scene-actions">
              <button type="button" class="narrate-button" data-action="narrate-origin">
                <span class="sound-mark" aria-hidden="true"><i></i><i></i><i></i></span>
                <span data-narration-label>朗读这首诗的来历</span>
              </button>
              <p id="narration-status" aria-live="polite">使用系统中文语音，可随时停止</p>
            </div>
            <div class="scene-geography"><small>山河坐标</small><b id="scene-route"></b></div>
            <button type="button" class="journey-start-button" data-action="play-journey">
              <span><small>沿地图出发</small><b>播放行走路线</b></span>
              <i aria-hidden="true">→</i>
            </button>
          </section>
        </article>
      </dialog>`;

    this.map = new PoetryMap(this.requireElement("#map-host"), poems, (id) => this.selectPoem(id));
    this.bindEvents();
    this.render();
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-region]").forEach((button) => {
      button.addEventListener("click", () => {
        this.stopJourney();
        this.filters.region = button.dataset.region as RegionId;
        this.reconcileSelection();
        this.render();
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-dynasty]").forEach((button) => {
      button.addEventListener("click", () => {
        this.stopJourney();
        this.filters.dynasty = button.dataset.dynasty as DynastyFilter;
        this.reconcileSelection();
        this.render();
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-theme]").forEach((button) => {
      button.addEventListener("click", () => {
        this.stopJourney();
        this.filters.theme = button.dataset.theme as ThemeFilter;
        this.reconcileSelection();
        this.render();
      });
    });
    this.requireElement<HTMLButtonElement>('[data-action="route"]').addEventListener("click", () => {
      this.routeVisible = !this.routeVisible;
      this.render();
    });
    this.requireElement<HTMLButtonElement>('[data-action="zoom-in"]').addEventListener("click", () => this.map?.zoomIn());
    this.requireElement<HTMLButtonElement>('[data-action="zoom-out"]').addEventListener("click", () => this.map?.zoomOut());
    this.requireElement<HTMLButtonElement>('[data-action="reset-map"]').addEventListener("click", () => this.map?.resetView());

    const dialog = this.requireElement<HTMLDialogElement>("#scene-dialog");
    this.requireElement<HTMLButtonElement>('[data-action="close-scene"]').addEventListener("click", () => dialog.close());
    this.requireElement<HTMLButtonElement>('[data-action="narrate-origin"]').addEventListener("click", () => this.toggleNarration());
    this.requireElement<HTMLButtonElement>('[data-action="play-journey"]').addEventListener("click", () => this.startJourney());
    this.requireElement<HTMLButtonElement>('[data-action="stop-journey"]').addEventListener("click", () => this.stopJourney());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      this.stopNarration();
      document.body.classList.remove("scene-open");
    });
  }

  private get visiblePoems(): readonly Poem[] {
    return poems.filter((poem) => {
      const regionMatch = this.filters.region === "national" || poem.region === this.filters.region;
      const dynastyMatch = this.filters.dynasty === "全部" ||
        (this.filters.dynasty === "其他" ? poem.dynasty !== "唐" && poem.dynasty !== "宋" : poem.dynasty === this.filters.dynasty);
      const themeMatch = this.filters.theme === "全部" || poem.theme === this.filters.theme;
      return regionMatch && dynastyMatch && themeMatch;
    });
  }

  private selectPoem(poemId: string): void {
    this.stopJourney();
    this.activePoemId = poemId;
    this.render();
    const poem = poems.find((item) => item.id === poemId);
    if (!poem) return;
    this.map?.focusPoem(poem);
    if (this.sceneTimer !== undefined) window.clearTimeout(this.sceneTimer);
    this.sceneTimer = window.setTimeout(() => {
      this.sceneTimer = undefined;
      this.openScene(poem);
    }, 520);
  }

  private reconcileSelection(): void {
    const visible = this.visiblePoems;
    if (!visible.some((poem) => poem.id === this.activePoemId)) this.activePoemId = visible[0]?.id ?? "";
  }

  private render(): void {
    const visible = this.visiblePoems;
    const region = regions.find((item) => item.id === this.filters.region) ?? regions[0];
    const activePoem = visible.find((poem) => poem.id === this.activePoemId) ?? visible[0];

    this.root.querySelectorAll<HTMLElement>("[data-region]").forEach((element) => element.classList.toggle("is-active", element.dataset.region === this.filters.region));
    this.root.querySelectorAll<HTMLElement>("[data-dynasty]").forEach((element) => element.classList.toggle("is-active", element.dataset.dynasty === this.filters.dynasty));
    this.root.querySelectorAll<HTMLElement>("[data-theme]").forEach((element) => element.classList.toggle("is-active", element.dataset.theme === this.filters.theme));

    const routeButton = this.requireElement<HTMLButtonElement>('[data-action="route"]');
    routeButton.classList.toggle("is-active", this.routeVisible);
    routeButton.setAttribute("aria-pressed", String(this.routeVisible));
    this.requireElement<HTMLElement>("[data-route-label]").textContent = this.routeVisible ? "隐藏诗路" : "显示诗路";

    this.requireElement("#visible-count").textContent = String(visible.length);
    this.requireElement("#region-description").textContent = region.description;
    this.requireElement("#filter-summary").textContent = `${this.filters.dynasty === "全部" ? "全部朝代" : this.filters.dynasty + "代"} · ${this.filters.theme === "全部" ? "全部主题" : this.filters.theme}`;

    this.renderPoemList(visible);
    this.map?.update({ visiblePoems: visible, activePoemId: activePoem?.id ?? "", activeRegion: region, routeVisible: this.routeVisible });
  }

  private renderPoemList(visible: readonly Poem[]): void {
    const list = this.requireElement("#poem-list");
    if (visible.length === 0) {
      list.innerHTML = '<p class="empty-strip">当前筛选没有匹配诗歌，请切换朝代或诗境。</p>';
      return;
    }
    list.innerHTML = visible.map((poem) => `
      <button type="button" data-poem="${poem.id}" class="poem-chip${poem.id === this.activePoemId ? " is-active" : ""}">
        <span>${poem.title}</span><small>${poem.author}</small>
      </button>`).join("");
    list.querySelectorAll<HTMLButtonElement>("[data-poem]").forEach((button) => {
      button.addEventListener("click", () => this.selectPoem(button.dataset.poem ?? ""));
    });
  }

  private openScene(poem: Poem): void {
    this.scenePoem = poem;
    this.stopNarration();
    const sceneIndex = poems.findIndex((item) => item.id === poem.id) + 1;
    const canvas = this.requireElement<HTMLElement>("#scene-canvas");
    const visual = getSceneVisual(poem);
    canvas.dataset.scene = poem.scene.preset;
    canvas.dataset.composition = visual.composition;
    canvas.dataset.verseLength = poem.lines.length >= 6 ? "long" : "standard";
    canvas.setAttribute("aria-label", `《${poem.title}》诗境：${visual.description}`);
    this.requireElement("#scene-number").textContent = String(sceneIndex).padStart(2, "0");
    this.requireElement("#scene-title").textContent = poem.title;
    this.requireElement("#scene-byline").textContent = `${poem.dynasty} · ${poem.author} · ${poem.location.name}`;
    this.requireElement("#scene-moment").textContent = poem.scene.moment;
    this.requireElement("#scene-lines").innerHTML = poem.lines.map((line) => `<span>${line}</span>`).join("");
    this.requireElement("#scene-origin").textContent = poem.scene.origin;
    this.requireElement("#scene-route").textContent = poem.routeNote;
    this.requireElement<HTMLElement>("[data-action=\"play-journey\"] small").textContent = `${poem.journey.length}站 · 沿地图出发`;
    this.updateNarrationUi();

    const dialog = this.requireElement<HTMLDialogElement>("#scene-dialog");
    document.body.classList.add("scene-open");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  private toggleNarration(): void {
    if (!this.scenePoem) return;
    if (this.narrating) {
      this.stopNarration();
      return;
    }

    const narration = `《${this.scenePoem.title}》的创作来历。${this.scenePoem.scene.origin}`;
    this.narrator.speak(narration, {
      onStart: () => {
        this.narrating = true;
        this.updateNarrationUi();
      },
      onEnd: () => {
        this.narrating = false;
        this.updateNarrationUi();
      },
      onError: () => {
        this.narrating = false;
        this.updateNarrationUi("当前浏览器无法调用中文语音，请直接阅读上方来历");
      }
    });
  }

  private startJourney(): void {
    const poem = this.scenePoem;
    if (!poem || !this.map) return;
    const dialog = this.requireElement<HTMLDialogElement>("#scene-dialog");
    if (dialog.open) dialog.close();
    this.map.resetView();
    this.requireElement<HTMLElement>(".map-stage").scrollIntoView({ behavior: "smooth", block: "start" });

    const player = this.requireElement<HTMLElement>("#journey-player");
    player.hidden = false;
    player.classList.remove("is-complete");
    this.requireElement("#journey-title").textContent = `《${poem.title}》`;
    this.requireElement("#journey-stop-name").textContent = poem.journey[0]?.label ?? poem.location.name;
    this.requireElement("#journey-stop-note").textContent = poem.journey[0]?.note ?? poem.context;
    this.requireElement("#journey-step-number").textContent = "01";
    this.requireElement<HTMLElement>("#journey-progress").style.width = "0%";

    let activeStopIndex = -1;
    this.map.playJourney(poem, {
      onProgress: (progress, stopIndex, stop) => {
        this.requireElement<HTMLElement>("#journey-progress").style.width = `${Math.round(progress * 100)}%`;
        if (stopIndex === activeStopIndex) return;
        activeStopIndex = stopIndex;
        this.requireElement("#journey-step-number").textContent = String(stopIndex + 1).padStart(2, "0");
        this.requireElement("#journey-stop-name").textContent = stop.label;
        this.requireElement("#journey-stop-note").textContent = stop.note;
        player.classList.remove("is-changing");
        void player.offsetWidth;
        player.classList.add("is-changing");
      },
      onComplete: () => {
        player.classList.add("is-complete");
        this.requireElement<HTMLButtonElement>('[data-action="stop-journey"]').textContent = "完成";
      }
    });
  }

  private stopJourney(): void {
    this.map?.stopJourney();
    const player = this.root.querySelector<HTMLElement>("#journey-player");
    if (player) player.hidden = true;
    const stopButton = this.root.querySelector<HTMLButtonElement>('[data-action="stop-journey"]');
    if (stopButton) stopButton.textContent = "结束";
  }

  private stopNarration(): void {
    this.narrator.stop();
    this.narrating = false;
    this.updateNarrationUi();
  }

  private updateNarrationUi(status?: string): void {
    const button = this.root.querySelector<HTMLButtonElement>('[data-action="narrate-origin"]');
    const label = this.root.querySelector<HTMLElement>("[data-narration-label]");
    const statusLine = this.root.querySelector<HTMLElement>("#narration-status");
    if (!button || !label || !statusLine) return;
    button.classList.toggle("is-speaking", this.narrating);
    button.setAttribute("aria-pressed", String(this.narrating));
    button.disabled = !this.narrator.supported;
    label.textContent = this.narrating ? "停止朗读" : "朗读这首诗的来历";
    statusLine.textContent = status ?? (this.narrator.supported ? "使用系统中文语音，可随时停止" : "当前浏览器不支持语音朗读");
  }

  private requireElement<T extends Element = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing required element: ${selector}`);
    return element;
  }
}
