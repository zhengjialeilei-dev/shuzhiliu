import L, {
  type GeoJSON as LeafletGeoJSON,
  type Layer,
  type Map as LeafletMap,
  type Marker,
  type Path,
  type Polyline,
} from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import poetRiderSpriteUrl from "../assets/poet-rider-sprite.png?inline";
import chinaGeoJson from "../data/china.geo.json";
import type { JourneyStop, Poem, RegionOption } from "../core/types";

type ProvinceFeature = Feature<Geometry, { name?: string }>;

const chinaCollection = chinaGeoJson as FeatureCollection<Geometry, { name?: string }>;
const CHINA_BOUNDS = L.latLngBounds([17.5, 73.2], [53.8, 134.8]);
const PROVINCE_COLORS = ["#f3c879", "#abd69f", "#92c9c1", "#f2a98f", "#c4b9df", "#f5d89d", "#9fc5df"];

const RIVERS = [
  {
    name: "黄河",
    color: "#4ba6c8",
    labelAt: [37.6, 109.2] as L.LatLngTuple,
    points: [[35.1, 96.2], [36.4, 101.8], [36.9, 105.6], [39.7, 106.7], [40.7, 110.1], [37.4, 112.2], [35.2, 116.3], [37.5, 119.1]] as L.LatLngTuple[],
  },
  {
    name: "长江",
    color: "#398eb7",
    labelAt: [29.4, 109.1] as L.LatLngTuple,
    points: [[33.1, 91.2], [31.8, 96.4], [28.6, 102.2], [29.6, 105.3], [30.6, 111.1], [30.4, 114.4], [31.2, 121.6]] as L.LatLngTuple[],
  },
] as const;

const TERRAIN_NOTES = [
  { label: "天山", position: [43.1, 84.8] as L.LatLngTuple, kind: "mountain" },
  { label: "祁连山", position: [38.4, 98.4] as L.LatLngTuple, kind: "mountain" },
  { label: "秦岭", position: [33.7, 108.2] as L.LatLngTuple, kind: "mountain" },
  { label: "太行山", position: [37.2, 113.8] as L.LatLngTuple, kind: "mountain" },
  { label: "江南水乡", position: [29.2, 119.0] as L.LatLngTuple, kind: "water" },
  { label: "巴蜀山川", position: [30.0, 103.0] as L.LatLngTuple, kind: "forest" },
] as const;

