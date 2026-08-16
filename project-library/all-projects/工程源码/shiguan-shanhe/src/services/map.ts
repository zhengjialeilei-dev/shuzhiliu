import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import chinaGeoJson from "../data/china.geo.json";
import type { JourneyStop, Poem, RegionOption } from "../core/types";
import { normalizeMapCollection } from "./geo";

const SVG_NS = "http://www.w3.org/2000/svg";
type ProvinceFeature = Feature<Geometry, { name?: string }>;
const mapCollection = normalizeMapCollection(
  chinaGeoJson as FeatureCollection<Geometry, { name?: string }>
);

function svgElement<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, name);
}

export interface JourneyPlaybackEvents {
  onProgress: (progress: number, stopIndex: number, stop: JourneyStop) => void;
  onComplete: () => void;
}

export class PoetryMap {
  private readonly svg = svgElement("svg");
  private readonly viewportLayer = svgElement("g");
  private readonly provinceLayer = svgElement("g");
  private readonly routeLayer = svgElement("g");
  private readonly journeyLayer = svgElement("g");
  private readonly markerLayer = svgElement("g");
  private readonly projection: GeoProjection = geoMercator();
  private readonly path = geoPath(this.projection);
  private readonly markerElements = new Map<string, SVGGElement>();
  private readonly provinceElements = new Map<string, SVGPathElement>();
  private readonly resizeObserver: ResizeObserver;
  private visiblePoems: readonly Poem[] = [];
  private activePoemId = "";
  private activeRegion?: RegionOption;
  private routeVisible = true;
  private journeyFrame?: number;
  private journeyActive = false;
  private viewWidth = 1000;
  private viewHeight = 680;
  private viewScale = 1;
  private viewX = 0;
  private viewY = 0;
  private pointerId?: number;
  private pointerStart?: { x: number; y: number; viewX: number; viewY: number };
  private wasDragging = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly poems: readonly Poem[],
    private readonly onPoemSelect: (poemId: string) => void
  ) {
    this.svg.setAttribute("viewBox", "0 0 1000 680");
    this.svg.setAttribute("role", "img");
    this.svg.setAttribute("aria-label", "标有古诗创作地点和诗人行旅路线的中国地图");
    this.svg.innerHTML = `
      <defs>
        <linearGradient id="ink-land" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#183c4b" />
          <stop offset="0.55" stop-color="#2e5b5a" />
          <stop offset="1" stop-color="#687457" />
        </linearGradient>
        <filter id="paper-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#452d1b" flood-opacity="0.2" />
        </filter>
        <filter id="marker-glow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>`;
    this.provinceLayer.classList.add("province-layer");
    this.routeLayer.classList.add("route-layer");
    this.journeyLayer.classList.add("journey-layer");
    this.markerLayer.classList.add("marker-layer");
    this.viewportLayer.classList.add("map-viewport");
    this.viewportLayer.append(this.provinceLayer, this.routeLayer, this.journeyLayer, this.markerLayer);
    this.svg.append(this.viewportLayer);
    this.host.append(this.svg);
    this.bindNavigation();

    this.buildProvinces();
    this.buildMarkers();
    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(this.host);
    this.layout();
  }

  update(options: {
    visiblePoems: readonly Poem[];
    activePoemId: string;
    activeRegion: RegionOption;
    routeVisible: boolean;
  }): void {
    this.visiblePoems = options.visiblePoems;
    this.activePoemId = options.activePoemId;
    this.activeRegion = options.activeRegion;
    this.routeVisible = options.routeVisible;
    this.paintState();
  }

  dispose(): void {
    this.stopJourney();
    this.resizeObserver.disconnect();
  }

  focusPoem(poem: Poem): void {
    const point = this.projection(poem.location.coordinates);
    if (!point) return;
    const scale = this.viewWidth < 680 ? 2.15 : 2.75;
    this.setTransform(
      this.viewWidth * 0.5 - point[0] * scale,
      this.viewHeight * 0.5 - point[1] * scale,
      scale,
      true
    );
  }

  zoomIn(): void {
    this.zoomAt(this.viewWidth / 2, this.viewHeight / 2, 1.35);
  }

  zoomOut(): void {
    this.zoomAt(this.viewWidth / 2, this.viewHeight / 2, 1 / 1.35);
  }

  resetView(animate = true): void {
    this.setTransform(0, 0, 1, animate);
  }

  playJourney(poem: Poem, events: JourneyPlaybackEvents): void {
    this.stopJourney();
    const projectedStops = poem.journey
      .map((stop) => ({ stop, point: this.projection(stop.coordinates) }))
      .filter((item): item is { stop: JourneyStop; point: [number, number] } => Boolean(item.point));
    if (projectedStops.length < 2) return;

    this.journeyActive = true;
    this.drawRoute();
    const path = svgElement("path");
    path.classList.add("active-journey");
    path.setAttribute("d", this.createJourneyPath(projectedStops.map((item) => item.point)));
    this.journeyLayer.append(path);

    const stopElements = projectedStops.map(({ stop, point }, index) => {
      const group = svgElement("g");
      group.classList.add("journey-stop");
      group.setAttribute("transform", `translate(${point[0]} ${point[1]})`);
      group.innerHTML = `
        <circle class="journey-stop-ring" r="10"></circle>
        <circle class="journey-stop-core" r="3.5"></circle>
        <text class="journey-stop-number" text-anchor="middle" y="-15">${String(index + 1).padStart(2, "0")}</text>
        <g class="journey-stop-label" transform="translate(14 -12)">
          <rect width="${Math.max(64, stop.label.length * 15 + 20)}" height="27" rx="4"></rect>
          <text x="9" y="18">${stop.label}</text>
        </g>`;
      this.journeyLayer.append(group);
      return group;
    });

    const traveler = svgElement("g");
    traveler.classList.add("journey-traveler");
    traveler.innerHTML = `
      <circle class="traveler-aura" r="17"></circle>
      <circle class="traveler-ring" r="8"></circle>
      <path class="traveler-mark" d="M -3 -4 L 5 0 L -3 4 Z"></path>`;
    this.journeyLayer.append(traveler);

    const length = path.getTotalLength();
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);
    const duration = Math.min(10500, Math.max(5200, projectedStops.length * 1750));
    const startedAt = performance.now();
    let lastStopIndex = -1;

    const animate = (time: number): void => {
      const progress = Math.min(1, Math.max(0, (time - startedAt) / duration));
      const point = path.getPointAtLength(length * progress);
      traveler.setAttribute("transform", `translate(${point.x} ${point.y})`);
      path.style.strokeDashoffset = String(length * (1 - progress));

      const stopIndex = Math.min(projectedStops.length - 1, Math.floor(progress * projectedStops.length));
      stopElements.forEach((element, index) => {
        element.classList.toggle("is-visited", index <= stopIndex);
        element.classList.toggle("is-active", index === stopIndex);
      });
      if (stopIndex !== lastStopIndex) {
        lastStopIndex = stopIndex;
        events.onProgress(progress, stopIndex, projectedStops[stopIndex].stop);
      } else {
        events.onProgress(progress, stopIndex, projectedStops[stopIndex].stop);
      }

      if (progress < 1) {
        this.journeyFrame = requestAnimationFrame(animate);
      } else {
        this.journeyFrame = undefined;
        events.onComplete();
      }
    };
    this.journeyFrame = requestAnimationFrame(animate);
  }

  stopJourney(): void {
    if (this.journeyFrame !== undefined) cancelAnimationFrame(this.journeyFrame);
    this.journeyFrame = undefined;
    this.journeyActive = false;
    this.journeyLayer.replaceChildren();
    this.drawRoute();
  }

  private buildProvinces(): void {
    const collection = mapCollection;
    collection.features.forEach((feature) => {
      const name = feature.properties?.name?.trim();
      if (!name) return;
      const element = svgElement("path");
      element.classList.add("province");
      element.dataset.province = name;
      this.provinceLayer.append(element);
      this.provinceElements.set(name, element);
    });
  }

  private buildMarkers(): void {
    this.poems.forEach((poem) => {
      const group = svgElement("g");
      group.classList.add("poem-marker");
      group.dataset.poemId = poem.id;
      group.innerHTML = `
        <line class="marker-tether"></line>
        <g class="marker-visual">
          <circle class="marker-hit" r="17"></circle>
          <circle class="marker-aura" r="15"></circle>
          <circle class="marker-ring" r="8"></circle>
          <circle class="marker-core" r="3.6"></circle>
          <g class="marker-label" transform="translate(13 -14)">
            <rect x="0" y="0" rx="4" ry="4"></rect>
            <text x="9" y="17"></text>
          </g>
        </g>`;
      const text = group.querySelector("text");
      const rect = group.querySelector("rect");
      if (text && rect) {
        text.textContent = poem.title;
        rect.setAttribute("width", String(Math.max(68, poem.title.length * 15 + 18)));
        rect.setAttribute("height", "25");
      }
      const hit = group.querySelector<SVGCircleElement>(".marker-hit");
      hit?.setAttribute("role", "button");
      hit?.setAttribute("tabindex", "0");
      hit?.setAttribute("aria-label", `${poem.location.name}，《${poem.title}》，${poem.author}`);
      hit?.addEventListener("click", () => {
        if (!this.wasDragging) this.onPoemSelect(poem.id);
      });
      hit?.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.onPoemSelect(poem.id);
        }
      });
      this.markerLayer.append(group);
      this.markerElements.set(poem.id, group);
    });
  }

  private layout(): void {
    const width = Math.max(this.host.clientWidth, 520);
    const height = Math.max(this.host.clientHeight, 420);
    this.viewWidth = width;
    this.viewHeight = height;
    this.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.projection.fitExtent(
      [[42, 34], [width - 38, height - 38]],
      mapCollection
    );

    const collection = mapCollection;
    collection.features.forEach((feature) => {
      const name = feature.properties?.name?.trim();
      const element = name ? this.provinceElements.get(name) : undefined;
      if (element) element.setAttribute("d", this.path(feature as ProvinceFeature) ?? "");
    });

    const placedPoints: [number, number][] = [];
    this.poems.forEach((poem, poemIndex) => {
      const point = this.projection(poem.location.coordinates);
      const element = this.markerElements.get(poem.id);
      if (!point || !element) return;
      let displayPoint: [number, number] = [point[0], point[1]];
      let attempt = 0;
      while (placedPoints.some((placed) => Math.hypot(placed[0] - displayPoint[0], placed[1] - displayPoint[1]) < 27) && attempt < 18) {
        const angle = (poemIndex * 137.5 + attempt * 91) * Math.PI / 180;
        const radius = 24 + Math.floor(attempt / 6) * 16;
        displayPoint = [point[0] + Math.cos(angle) * radius, point[1] + Math.sin(angle) * radius];
        attempt += 1;
      }
      placedPoints.push(displayPoint);
      const dx = point[0] - displayPoint[0];
      const dy = point[1] - displayPoint[1];
      element.setAttribute("transform", `translate(${displayPoint[0]} ${displayPoint[1]})`);
      const tether = element.querySelector<SVGLineElement>(".marker-tether");
      if (tether) {
        tether.setAttribute("x1", "0");
        tether.setAttribute("y1", "0");
        tether.setAttribute("x2", String(dx));
        tether.setAttribute("y2", String(dy));
        tether.classList.toggle("is-visible", attempt > 0);
      }
    });
    this.paintState();
    this.applyTransform(false);
  }

  private bindNavigation(): void {
    this.svg.style.touchAction = "none";
    this.svg.addEventListener("wheel", (event) => {
      event.preventDefault();
      const point = this.eventPoint(event.clientX, event.clientY);
      this.zoomAt(point.x, point.y, Math.exp(-event.deltaY * 0.0015));
    }, { passive: false });

    this.svg.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      this.pointerId = event.pointerId;
      this.pointerStart = { x: event.clientX, y: event.clientY, viewX: this.viewX, viewY: this.viewY };
      this.wasDragging = false;
      this.svg.setPointerCapture(event.pointerId);
      this.svg.classList.add("is-dragging");
    });

    this.svg.addEventListener("pointermove", (event) => {
      if (this.pointerId !== event.pointerId || !this.pointerStart) return;
      const rect = this.svg.getBoundingClientRect();
      const dx = (event.clientX - this.pointerStart.x) * (this.viewWidth / rect.width);
      const dy = (event.clientY - this.pointerStart.y) * (this.viewHeight / rect.height);
      if (Math.hypot(dx, dy) > 4) this.wasDragging = true;
      this.setTransform(this.pointerStart.viewX + dx, this.pointerStart.viewY + dy, this.viewScale, false);
    });

    const endPointer = (event: PointerEvent): void => {
      if (this.pointerId !== event.pointerId) return;
      this.pointerId = undefined;
      this.pointerStart = undefined;
      this.svg.classList.remove("is-dragging");
      window.setTimeout(() => { this.wasDragging = false; }, 0);
    };
    this.svg.addEventListener("pointerup", endPointer);
    this.svg.addEventListener("pointercancel", endPointer);
    this.svg.addEventListener("dblclick", (event) => {
      event.preventDefault();
      const point = this.eventPoint(event.clientX, event.clientY);
      this.zoomAt(point.x, point.y, 1.5);
    });
  }

  private eventPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (this.viewWidth / rect.width),
      y: (clientY - rect.top) * (this.viewHeight / rect.height)
    };
  }

  private zoomAt(x: number, y: number, factor: number): void {
    const nextScale = Math.min(6, Math.max(1, this.viewScale * factor));
    const ratio = nextScale / this.viewScale;
    this.setTransform(x - (x - this.viewX) * ratio, y - (y - this.viewY) * ratio, nextScale, true);
  }

  private setTransform(x: number, y: number, scale: number, animate: boolean): void {
    const padding = 44;
    this.viewScale = Math.min(6, Math.max(1, scale));
    if (this.viewScale === 1) {
      this.viewX = 0;
      this.viewY = 0;
    } else {
      this.viewX = Math.min(padding, Math.max(this.viewWidth * (1 - this.viewScale) - padding, x));
      this.viewY = Math.min(padding, Math.max(this.viewHeight * (1 - this.viewScale) - padding, y));
    }
    this.applyTransform(animate);
  }

  private applyTransform(animate: boolean): void {
    this.viewportLayer.classList.toggle("is-animating", animate);
    this.viewportLayer.style.transform = `translate(${this.viewX}px, ${this.viewY}px) scale(${this.viewScale})`;
    this.markerElements.forEach((element) => {
      element.style.setProperty("--marker-scale", String(1 / Math.sqrt(this.viewScale)));
    });
    if (animate) window.setTimeout(() => this.viewportLayer.classList.remove("is-animating"), 520);
  }

  private paintState(): void {
    const visibleIds = new Set(this.visiblePoems.map((poem) => poem.id));
    this.markerElements.forEach((element, id) => {
      element.classList.toggle("is-visible", visibleIds.has(id));
      element.classList.toggle("is-active", id === this.activePoemId);
    });

    const regionProvinces = new Set(this.activeRegion?.provinces ?? []);
    const activePoem = this.poems.find((poem) => poem.id === this.activePoemId);
    this.provinceElements.forEach((element, name) => {
      element.classList.toggle("is-region", regionProvinces.has(name));
      element.classList.toggle("is-active", activePoem?.location.province === name);
    });

    this.drawRoute();
  }

  private drawRoute(): void {
    this.routeLayer.replaceChildren();
    if (this.journeyActive) return;
    if (!this.routeVisible || this.visiblePoems.length < 2) return;

    const ordered = [...this.visiblePoems]
      .sort((a, b) => a.location.coordinates[0] - b.location.coordinates[0])
      .slice(0, 10);
    const points = ordered
      .map((poem) => this.projection(poem.location.coordinates))
      .filter((point): point is [number, number] => Boolean(point));
    if (points.length < 2) return;

    const line = svgElement("path");
    line.classList.add("poetry-route");
    const pathData = points.reduce((result, point, index) => {
      if (index === 0) return `M ${point[0]} ${point[1]}`;
      const previous = points[index - 1];
      const midX = (previous[0] + point[0]) / 2;
      return `${result} Q ${midX} ${previous[1] - 18} ${point[0]} ${point[1]}`;
    }, "");
    line.setAttribute("d", pathData);
    this.routeLayer.append(line);
  }

  private createJourneyPath(points: readonly [number, number][]): string {
    return points.reduce((result, point, index) => {
      if (index === 0) return `M ${point[0]} ${point[1]}`;
      const previous = points[index - 1];
      const midX = (previous[0] + point[0]) / 2;
      const curve = Math.min(28, Math.abs(point[0] - previous[0]) * 0.08 + 8);
      return `${result} Q ${midX} ${Math.min(previous[1], point[1]) - curve} ${point[0]} ${point[1]}`;
    }, "");
  }
}
