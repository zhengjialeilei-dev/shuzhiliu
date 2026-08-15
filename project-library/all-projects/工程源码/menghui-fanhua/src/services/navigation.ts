import type { LessonRoute } from "../core/models";
import { routeEquals } from "../core/models";

export interface NavigationPort {
  readonly current: LessonRoute;
  readonly index: number;
  readonly total: number;
  start(): void;
  navigate(route: LessonRoute): void;
  next(): void;
  previous(): void;
  subscribe(listener: (route: LessonRoute) => void): () => void;
}

export const serializeRoute = (route: LessonRoute): string => {
  if (route.kind === "scene" || route.kind === "panorama") {
    return `#/${route.kind}/${route.sceneId}`;
  }
  return `#/${route.kind}`;
};

const normalizeHash = (hash: string): readonly string[] =>
  hash.replace(/^#\/?/, "").split("/").filter(Boolean);

export class HashNavigation implements NavigationPort {
  private readonly listeners = new Set<(route: LessonRoute) => void>();
  private currentRoute: LessonRoute;

  constructor(private readonly sequence: readonly LessonRoute[]) {
    if (sequence.length === 0) {
      throw new Error("Navigation sequence cannot be empty.");
    }
    this.currentRoute = sequence[0];
  }

  get current(): LessonRoute {
    return this.currentRoute;
  }

  get index(): number {
    return this.sequence.findIndex((route) => routeEquals(route, this.currentRoute));
  }

  get total(): number {
    return this.sequence.length;
  }

  start(): void {
    window.addEventListener("hashchange", this.syncFromHash);
    this.syncFromHash();
  }

  navigate(route: LessonRoute): void {
    const knownRoute = this.sequence.find((item) => routeEquals(item, route));
    if (!knownRoute) return;

    const nextHash = serializeRoute(knownRoute);
    if (window.location.hash === nextHash) {
      this.update(knownRoute);
      return;
    }
    window.location.hash = nextHash;
  }

  next(): void {
    const target = this.sequence[Math.min(this.index + 1, this.sequence.length - 1)];
    if (target) this.navigate(target);
  }

  previous(): void {
    const target = this.sequence[Math.max(this.index - 1, 0)];
    if (target) this.navigate(target);
  }

  subscribe(listener: (route: LessonRoute) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private readonly syncFromHash = (): void => {
    const parts = normalizeHash(window.location.hash);
    const parsed = this.parse(parts);
    if (!parsed) {
      const fallback = this.sequence[0];
      window.history.replaceState(null, "", serializeRoute(fallback));
      this.update(fallback);
      return;
    }
    this.update(parsed);
  };

  private parse(parts: readonly string[]): LessonRoute | undefined {
    const [kind, sceneId] = parts;
    const candidate: LessonRoute | undefined =
      kind === "cover" || kind === "scroll" || kind === "summary"
        ? { kind }
        : (kind === "scene" || kind === "panorama") && sceneId
          ? { kind, sceneId }
          : undefined;

    return candidate
      ? this.sequence.find((route) => routeEquals(route, candidate))
      : undefined;
  }

  private update(route: LessonRoute): void {
    this.currentRoute = route;
    this.listeners.forEach((listener) => listener(route));
  }
}
