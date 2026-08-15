import type { LessonConfig, LessonRoute, LessonScene } from "../core/models";
import { serializeRoute } from "../services/navigation";

const sceneRoute = (sceneId: string): string =>
  serializeRoute({ kind: "scene", sceneId });

const panoramaRoute = (sceneId: string): string =>
  serializeRoute({ kind: "panorama", sceneId });

const navButton = (label: string, route: LessonRoute, className = "button"): string =>
  `<button class="${className}" type="button" data-route="${serializeRoute(route)}">${label}</button>`;

export const renderHeader = (
  lesson: LessonConfig,
  route: LessonRoute,
  currentIndex: number,
  total: number,
): string => {
  const immersive = route.kind === "cover" || route.kind === "panorama";
  const scene =
    route.kind === "scene" || route.kind === "panorama"
      ? lesson.scenes.find((item) => item.id === route.sceneId)
      : undefined;
  const context = scene
    ? `${scene.act} · ${scene.title}`
    : route.kind === "scroll"
      ? "长卷总览"
      : route.kind === "summary"
        ? "课堂总结"
        : lesson.eyebrow;

  return `
    <header class="app-header ${immersive ? "app-header--overlay" : ""}">
      <button class="brand" type="button" data-route="#/cover" aria-label="回到封面">
        <span class="brand__seal" aria-hidden="true">宋</span>
        <span class="brand__copy"><strong>${lesson.title}</strong><small>${context}</small></span>
      </button>
      <div class="lesson-progress" aria-label="课程进度 ${currentIndex + 1}/${total}">
        <span style="width:${((currentIndex + 1) / total) * 100}%"></span>
      </div>
      <nav class="app-nav" aria-label="课程导航">
        <button type="button" data-route="#/scroll">长卷</button>
        <button type="button" data-route="#/summary">总结</button>
        <button type="button" data-action="fullscreen" aria-label="进入全屏">全屏</button>
      </nav>
    </header>`;
};

export const renderCover = (lesson: LessonConfig): string => `
  <main class="cover view-enter">
    <img class="cover__image" src="${lesson.cover}" alt="《清明上河图》汴京街市局部" />
    <div class="cover__wash" aria-hidden="true"></div>
    <div class="cover__content">
      <p class="eyebrow">${lesson.eyebrow}</p>
      <h1>${lesson.title}</h1>
      <p class="cover__subtitle">${lesson.subtitle}</p>
      <p class="cover__description">${lesson.description}</p>
      <div class="cover__actions">
        ${navButton("开始展卷", { kind: "scroll" }, "button button--primary")}
        ${navButton("直接进入五幕", { kind: "scene", sceneId: lesson.scenes[0]?.id ?? "" }, "button button--quiet")}
      </div>
    </div>
    <div class="cover__index" aria-hidden="true">
      <span>北宋</span><strong>汴京</strong><span>十二世纪</span>
    </div>
    <p class="key-guide">按 → 开始 · 支持触屏与键盘</p>
  </main>`;

export const renderScroll = (lesson: LessonConfig): string => `
  <main class="scroll-view view-enter">
    <div class="scroll-view__intro">
      <div>
        <p class="eyebrow">全卷路径</p>
        <h1>由郊野，入汴京</h1>
      </div>
      <p>横向拖动长卷，观察叙事如何从安静走向繁华。点击下方题签进入局部赏析。</p>
    </div>
    <div class="scroll-stage" data-scroll-stage tabindex="0" aria-label="可横向拖动的《清明上河图》长卷">
      <div class="scroll-canvas">
        <img class="scroll-canvas__image" src="${lesson.fullScroll}" alt="《清明上河图》长卷全景" draggable="false" />
        <img class="scroll-canvas__rod" src="${lesson.scrollRod}" alt="" aria-hidden="true" />
      </div>
    </div>
    <nav class="scene-rail" aria-label="五幕场景">
      ${lesson.scenes
        .map(
          (scene) => `
            <button type="button" data-route="${sceneRoute(scene.id)}" style="--thumb:url('${scene.thumbnail}')">
              <span>0${scene.order}</span><strong>${scene.title}</strong>
            </button>`,
        )
        .join("")}
    </nav>
  </main>`;

const renderHotspots = (scene: LessonScene): string =>
  scene.hotspots
    .map(
      (hotspot, index) => `
        <button
          class="hotspot"
          type="button"
          style="left:${hotspot.x}%;top:${hotspot.y}%"
          data-hotspot="${index}"
          aria-label="观察点：${hotspot.title}"
        ><span>${index + 1}</span></button>`,
    )
    .join("");

