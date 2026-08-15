import type { LessonConfig, LessonRoute, LessonScene } from "../core/models";
import type { NavigationPort } from "../services/navigation";
import type { PanoramaViewer, PanoramaViewerFactory } from "../services/panorama";
import {
  renderCover,
  renderHeader,
  renderPanorama,
  renderScene,
  renderScroll,
  renderSummary,
} from "./templates";

export interface ViewRenderer {
  render(route: LessonRoute): void;
}

export class LessonRenderer implements ViewRenderer {
  private panorama?: PanoramaViewer;
  private currentScene?: LessonScene;
  private hotspotsVisible = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly lesson: LessonConfig,
    private readonly navigation: NavigationPort,
    private readonly panoramaFactory: PanoramaViewerFactory,
  ) {
    this.root.addEventListener("click", this.handleClick);
    document.addEventListener("keydown", this.handleKeydown);
  }

  render(route: LessonRoute): void {
    this.panorama?.dispose();
    this.panorama = undefined;
    this.currentScene = this.resolveScene(route);
    this.hotspotsVisible = false;

    const view = this.renderView(route);
    this.root.innerHTML = `
      <div class="app-shell app-shell--${route.kind}">
        ${renderHeader(this.lesson, route, this.navigation.index, this.navigation.total)}
        ${view}
        <div class="edge-grain" aria-hidden="true"></div>
      </div>`;

    document.body.dataset.view = route.kind;
    this.hydrate(route);
  }

  private renderView(route: LessonRoute): string {
    switch (route.kind) {
      case "cover":
        return renderCover(this.lesson);
      case "scroll":
        return renderScroll(this.lesson);
      case "scene":
        return this.currentScene ? renderScene(this.lesson, this.currentScene) : "";
      case "panorama":
        return this.currentScene ? renderPanorama(this.currentScene) : "";
      case "summary":
        return renderSummary(this.lesson);
    }
  }

  private hydrate(route: LessonRoute): void {
    if (route.kind === "scroll") this.enableScrollDrag();
    if (route.kind === "panorama" && this.currentScene) {
      void this.mountPanorama(this.currentScene);
    }
  }

  private resolveScene(route: LessonRoute): LessonScene | undefined {
    if (route.kind !== "scene" && route.kind !== "panorama") return undefined;
    return this.lesson.scenes.find((scene) => scene.id === route.sceneId);
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : undefined;
    if (!target) return;

    const routeButton = target.closest<HTMLElement>("[data-route]");
    if (routeButton?.dataset.route) {
      event.preventDefault();
      const route = this.routeFromHash(routeButton.dataset.route);
      if (route) this.navigation.navigate(route);
      return;
    }

    const hotspot = target.closest<HTMLElement>("[data-hotspot]");
    if (hotspot && this.currentScene) {
      const index = Number(hotspot.dataset.hotspot);
      const detail = this.currentScene.hotspots[index];
      if (detail) this.openNote(detail.title, detail.text, detail.question);
      return;
    }

    const actionButton = target.closest<HTMLElement>("[data-action]");
    switch (actionButton?.dataset.action) {
      case "toggle-hotspots":
        this.toggleHotspots(actionButton);
        break;
      case "close-note":
        this.closeNote();
        break;
      case "fullscreen":
        void this.requestFullscreen();
        break;
    }
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const tagName = (event.target as HTMLElement | null)?.tagName;
    if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return;

    if (event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      this.navigation.next();
    }
    if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      this.navigation.previous();
    }
    if (event.key === "Escape") this.closeNote();
  };

  private routeFromHash(hash: string): LessonRoute | undefined {
    const [kind, sceneId] = hash.replace(/^#\/?/, "").split("/");
    if (kind === "cover" || kind === "scroll" || kind === "summary") return { kind };
    if ((kind === "scene" || kind === "panorama") && sceneId) return { kind, sceneId };
    return undefined;
  }

  private toggleHotspots(button: HTMLElement): void {
    this.hotspotsVisible = !this.hotspotsVisible;
    const view = this.root.querySelector<HTMLElement>(".scene-view");
    view?.classList.toggle("scene-view--hotspots", this.hotspotsVisible);
    button.textContent = this.hotspotsVisible ? "隐藏观察点" : "显示观察点";
  }

  private openNote(title: string, text: string, question: string): void {
    const note = this.root.querySelector<HTMLElement>("[data-note]");
    if (!note) return;
    const titleElement = note.querySelector<HTMLElement>("[data-note-title]");
    const textElement = note.querySelector<HTMLElement>("[data-note-text]");
    const questionElement = note.querySelector<HTMLElement>("[data-note-question]");
    if (titleElement) titleElement.textContent = title;
    if (textElement) textElement.textContent = text;
    if (questionElement) questionElement.textContent = question;
    note.classList.add("note-drawer--open");
    note.setAttribute("aria-hidden", "false");
  }

  private closeNote(): void {
    const note = this.root.querySelector<HTMLElement>("[data-note]");
    note?.classList.remove("note-drawer--open");
    note?.setAttribute("aria-hidden", "true");
  }

  private enableScrollDrag(): void {
    const stage = this.root.querySelector<HTMLElement>("[data-scroll-stage]");
    if (!stage) return;

    let pointerId: number | undefined;
    let startX = 0;
    let startScrollLeft = 0;

    stage.addEventListener("pointerdown", (event) => {
      pointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = stage.scrollLeft;
      stage.setPointerCapture(event.pointerId);
      stage.classList.add("scroll-stage--dragging");
    });

    stage.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) return;
      stage.scrollLeft = startScrollLeft - (event.clientX - startX) * 1.25;
    });

    const stop = (event: PointerEvent): void => {
      if (pointerId !== event.pointerId) return;
      pointerId = undefined;
      stage.classList.remove("scroll-stage--dragging");
    };
    stage.addEventListener("pointerup", stop);
    stage.addEventListener("pointercancel", stop);
    stage.addEventListener(
      "wheel",
      (event) => {
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
          event.preventDefault();
          stage.scrollLeft += event.deltaY;
        }
      },
      { passive: false },
    );
  }

  private async mountPanorama(scene: LessonScene): Promise<void> {
    const container = this.root.querySelector<HTMLElement>("[data-panorama]");
    const status = this.root.querySelector<HTMLElement>("[data-panorama-status]");
    if (!container) return;

    this.panorama = this.panoramaFactory();
    await this.panorama.mount({
      container,
      imageUrl: scene.panorama,
      onReady: () => status?.classList.add("panorama-status--ready"),
      onError: () => {
        if (!status) return;
        status.classList.add("panorama-status--error");
        status.innerHTML = `<strong>360° 场景暂时无法加载</strong><small>可返回局部赏析继续课堂</small>`;
      },
    });
  }

  private async requestFullscreen(): Promise<void> {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen();
  }
}