function toLatLng(coordinates: readonly [number, number]): L.LatLngTuple {
  return [coordinates[1], coordinates[0]];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function colorForProvince(name: string): string {
  const seed = [...name].reduce((sum, character) => sum + (character.codePointAt(0) ?? 0), 0);
  return PROVINCE_COLORS[seed % PROVINCE_COLORS.length];
}

export interface JourneyPlaybackEvents {
  onProgress: (progress: number, stopIndex: number, stop: JourneyStop) => void;
  onComplete: () => void;
}

/** Offline illustrated atlas adapter. Business data and scene flows remain independent. */
export class PoetryMap {
  private readonly map: LeafletMap;
  private readonly canvasRenderer = L.canvas({ padding: 0.4, tolerance: 7 });
  private readonly provinceLayer: LeafletGeoJSON;
  private readonly provinceElements = new Map<string, Path>();
  private readonly markerElements = new Map<string, Marker>();
  private readonly resizeObserver: ResizeObserver;
  private visiblePoems: readonly Poem[] = [];
  private activePoemId = "";
  private activeRegion?: RegionOption;
  private routeVisible = true;
  private routeLayer?: Polyline;
  private journeyLayers: Layer[] = [];
  private journeyFrame?: number;
  private journeyActive = false;
  private resizeFrame?: number;

  constructor(
    private readonly host: HTMLElement,
    private readonly poems: readonly Poem[],
    private readonly onPoemSelect: (poemId: string) => void
  ) {
    this.host.classList.add("student-poetry-map");
    this.host.setAttribute("aria-label", "可缩放、可离线使用的中国古诗研学地图");

    this.map = L.map(this.host, {
      center: [35.2, 104.4],
      zoom: 4,
      minZoom: 3,
      maxZoom: 9,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 95,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      fadeAnimation: false,
      zoomAnimation: true,
      markerZoomAnimation: true,
      inertia: true,
      inertiaDeceleration: 3800,
      maxBounds: CHINA_BOUNDS.pad(0.28),
      maxBoundsViscosity: 0.78,
    });

    this.createPanes();
    this.provinceLayer = L.geoJSON(chinaCollection, {
      pane: "provincePane",
      interactive: false,
      style: (feature) => this.provinceStyle(feature as ProvinceFeature | undefined),
      onEachFeature: (feature, layer) => {
        const name = (feature as ProvinceFeature).properties?.name?.trim();
        if (name && layer instanceof L.Path) this.provinceElements.set(name, layer);
      },
    }).addTo(this.map);

    this.addOfflineGeography();
    this.buildMarkers();
    this.addOfflineBadge();
    this.resetView(false);

    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeFrame !== undefined) cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = undefined;
        this.map.invalidateSize({ animate: false, pan: false });
      });
    });
    this.resizeObserver.observe(this.host);
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
    if (this.resizeFrame !== undefined) cancelAnimationFrame(this.resizeFrame);
    this.resizeObserver.disconnect();
    this.map.remove();
  }

  focusPoem(poem: Poem): void {
    const targetZoom = Math.max(6.2, Math.min(7, this.map.getZoom() + 1.5));
    this.map.flyTo(toLatLng(poem.location.coordinates), targetZoom, {
      animate: true,
      duration: 0.52,
      easeLinearity: 0.22,
      noMoveStart: true,
    });
  }

  zoomIn(): void {
    this.map.zoomIn(1, { animate: true });
  }

  zoomOut(): void {
    this.map.zoomOut(1, { animate: true });
  }

  resetView(animate = true): void {
    const wideViewport = this.host.clientWidth / Math.max(this.host.clientHeight, 1) > 1.55;
    this.map.setView([35.2, 104.4], wideViewport ? 5 : 4, { animate, duration: animate ? 0.5 : 0 });
  }

  playJourney(poem: Poem, events: JourneyPlaybackEvents): void {
    this.stopJourney();
    if (poem.journey.length < 2) return;

    this.journeyActive = true;
    this.drawRoute();
    const stops = poem.journey.map((stop) => L.latLng(toLatLng(stop.coordinates)));
    const totalDistance = stops.slice(1).reduce((sum, point, index) => sum + stops[index].distanceTo(point), 0);
    if (totalDistance <= 0) return;

    const path = L.polyline([stops[0]], {
      pane: "journeyPane",
      renderer: this.canvasRenderer,
      color: "#e3683d",
      opacity: 0.96,
      weight: 5,
      lineCap: "round",
      lineJoin: "round",
      dashArray: "3 10",
    }).addTo(this.map);
    this.journeyLayers.push(path);

    const stopMarkers = poem.journey.map((stop, index) => {
      const circle = L.circleMarker(toLatLng(stop.coordinates), {
        pane: "journeyPane",
        renderer: this.canvasRenderer,
        radius: 8,
        color: "#fff4cf",
        weight: 3,
        fillColor: "#e3683d",
        fillOpacity: 0.98,
      }).addTo(this.map);
      const label = L.marker(toLatLng(stop.coordinates), {
        pane: "journeyPane",
        interactive: false,
        icon: L.divIcon({
          className: "journey-leaflet-label-shell student-journey-label-shell",
          html: `<span class="journey-leaflet-label"><i>${index + 1}</i>${escapeHtml(stop.label)}</span>`,
          iconAnchor: [-12, 26],
        }),
      }).addTo(this.map);
      this.journeyLayers.push(circle, label);
      return { circle, label };
    });

    const traveler = L.marker(stops[0], {
      pane: "travelerPane",
      interactive: false,
      icon: L.divIcon({
        className: "journey-traveler-shell student-rider-shell",
        html: '<span class="student-rider"><i class="student-rider-sprite"></i><b aria-hidden="true"></b></span>',
        iconSize: [88, 126],
        iconAnchor: [44, 112],
      }),
    }).addTo(this.map);
    const attachSprite = (): void => {
      const sprite = traveler.getElement()?.querySelector<HTMLElement>(".student-rider-sprite");
      if (sprite) sprite.style.backgroundImage = `url("${poetRiderSpriteUrl}")`;
    };
    attachSprite();
    traveler.on("add", attachSprite);
    this.journeyLayers.push(traveler);

    this.map.flyToBounds(L.latLngBounds(stops), {
      paddingTopLeft: [190, 120],
      paddingBottomRight: [190, 150],
      maxZoom: 6.5,
      duration: 0.65,
    });

    const duration = Math.min(12500, Math.max(6500, stops.length * 2100));
    const startedAt = performance.now() + 460;
    let lastRenderedAt = 0;
    let lastStopIndex = -1;

    const animate = (time: number): void => {
      const linearProgress = Math.min(1, Math.max(0, (time - startedAt) / duration));
      const progress = linearProgress < 0.5
        ? 2 * linearProgress * linearProgress
        : 1 - ((-2 * linearProgress + 2) ** 2) / 2;
      const traveledDistance = totalDistance * progress;
      let accumulated = 0;
      let segmentIndex = 0;
      let segmentProgress = 0;

      for (let index = 0; index < stops.length - 1; index += 1) {
        const segmentDistance = stops[index].distanceTo(stops[index + 1]);
        if (traveledDistance <= accumulated + segmentDistance || index === stops.length - 2) {
          segmentIndex = index;
          segmentProgress = segmentDistance === 0 ? 1 : (traveledDistance - accumulated) / segmentDistance;
          break;
        }
        accumulated += segmentDistance;
      }

      const from = stops[segmentIndex];
      const to = stops[segmentIndex + 1];
      const current = L.latLng(
        from.lat + (to.lat - from.lat) * segmentProgress,
        from.lng + (to.lng - from.lng) * segmentProgress
      );
      traveler.setLatLng(current);
      traveler.getElement()?.classList.toggle("is-facing-left", to.lng < from.lng);

      if (time - lastRenderedAt > 32 || linearProgress === 1) {
        lastRenderedAt = time;
        path.setLatLngs([...stops.slice(0, segmentIndex + 1), current]);
      }

      const stopIndex = Math.min(stops.length - 1, Math.floor(linearProgress * stops.length));
      if (stopIndex !== lastStopIndex) {
        lastStopIndex = stopIndex;
        stopMarkers.forEach(({ circle, label }, index) => {
          const visited = index <= stopIndex;
          circle.setStyle({ radius: index === stopIndex ? 10 : 8, fillColor: visited ? "#e3683d" : "#76aa91" });
          label.getElement()?.classList.toggle("is-active", index === stopIndex);
        });
      }
      events.onProgress(linearProgress, stopIndex, poem.journey[stopIndex]);

      if (linearProgress < 1) this.journeyFrame = requestAnimationFrame(animate);
      else {
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
    this.journeyLayers.forEach((layer) => layer.remove());
    this.journeyLayers = [];
    this.drawRoute();
  }

  private createPanes(): void {
    const paneLevels = { provincePane: 330, riverPane: 360, decorationPane: 390, routePane: 420, poemMarkerPane: 510, journeyPane: 560, travelerPane: 610 } as const;
    Object.entries(paneLevels).forEach(([name, zIndex]) => {
      const pane = this.map.createPane(name);
      pane.style.zIndex = String(zIndex);
    });
  }

  private addOfflineGeography(): void {
    RIVERS.forEach((river) => {
      L.polyline(river.points, {
        pane: "riverPane",
        renderer: this.canvasRenderer,
        color: "#d9f4ef",
        opacity: 0.78,
        weight: 5,
        lineCap: "round",
        smoothFactor: 2,
        interactive: false,
      }).addTo(this.map);
      L.polyline(river.points, {
        pane: "riverPane",
        renderer: this.canvasRenderer,
        color: river.color,
        opacity: 0.76,
        weight: 2,
        lineCap: "round",
        smoothFactor: 2,
        interactive: false,
      }).addTo(this.map);
      L.marker(river.labelAt, {
        pane: "decorationPane",
        interactive: false,
        icon: L.divIcon({ className: "student-river-label-shell", html: `<span>${river.name}</span>` }),
      }).addTo(this.map);
    });

    TERRAIN_NOTES.forEach((note) => {
      L.marker(note.position, {
        pane: "decorationPane",
        interactive: false,
        icon: L.divIcon({
          className: "student-terrain-note-shell",
          html: `<span class="student-terrain-note is-${note.kind}"><i></i><b>${note.label}</b></span>`,
          iconSize: [74, 50],
          iconAnchor: [37, 25],
        }),
      }).addTo(this.map);
    });
  }

  private addOfflineBadge(): void {
    const badge = new L.Control({ position: "bottomright" });
    badge.onAdd = () => {
      const element = L.DomUtil.create("div", "student-map-badge");
      element.innerHTML = "<b>离线研学地图</b><span>山川为意象示意</span>";
      return element;
    };
    badge.addTo(this.map);
  }

  private provinceStyle(feature?: ProvinceFeature): L.PathOptions {
    const name = feature?.properties?.name?.trim() ?? "";
    const regionProvinces = new Set(this.activeRegion?.provinces ?? []);
    const activePoem = this.poems.find((poem) => poem.id === this.activePoemId);
    const isActive = activePoem?.location.province === name;
    const isRegion = regionProvinces.has(name);
    return {
      renderer: this.canvasRenderer,
      color: isActive ? "#c45135" : isRegion ? "#568f78" : "rgba(81, 104, 86, 0.72)",
      weight: isActive ? 3 : isRegion ? 2 : 1.15,
      opacity: name ? 1 : 0,
      fillColor: isActive ? "#ffbd73" : isRegion ? "#dff0aa" : colorForProvince(name),
      fillOpacity: isActive ? 0.98 : isRegion ? 0.96 : 0.9,
      lineCap: "round",
      lineJoin: "round",
    };
  }

  private buildMarkers(): void {
    this.poems.forEach((poem) => {
      const marker = L.marker(toLatLng(poem.location.coordinates), {
        pane: "poemMarkerPane",
        keyboard: true,
        riseOnHover: true,
        riseOffset: 120,
        title: `《${poem.title}》· ${poem.author}`,
        alt: `${poem.location.name}，《${poem.title}》，${poem.author}`,
        icon: L.divIcon({
          className: "poem-leaflet-marker-shell student-poem-marker-shell",
          html: `<span class="poem-leaflet-marker" aria-hidden="true"><i class="poem-leaflet-aura"></i><i class="poem-leaflet-ring"></i><em>诗</em><b>${escapeHtml(poem.title)}</b></span>`,
          iconSize: [36, 42],
          iconAnchor: [18, 36],
        }),
      });
      marker.on("click", () => this.onPoemSelect(poem.id));
      marker.on("add", () => {
        const element = marker.getElement();
        element?.setAttribute("role", "button");
        element?.setAttribute("aria-label", `${poem.location.name}，《${poem.title}》，${poem.author}`);
      });
      this.markerElements.set(poem.id, marker);
    });
  }

  private paintState(): void {
    const visibleIds = new Set(this.visiblePoems.map((poem) => poem.id));
    this.markerElements.forEach((marker, id) => {
      const visible = visibleIds.has(id);
      const onMap = this.map.hasLayer(marker);
      if (visible && !onMap) marker.addTo(this.map);
      if (!visible && onMap) marker.remove();
      marker.getElement()?.classList.toggle("is-active", id === this.activePoemId);
    });
    this.provinceLayer.setStyle((feature) => this.provinceStyle(feature as ProvinceFeature | undefined));
    this.drawRoute();
  }

  private drawRoute(): void {
    this.routeLayer?.remove();
    this.routeLayer = undefined;
    if (this.journeyActive || !this.routeVisible || this.visiblePoems.length < 2) return;
    const routePoems = [...this.visiblePoems]
      .sort((a, b) => a.location.coordinates[0] - b.location.coordinates[0])
      .slice(0, 12);
    this.routeLayer = L.polyline(routePoems.map((poem) => toLatLng(poem.location.coordinates)), {
      pane: "routePane",
      renderer: this.canvasRenderer,
      color: "#db6542",
      opacity: 0.72,
      weight: 2.2,
      dashArray: "2 9",
      lineCap: "round",
      interactive: false,
      smoothFactor: 1.8,
    }).addTo(this.map);
  }
}
