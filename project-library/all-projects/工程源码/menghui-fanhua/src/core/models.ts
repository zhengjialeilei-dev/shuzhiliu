export interface Hotspot {
  readonly x: number;
  readonly y: number;
  readonly title: string;
  readonly text: string;
  readonly question: string;
}

export interface LessonScene {
  readonly id: string;
  readonly order: number;
  readonly act: string;
  readonly title: string;
  readonly image: string;
  readonly thumbnail: string;
  readonly panorama: string;
  readonly question: string;
  readonly tags: readonly string[];
  readonly hotspots: readonly Hotspot[];
}

export interface SummarySection {
  readonly marker: string;
  readonly title: string;
  readonly points: readonly string[];
  readonly takeaway: string;
}

export interface LessonConfig {
  readonly title: string;
  readonly eyebrow: string;
  readonly subtitle: string;
  readonly description: string;
  readonly cover: string;
  readonly fullScroll: string;
  readonly scrollRod: string;
  readonly scenes: readonly LessonScene[];
  readonly summary: readonly SummarySection[];
  readonly reflection: string;
}

export type LessonRoute =
  | { readonly kind: "cover" }
  | { readonly kind: "scroll" }
  | { readonly kind: "scene"; readonly sceneId: string }
  | { readonly kind: "panorama"; readonly sceneId: string }
  | { readonly kind: "summary" };

export const routeEquals = (left: LessonRoute, right: LessonRoute): boolean =>
  left.kind === right.kind &&
  (left.kind !== "scene" && left.kind !== "panorama"
    ? true
    : right.kind === left.kind && right.sceneId === left.sceneId);

export const createRouteSequence = (lesson: LessonConfig): readonly LessonRoute[] => [
  { kind: "cover" },
  { kind: "scroll" },
  ...lesson.scenes.flatMap<LessonRoute>((scene) => [
    { kind: "scene", sceneId: scene.id },
    { kind: "panorama", sceneId: scene.id },
  ]),
  { kind: "summary" },
];