export const renderScene = (lesson: LessonConfig, scene: LessonScene): string => {
  const sceneIndex = lesson.scenes.findIndex((item) => item.id === scene.id);
  const previous = lesson.scenes[sceneIndex - 1];
  const next = lesson.scenes[sceneIndex + 1];

  return `
    <main class="scene-view view-enter" data-scene-id="${scene.id}">
      <section class="scene-art" aria-label="${scene.title}画面">
        <div class="scene-artboard">
          <img src="${scene.image}" alt="${scene.title}" draggable="false" />
          ${renderHotspots(scene)}
        </div>
        <div class="scene-art__caption"><span>${scene.act}</span><strong>${scene.title}</strong></div>
      </section>
      <aside class="scene-inspector">
        <p class="eyebrow">局部赏析 · 0${scene.order}</p>
        <h1>${scene.title}</h1>
        <p class="scene-question"><span>观察任务</span>${scene.question}</p>
        <ul class="tag-list">${scene.tags.map((tag) => `<li>${tag}</li>`).join("")}</ul>
        <div class="scene-tools">
          <button class="text-action" type="button" data-action="toggle-hotspots">显示观察点</button>
          <button class="text-action text-action--accent" type="button" data-route="${panoramaRoute(scene.id)}">进入 360° 场景</button>
        </div>
        <div class="scene-pagination">
          ${previous ? navButton("← 上一幕", { kind: "scene", sceneId: previous.id }, "button button--quiet") : navButton("← 长卷", { kind: "scroll" }, "button button--quiet")}
          ${next ? navButton("下一幕 →", { kind: "scene", sceneId: next.id }, "button button--primary") : navButton("课堂总结 →", { kind: "summary" }, "button button--primary")}
        </div>
      </aside>
      <aside class="note-drawer" data-note aria-hidden="true">
        <button type="button" class="note-drawer__close" data-action="close-note" aria-label="关闭观察点">×</button>
        <p class="eyebrow">画中有话</p>
        <h2 data-note-title></h2>
        <p data-note-text></p>
        <blockquote data-note-question></blockquote>
      </aside>
    </main>`;
};

export const renderPanorama = (scene: LessonScene): string => `
  <main class="panorama-view view-enter">
    <div class="panorama-canvas" data-panorama aria-label="${scene.title} 360度观察"></div>
    <div class="panorama-tint" aria-hidden="true"></div>
    <div class="panorama-status" data-panorama-status>
      <span class="spinner" aria-hidden="true"></span>
      <strong>正在进入 ${scene.title}</strong>
      <small>读取 360° 场景</small>
    </div>
    <div class="panorama-copy">
      <p class="eyebrow">360° 沉浸观察</p>
      <h1>${scene.title}</h1>
      <p>拖拽旋转 · 滚轮或双指缩放</p>
    </div>
    <div class="panorama-actions">
      ${navButton("← 返回局部赏析", { kind: "scene", sceneId: scene.id }, "button button--glass")}
      <button class="button button--glass" type="button" data-action="fullscreen">全屏观察</button>
    </div>
  </main>`;

export const renderSummary = (lesson: LessonConfig): string => `
  <main class="summary-view view-enter">
    <header class="summary-view__head">
      <p class="eyebrow">课堂总结</p>
      <h1>从一幅画，看见一座城</h1>
      <p>《清明上河图》不只记录繁华，也记录繁华如何被劳动、交通与日常生活共同创造。</p>
    </header>
    <div class="summary-grid">
      ${lesson.summary
        .map(
          (section) => `
            <section class="summary-column">
              <span class="summary-column__marker" aria-hidden="true">${section.marker}</span>
              <h2>${section.title}</h2>
              <ul>${section.points.map((point) => `<li>${point}</li>`).join("")}</ul>
              <strong class="summary-column__takeaway">${section.takeaway}</strong>
            </section>`,
        )
        .join("")}
    </div>
    <footer class="summary-reflection">
      <div><span>课堂思考</span><p>${lesson.reflection}</p></div>
      <div class="summary-reflection__actions">
        ${navButton("再次展卷", { kind: "scroll" }, "button button--quiet")}
        ${navButton("回到封面", { kind: "cover" }, "button button--primary")}
      </div>
    </footer>
  </main>`;
