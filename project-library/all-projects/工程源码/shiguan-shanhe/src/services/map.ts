import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import chinaGeoJson from "../data/china.geo.json";
import type { Poem, RegionOption } from "../core/types";
import { normalizeMapCollection } from "./geo";

const SVG_NS = "http://www.w3.org/2000/svg";
type ProvinceFeature = Feature<Geometry, { name?: string }>;
const mapCollection = normalizeMapCollection(
  chinaGeoJson as FeatureCollection<Geometry, { name?: string }>
);

function svgElement<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, name);
}

export class PoetryMap {
  private readonly svg = svgElement("svg");
  private readonly provinceLayer = svgElement("g");
  private readonly routeLayer = svgElement("g");
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
    this.markerLayer.classList.add("marker-layer");
    this.svg.append(this.provinceLayer, this.routeLayer, this.markerLayer);
    this.host.append(this.svg);

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
    this.resizeObserver.disconnect();
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
      group.setAttribute("role", "button");
      group.setAttribute("tabindex", "0");
      group.setAttribute("aria-label", `${poem.location.name}，《${poem.title}》，${poem.author}`);
      group.innerHTML = `
        <circle class="marker-aura" r="15"></circle>
        <circle class="marker-ring" r="8"></circle>
        <circle class="marker-core" r="3.6"></circle>
        <g class="marker-label" transform="translate(13 -14)">
          <rect x="0" y="0" rx="4" ry="4"></rect>
          <text x="9" y="17"></text>
        </g>`;
      const text = group.querySelector("text");
      const rect = group.querySelector("rect");
      if (text && rect) {
        text.textContent = poem.title;
        rect.setAttribute("width", String(Math.max(68, poem.title.length * 15 + 18)));
        rect.setAttribute("height", "25");
      }
      group.addEventListener("click", () => this.onPoemSelect(poem.id));
      group.addEventListener("keydown", (event) => {
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

    this.poems.forEach((poem) => {
      const point = this.projection(poem.location.coordinates);
      const element = this.markerElements.get(poem.id);
      if (point && element) element.setAttribute("transform", `translate(${point[0]} ${point[1]})`);
    });
    this.paintState();
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
}
