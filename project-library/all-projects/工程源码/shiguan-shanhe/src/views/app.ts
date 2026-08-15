import type { AtlasFilters, DynastyFilter, Poem, RegionId, ThemeFilter } from "../core/types";
import { dynastyFilters, poems, regions, themeFilters } from "../data/poems";
import { PoetryMap } from "../services/map";

export class PoetryAtlasApp {
  private readonly filters: AtlasFilters = { region: "national", dynasty: "全部", theme: "全部" };
  private activePoemId = poems[0].id;
  private routeVisible = true;
  private map?: PoetryMap;

  constructor(private readonly root: HTMLElement) {}

  mount(): void {
    this.root.innerHTML = `
      <main class="atlas-shell">
        <header class="atlas-header">
          <div class="brand-seal" aria-hidden="true"><span>诗</span></div>
          <div class="brand-copy">
            <p>古诗地理互动长卷</p>
            <h1>诗贯山河</h1>
          </div>
          <div class="header-note">
            <span id="visible-count">${poems.length}</span>
            <small>首诗 · 正在山河间回响</small>
          </div>
        </header>

        <section class="atlas-workspace">
          <nav class="region-rail" aria-label="诗歌区域">
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
              <button type="button" class="route-toggle is-active" data-action="route" aria-pressed="true">
                <span class="route-swatch" aria-hidden="true"></span><span data-route-label>隐藏诗路</span>
              </button>
            </div>
            <div id="map-host" class="map-host"></div>
            <div class="map-caption" aria-hidden="true">
              <span>西域</span><i></i><span>中原</span><i></i><span>江南</span>
            </div>
            <div class="poem-strip" aria-label="当前诗歌">
              <span class="strip-label">诗选</span>
              <div id="poem-list" class="poem-list"></div>
            </div>
          </section>

          <aside class="poem-inspector" aria-live="polite">
            <div class="inspector-topline">
              <span id="poem-location"></span>
              <span id="poem-meta"></span>
            </div>
            <div id="poem-detail" class="poem-detail"></div>
            <div class="route-note">
              <span aria-hidden="true">↝</span>
              <div><small>诗人行旅</small><b id="route-note"></b></div>
            </div>
            <p class="inspector-hint">点击地图上的诗名，可切换地点与诗境。</p>
          </aside>
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
      </main>`;

    this.map = new PoetryMap(this.requireElement("#map-host"), poems, (id) => this.selectPoem(id));
    this.bindEvents();
    this.render();
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-region]").forEach((button) => {
      button.addEventListener("click", () => {
        this.filters.region = button.dataset.region as RegionId;
        this.reconcileSelection();
        this.render();
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-dynasty]").forEach((button) => {
      button.addEventListener("click", () => {
        this.filters.dynasty = button.dataset.dynasty as DynastyFilter;
        this.reconcileSelection();
        this.render();
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-theme]").forEach((button) => {
      button.addEventListener("click", () => {
        this.filters.theme = button.dataset.theme as ThemeFilter;
        this.reconcileSelection();
        this.render();
      });
    });
    this.requireElement<HTMLButtonElement>('[data-action="route"]').addEventListener("click", () => {
      this.routeVisible = !this.routeVisible;
      this.render();
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
    this.activePoemId = poemId;
    this.render();
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
    this.renderPoemDetail(activePoem);
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

  private renderPoemDetail(poem?: Poem): void {
    const detail = this.requireElement("#poem-detail");
    if (!poem) {
      this.requireElement("#poem-location").textContent = "未找到诗歌";
      this.requireElement("#poem-meta").textContent = "";
      detail.innerHTML = '<div class="empty-detail"><b>山河暂静</b><p>调整筛选条件，重新点亮诗路。</p></div>';
      this.requireElement("#route-note").textContent = "—";
      return;
    }
    this.activePoemId = poem.id;
    this.requireElement("#poem-location").textContent = poem.location.name;
    this.requireElement("#poem-meta").textContent = `${poem.dynasty} · ${poem.theme}`;
    detail.classList.remove("is-entering");
    void detail.offsetWidth;
    detail.classList.add("is-entering");
    detail.innerHTML = `
      <p class="poem-author">${poem.dynasty} · ${poem.author}</p>
      <h2>${poem.title}</h2>
      <blockquote>${poem.lines.map((line) => `<span>${line}</span>`).join("")}</blockquote>
      <div class="context-copy"><small>地理诗解</small><p>${poem.context}</p></div>`;
    this.requireElement("#route-note").textContent = poem.routeNote;
  }

  private requireElement<T extends Element = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing required element: ${selector}`);
    return element;
  }
}
