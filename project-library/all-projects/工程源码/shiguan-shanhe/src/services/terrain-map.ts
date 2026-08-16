import L, {
  type GeoJSON as LeafletGeoJSON,
  type Layer,
  type Map as LeafletMap,
  type Marker,
  type Path,
  type Polyline,
  type TileLayer,
} from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import chinaGeoJson from "../data/china.geo.json";
import type { JourneyStop, Poem, RegionOption } from "../core/types";

type ProvinceFeature = Feature<Geometry, { name?: string }>;

const chinaCollection = chinaGeoJson as FeatureCollection<Geometry, { name?: string }>;
const CHINA_BOUNDS = L.latLngBounds([17.5, 73.2], [53.8, 134.8]);
const TERRAIN_TILE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";

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

export interface JourneyPlaybackEvents {
  onProgress: (progress: number, stopIndex: number, stop: JourneyStop) => void;
  onComplete: () => void;
}

/**
 * Network terrain-map implementation of the poetry atlas map contract.
 * Leaflet owns pan/zoom and tile lifecycle; poetry data and app flows stay independent.
 */
export class PoetryMap {
  private readonly map: LeafletMap;
  private readonly tileLayer: TileLayer;
  private readonly canvasRenderer = L.canvas({ padding: 0.38, tolerance: 6 });
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
    this.host.classList.add("terrain-poetry-map");
    this.host.setAttribute("aria-label", "可缩放的中国地形诗歌地图");

    this.map = L.map(this.host, {
      center: [35.3, 104.2],
      zoom: 4,
      minZoom: 3,
      maxZoom: 10,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 90,
      zoomControl: false,
      preferCanvas: true,
      attributionControl: true,
      fadeAnimation: true,
      zoomAnimation: true,
      markerZoomAnimation: true,
      inertia: true,
      inertiaDeceleration: 3600,
      maxBounds: CHINA_BOUNDS.pad(0.34),
      maxBoundsViscosity: 0.72,
    });

    this.createPanes();
    this.tileLayer = L.tileLayer(TERRAIN_TILE_URL, {
      minZoom: 3,
      maxZoom: 10,
      maxNativeZoom: 10,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 2,
      detectRetina: false,
      crossOrigin: true,
      attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> · Sources: Esri, USGS, NOAA, GIS Community',
    }).addTo(this.map);
    this.bindTileHealth();

    this.provinceLayer = L.geoJSON(chinaCollection, {
      pane: "provincePane",
      interactive: false,
      style: (feature) => this.provinceStyle(feature as ProvinceFeature | undefined),
      onEachFeature: (feature, layer) => {
        const name = (feature as ProvinceFeature).properties?.name?.trim();
        if (name && layer instanceof L.Path) this.provinceElements.set(name, layer);
      },
    }).addTo(this.map);

