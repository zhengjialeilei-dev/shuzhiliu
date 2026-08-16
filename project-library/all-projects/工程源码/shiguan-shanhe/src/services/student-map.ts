import L, {
  type Layer,
  type Map as LeafletMap,
  type Marker,
  type Polyline,
} from "leaflet";
import "leaflet/dist/leaflet.css";
import poetRiderSpriteUrl from "../assets/poet-rider-sprite.png?inline";
import tangDynastyMapUrl from "../assets/tang-dynasty-map-ccby.png?inline";
import type { JourneyStop, Poem, RegionOption } from "../core/types";

const TANG_MAP_WIDTH = 1752;
const TANG_MAP_HEIGHT = 1245;
const TANG_MAP_BOUNDS = L.latLngBounds([0, 0], [TANG_MAP_HEIGHT, TANG_MAP_WIDTH]);
const TANG_CORE_BOUNDS = L.latLngBounds(
  [TANG_MAP_HEIGHT - 1080, 540],
  [TANG_MAP_HEIGHT - 300, 1540]
);

/**
 * Affine calibration from geographic coordinates to this historical map's pixels.
 * Control points: Dunhuang, Lanzhou, Chang'an, Beijing, Guangzhou and Hangzhou.
 */
function toTangLatLng(coordinates: readonly [number, number]): L.LatLng {
  const [longitude, latitude] = coordinates;
  const x = 19.644801 * longitude + 0.53138 * latitude - 1013.11182;
  const y = -2.160393 * longitude - 30.133224 * latitude + 1968.592459;
  return L.latLng(TANG_MAP_HEIGHT - y, x);
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

/** Offline illustrated atlas adapter. Business data and scene flows remain independent. */
export class PoetryMap {
  private readonly map: LeafletMap;
  private readonly canvasRenderer = L.canvas({ padding: 0.4, tolerance: 7 });
  private readonly markerElements = new Map<string, Marker>();
  private readonly resizeObserver: ResizeObserver;
  private visiblePoems: readonly Poem[] = [];
  private activePoemId = "";
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
    this.host.setAttribute("aria-label", "可缩放、可离线使用的唐朝古诗研学地图");

    this.map = L.map(this.host, {
      crs: L.CRS.Simple,
      center: toTangLatLng([105, 35]),
      zoom: 0,
      minZoom: -1.25,
      maxZoom: 3,
      zoomSnap: 0.25,
      zoomDelta: 0.75,
      wheelPxPerZoomLevel: 95,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      fadeAnimation: false,
      zoomAnimation: true,
      markerZoomAnimation: true,
      inertia: true,
      inertiaDeceleration: 3800,
      maxBounds: TANG_MAP_BOUNDS.pad(0.04),
      maxBoundsViscosity: 0.78,
    });

    this.createPanes();
    L.imageOverlay(tangDynastyMapUrl, TANG_MAP_BOUNDS, {
      pane: "baseMapPane",
      opacity: 0.96,
      interactive: false,
      className: "tang-history-image",
    }).addTo(this.map);

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
    const targetZoom = Math.max(1.25, Math.min(2.25, this.map.getZoom() + 1.25));
    this.map.flyTo(toTangLatLng(poem.location.coordinates), targetZoom, {
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
    this.map.fitBounds(TANG_CORE_BOUNDS, {
      animate,
      duration: animate ? 0.5 : 0,
      padding: this.host.clientWidth < 720 ? [8, 8] : [20, 20],
    });
  }

  playJourney(poem: Poem, events: JourneyPlaybackEvents): void {
    this.stopJourney();
    if (poem.journey.length < 2) return;

    this.journeyActive = true;
    this.drawRoute();
    const stops = poem.journey.map((stop) => toTangLatLng(stop.coordinates));
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
      const circle = L.circleMarker(toTangLatLng(stop.coordinates), {
        pane: "journeyPane",
        renderer: this.canvasRenderer,
        radius: 8,
        color: "#fff4cf",
        weight: 3,
        fillColor: "#e3683d",
        fillOpacity: 0.98,
      }).addTo(this.map);
      const label = L.marker(toTangLatLng(stop.coordinates), {
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
      maxZoom: 1.75,
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
    const paneLevels = { baseMapPane: 210, routePane: 420, poemMarkerPane: 510, journeyPane: 560, travelerPane: 610 } as const;
    Object.entries(paneLevels).forEach(([name, zIndex]) => {
      const pane = this.map.createPane(name);
      pane.style.zIndex = String(zIndex);
    });
  }

  private addOfflineBadge(): void {
    const badge = new L.Control({ position: "bottomright" });
    badge.onAdd = () => {
      const element = L.DomUtil.create("div", "student-map-badge");
      element.innerHTML = "<b>唐朝疆域图 · 离线</b><span>玖巧仔 · CC BY 3.0</span>";
      return element;
    };
    badge.addTo(this.map);
  }

  private buildMarkers(): void {
    this.poems.forEach((poem) => {
      const marker = L.marker(toTangLatLng(poem.location.coordinates), {
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
    this.drawRoute();
  }

  private drawRoute(): void {
    this.routeLayer?.remove();
    this.routeLayer = undefined;
    if (this.journeyActive || !this.routeVisible || this.visiblePoems.length < 2) return;
    const routePoems = [...this.visiblePoems]
      .sort((a, b) => a.location.coordinates[0] - b.location.coordinates[0])
      .slice(0, 12);
    this.routeLayer = L.polyline(routePoems.map((poem) => toTangLatLng(poem.location.coordinates)), {
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
