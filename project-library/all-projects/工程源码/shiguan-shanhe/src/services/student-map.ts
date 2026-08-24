import L, {
  type Layer,
  type Map as LeafletMap,
  type Marker,
  type Polyline,
} from "leaflet";
import "leaflet/dist/leaflet.css";
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
  private clusterLayers: Marker[] = [];
  private journeyFrame?: number;
  private journeyActive = false;
  private resizeFrame?: number;
  private densityFrame?: number;

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
    this.map.on("zoomend moveend", this.scheduleMarkerDensity);

    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeFrame !== undefined) cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => {
        this.resizeFrame = undefined;
        this.map.invalidateSize({ animate: false, pan: false });
        this.scheduleMarkerDensity();
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
    if (this.densityFrame !== undefined) cancelAnimationFrame(this.densityFrame);
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
    this.scheduleMarkerDensity();
    const stops = poem.journey.map((stop) => toTangLatLng(stop.coordinates));
    const totalDistance = stops.slice(1).reduce((sum, point, index) => sum + stops[index].distanceTo(point), 0);
    if (totalDistance <= 0) {
      this.stopJourney();
      return;
    }

    const guidePath = L.polyline(stops, {
      pane: "journeyPane",
      renderer: this.canvasRenderer,
      color: "#fff0b8",
      opacity: 0.88,
      weight: 10,
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
    }).addTo(this.map);
    const path = L.polyline([stops[0]], {
      pane: "journeyPane",
      renderer: this.canvasRenderer,
      color: "#e3683d",
      opacity: 0.96,
      weight: 6,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(this.map);
    this.journeyLayers.push(guidePath, path);

    const arrowMarkers = stops.slice(0, -1).map((from, index) => {
      const to = stops[index + 1];
      const midpoint = L.latLng((from.lat + to.lat) / 2, (from.lng + to.lng) / 2);
      const angle = Math.atan2(-(to.lat - from.lat), to.lng - from.lng) * 180 / Math.PI;
      const arrow = L.marker(midpoint, {
        pane: "journeyPane",
        interactive: false,
        icon: L.divIcon({
          className: "student-route-arrow-shell",
          html: `<span class="student-route-arrow" style="--route-angle:${angle.toFixed(2)}deg"><i>→</i></span>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
      }).addTo(this.map);
      this.journeyLayers.push(arrow);
      return arrow;
    });

    const stopMarkers = poem.journey.map((stop, index) => {
      const circle = L.circleMarker(toTangLatLng(stop.coordinates), {
        pane: "journeyPane",
        renderer: this.canvasRenderer,
        radius: 8,
        color: "#fff4cf",
        weight: 3,
        fillColor: index === 0 ? "#e3683d" : "#76aa91",
        fillOpacity: 0.98,
      }).addTo(this.map);
      const label = L.marker(toTangLatLng(stop.coordinates), {
        pane: "journeyPane",
        interactive: false,
        icon: L.divIcon({
          className: "journey-leaflet-label-shell student-journey-label-shell",
          html: `<span class="journey-leaflet-label"><i>${index + 1}</i><b>${escapeHtml(stop.label)}</b><em>${index === 0 ? "起点" : index === poem.journey.length - 1 ? "终点" : "途经"}</em></span>`,
          iconAnchor: [-12, 26],
        }),
      }).addTo(this.map);
      if (index === 0) label.getElement()?.classList.add("is-active");
      this.journeyLayers.push(circle, label);
      return { circle, label };
    });

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

      if (time - lastRenderedAt > 32 || linearProgress === 1) {
        lastRenderedAt = time;
        path.setLatLngs([...stops.slice(0, segmentIndex + 1), current]);
      }

      const stopIndex = linearProgress === 1
        ? stops.length - 1
        : Math.min(stops.length - 1, segmentIndex + (segmentProgress > 0.88 ? 1 : 0));
      if (stopIndex !== lastStopIndex) {
        lastStopIndex = stopIndex;
        stopMarkers.forEach(({ circle, label }, index) => {
          const visited = index <= stopIndex;
          circle.setStyle({ radius: index === stopIndex ? 10 : 8, fillColor: visited ? "#e3683d" : "#76aa91" });
          label.getElement()?.classList.toggle("is-active", index === stopIndex);
        });
        arrowMarkers.forEach((arrow, index) => {
          arrow.getElement()?.classList.toggle("is-visited", index < segmentIndex);
          arrow.getElement()?.classList.toggle("is-active", index === segmentIndex && linearProgress < 1);
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
    this.scheduleMarkerDensity();
  }

  private createPanes(): void {
    const paneLevels = { baseMapPane: 210, routePane: 420, poemMarkerPane: 510, clusterPane: 530, journeyPane: 560 } as const;
    Object.entries(paneLevels).forEach(([name, zIndex]) => {
      const pane = this.map.createPane(name);
      pane.style.zIndex = String(zIndex);
    });
  }

  private addOfflineBadge(): void {
    const badge = new L.Control({ position: "bottomright" });
    badge.onAdd = () => {
      const element = L.DomUtil.create("div", "student-map-badge");
      element.innerHTML = "<b>唐朝疆域图 · 离线</b><span>诗点聚合 · 放大展开</span><small>玖巧仔 · CC BY 3.0</small>";
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
    this.scheduleMarkerDensity();
  }

  private drawRoute(): void {
    this.routeLayer?.remove();
    this.routeLayer = undefined;
    if (this.journeyActive || !this.routeVisible) return;
    const activePoem = this.visiblePoems.find((poem) => poem.id === this.activePoemId) ?? this.visiblePoems[0];
    if (!activePoem || activePoem.journey.length < 2) return;
    this.routeLayer = L.polyline(activePoem.journey.map((stop) => toTangLatLng(stop.coordinates)), {
      pane: "routePane",
      renderer: this.canvasRenderer,
      color: "#db6542",
      opacity: 0.62,
      weight: 2.6,
      dashArray: "3 9",
      lineCap: "round",
      interactive: false,
      smoothFactor: 1.8,
    }).addTo(this.map);
  }

  private readonly scheduleMarkerDensity = (): void => {
    if (this.densityFrame !== undefined) cancelAnimationFrame(this.densityFrame);
    this.densityFrame = requestAnimationFrame(() => {
      this.densityFrame = undefined;
      this.paintMarkerDensity();
    });
  };

  private paintMarkerDensity(): void {
    this.clusterLayers.forEach((marker) => marker.remove());
    this.clusterLayers = [];

    if (this.journeyActive) {
      this.markerElements.forEach((marker) => this.setMarkerAvailable(marker, false));
      return;
    }

    const visiblePoems = this.visiblePoems.filter((poem) => this.map.hasLayer(this.markerElements.get(poem.id)!));
    if (this.map.getZoom() >= 1.5) {
      visiblePoems.forEach((poem) => this.setMarkerAvailable(this.markerElements.get(poem.id)!, true));
      return;
    }

    const activePoem = visiblePoems.find((poem) => poem.id === this.activePoemId);
    const threshold = this.map.getZoom() < 0 ? 62 : this.map.getZoom() < 0.75 ? 52 : 42;
    const groups: Array<{ poems: Poem[]; point: L.Point }> = [];

    visiblePoems.forEach((poem) => {
      const marker = this.markerElements.get(poem.id)!;
      if (poem.id === activePoem?.id) {
        this.setMarkerAvailable(marker, true);
        return;
      }
      const point = this.map.latLngToContainerPoint(toTangLatLng(poem.location.coordinates));
      const group = groups.find((candidate) => candidate.point.distanceTo(point) < threshold);
      if (!group) {
        groups.push({ poems: [poem], point });
        return;
      }
      group.poems.push(poem);
      const count = group.poems.length;
      group.point = L.point(
        (group.point.x * (count - 1) + point.x) / count,
        (group.point.y * (count - 1) + point.y) / count
      );
    });

    groups.forEach((group) => {
      if (group.poems.length === 1) {
        this.setMarkerAvailable(this.markerElements.get(group.poems[0].id)!, true);
        return;
      }
      group.poems.forEach((poem) => this.setMarkerAvailable(this.markerElements.get(poem.id)!, false));
      const center = this.map.containerPointToLatLng(group.point);
      const cluster = L.marker(center, {
        pane: "clusterPane",
        keyboard: true,
        title: `${group.poems.length}个诗点，点击放大`,
        icon: L.divIcon({
          className: "student-poem-cluster-shell",
          html: `<span class="student-poem-cluster"><b>${group.poems.length}</b><small>诗点</small></span>`,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        }),
      }).addTo(this.map);
      cluster.on("click", () => {
        const bounds = L.latLngBounds(group.poems.map((poem) => toTangLatLng(poem.location.coordinates)));
        const isSinglePosition = bounds.getNorthEast().equals(bounds.getSouthWest());
        if (isSinglePosition) this.map.flyTo(center, Math.min(2, this.map.getZoom() + 1.25), { duration: 0.5 });
        else this.map.flyToBounds(bounds, { padding: [90, 90], maxZoom: 1.75, duration: 0.55 });
      });
      cluster.getElement()?.setAttribute("aria-label", `${group.poems.length}个诗点，点击放大查看`);
      this.clusterLayers.push(cluster);
    });
  }

  private setMarkerAvailable(marker: Marker, available: boolean): void {
    marker.setOpacity(available ? 1 : 0);
    const element = marker.getElement();
    if (!element) return;
    element.style.pointerEvents = available ? "" : "none";
    element.setAttribute("aria-hidden", String(!available));
    element.setAttribute("tabindex", available ? "0" : "-1");
  }
}