    this.buildMarkers();
    L.control.scale({ imperial: false, position: "bottomright", maxWidth: 100 }).addTo(this.map);
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
    const targetZoom = Math.max(6.25, Math.min(7, this.map.getZoom() + 1.5));
    this.map.flyTo(toLatLng(poem.location.coordinates), targetZoom, {
      animate: true,
      duration: 0.48,
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
    this.map.setView([35.4, 104.6], wideViewport ? 5 : 4, {
      animate,
      duration: animate ? 0.5 : 0,
    });
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
      color: "#a63c31",
      opacity: 0.95,
      weight: 3,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(this.map);
    this.journeyLayers.push(path);

    const stopMarkers = poem.journey.map((stop, index) => {
      const circle = L.circleMarker(toLatLng(stop.coordinates), {
        pane: "journeyPane",
        renderer: this.canvasRenderer,
        radius: 6,
        color: "#f5dfb8",
        weight: 2,
        fillColor: "#8e3428",
        fillOpacity: 0.9,
      }).addTo(this.map);
      const label = L.marker(toLatLng(stop.coordinates), {
        pane: "journeyPane",
        interactive: false,
        icon: L.divIcon({
          className: "journey-leaflet-label-shell",
          html: `<span class="journey-leaflet-label"><i>${String(index + 1).padStart(2, "0")}</i>${escapeHtml(stop.label)}</span>`,
          iconAnchor: [-10, 24],
        }),
      }).addTo(this.map);
      this.journeyLayers.push(circle, label);
      return { circle, label };
    });

    const traveler = L.marker(stops[0], {
      pane: "journeyPane",
      interactive: false,
      icon: L.divIcon({
        className: "journey-traveler-shell",
        html: '<span class="journey-leaflet-traveler"><i></i></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    }).addTo(this.map);
    this.journeyLayers.push(traveler);

    const routeBounds = L.latLngBounds(stops);
    this.map.flyToBounds(routeBounds, {
      paddingTopLeft: [180, 100],
      paddingBottomRight: [180, 130],
      maxZoom: 6.5,
      duration: 0.6,
    });

    const duration = Math.min(11000, Math.max(5600, stops.length * 1850));
    const startedAt = performance.now() + 420;
    let lastRenderedAt = 0;
    let lastStopIndex = -1;

    const animate = (time: number): void => {
      const progress = Math.min(1, Math.max(0, (time - startedAt) / duration));
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

      if (time - lastRenderedAt > 32 || progress === 1) {
        lastRenderedAt = time;
        path.setLatLngs([...stops.slice(0, segmentIndex + 1), current]);
      }

      const stopIndex = Math.min(stops.length - 1, Math.floor(progress * stops.length));
      if (stopIndex !== lastStopIndex) {
        lastStopIndex = stopIndex;
        stopMarkers.forEach(({ circle, label }, index) => {
          const visited = index <= stopIndex;
          circle.setStyle({
            radius: index === stopIndex ? 8 : 6,
            fillColor: visited ? "#a93b2e" : "#6f7658",
            fillOpacity: visited ? 1 : 0.58,
          });
          label.getElement()?.classList.toggle("is-active", index === stopIndex);
        });
      }
      events.onProgress(progress, stopIndex, poem.journey[stopIndex]);

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
    this.journeyLayers.forEach((layer) => layer.remove());
    this.journeyLayers = [];
    this.drawRoute();
  }

  private createPanes(): void {
    const paneLevels = {
      provincePane: 330,
      routePane: 420,
      poemMarkerPane: 510,
      journeyPane: 560,
    } as const;
    Object.entries(paneLevels).forEach(([name, zIndex]) => {
      const pane = this.map.createPane(name);
      pane.style.zIndex = String(zIndex);
    });
  }

  private bindTileHealth(): void {
    let loadedOnce = false;
    this.tileLayer.on("tileload", () => {
      if (loadedOnce) return;
      loadedOnce = true;
      this.host.classList.add("has-terrain-tiles");
      this.host.classList.remove("terrain-tiles-unavailable");
    });
    this.tileLayer.on("tileerror", () => {
      if (!loadedOnce) this.host.classList.add("terrain-tiles-unavailable");
    });
  }

  private provinceStyle(feature?: ProvinceFeature): L.PathOptions {
    const name = feature?.properties?.name?.trim() ?? "";
    const regionProvinces = new Set(this.activeRegion?.provinces ?? []);
    const activePoem = this.poems.find((poem) => poem.id === this.activePoemId);
    const isActive = activePoem?.location.province === name;
    const isRegion = regionProvinces.has(name);
    return {
      renderer: this.canvasRenderer,
      color: isActive ? "#f0d4ae" : isRegion ? "#dcc798" : "rgba(30, 62, 59, 0.72)",
      weight: isActive ? 2.1 : isRegion ? 1.55 : 0.75,
      opacity: name ? 0.9 : 0,
      fillColor: isActive ? "#8f493c" : isRegion ? "#486660" : "#294c49",
      fillOpacity: isActive ? 0.34 : isRegion ? 0.2 : 0.075,
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
          className: "poem-leaflet-marker-shell",
          html: `
            <span class="poem-leaflet-marker" aria-hidden="true">
              <i class="poem-leaflet-aura"></i>
              <i class="poem-leaflet-ring"></i>
              <i class="poem-leaflet-core"></i>
              <b>${escapeHtml(poem.title)}</b>
            </span>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
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
      color: "#a13c31",
      opacity: 0.68,
      weight: 1.6,
      dashArray: "6 8",
      lineCap: "round",
      interactive: false,
      smoothFactor: 1.7,
    }).addTo(this.map);
  }
}
