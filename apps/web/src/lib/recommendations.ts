import type { Resource } from './types';
import type {
  ExternalRecommendation,
  FeaturedThemeConfig,
  InternalResourceRecommendation,
  PromptTemplateRecommendation,
  RecommendationCollectionConfig,
  RecommendationContent,
  RecommendationPageConfig,
  ResourceReference,
  TeachingActionSectionConfig,
  TeachingTipConfig,
} from './recommendationConfig';

export interface ResolvedInternalRecommendation extends InternalResourceRecommendation {
  resource: Resource;
  href: string;
}

export type ResolvedRecommendationContent =
  | ResolvedInternalRecommendation
  | PromptTemplateRecommendation
  | ExternalRecommendation;

export interface ResolvedTeachingActionSection extends TeachingActionSectionConfig {
  items: ResolvedRecommendationContent[];
}

export interface ResolvedRecommendationCollection extends RecommendationCollectionConfig {
  items: ResolvedRecommendationContent[];
}

export interface ResolvedFeaturedTheme extends Omit<FeaturedThemeConfig, 'resource'> {
  resource: ResolvedInternalRecommendation;
}

export interface RecommendationPageModel {
  featuredTheme: ResolvedFeaturedTheme | null;
  teachingActions: ResolvedTeachingActionSection[];
  promptTemplates: PromptTemplateRecommendation[];
  aiTools: ExternalRecommendation[];
  teacherWebsites: ExternalRecommendation[];
  collections: ResolvedRecommendationCollection[];
  teachingTips: TeachingTipConfig[];
}

function normalizeTitle(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function resolveHref(resource: Resource) {
  return resource.route_path || resource.file_path || '#';
}

export function findResourceByReference(resources: Resource[], reference?: ResourceReference | null) {
  if (!reference) return null;

  if (reference.routePath) {
    const byRoute = resources.find((resource) => resource.route_path === reference.routePath);
    if (byRoute) return byRoute;
  }

  if (reference.filePath) {
    const byFilePath = resources.find((resource) => resource.file_path === reference.filePath);
    if (byFilePath) return byFilePath;
  }

  if (reference.title) {
    const normalizedTitle = normalizeTitle(reference.title);
    const byTitle = resources.find((resource) => normalizeTitle(resource.title) === normalizedTitle);
    if (byTitle) return byTitle;
  }

  return null;
}

function resolveInternalRecommendation(
  resources: Resource[],
  item: InternalResourceRecommendation
): ResolvedInternalRecommendation | null {
  const resource =
    findResourceByReference(resources, item.resourceRef) ||
    item.fallbackRefs?.map((reference) => findResourceByReference(resources, reference)).find(Boolean) ||
    null;

  if (!resource) return null;

  return {
    ...item,
    resource,
    href: resolveHref(resource),
  };
}

function resolveContentItem(
  resources: Resource[],
  item: RecommendationContent
): ResolvedRecommendationContent | null {
  if (item.kind === 'internal_resource') {
    return resolveInternalRecommendation(resources, item);
  }

  return item;
}

function resolveCollectionItems(resources: Resource[], items: RecommendationContent[]) {
  return items
    .map((item) => resolveContentItem(resources, item))
    .filter(Boolean) as ResolvedRecommendationContent[];
}

export function buildRecommendationPageModel(
  resources: Resource[],
  config: RecommendationPageConfig
): RecommendationPageModel {
  const featuredResource = resolveInternalRecommendation(resources, config.hero.resource);

  const teachingActions = config.teachingActions
    .map((section) => {
      const items = resolveCollectionItems(resources, section.items);
      if (items.length === 0) return null;

      return {
        ...section,
        items,
      };
    })
    .filter(Boolean) as ResolvedTeachingActionSection[];

  const collections = config.collections
    .map((collection) => {
      const items = resolveCollectionItems(resources, collection.items);
      if (items.length === 0) return null;

      return {
        ...collection,
        items,
      };
    })
    .filter(Boolean) as ResolvedRecommendationCollection[];

  return {
    featuredTheme: featuredResource
      ? {
          ...config.hero,
          resource: featuredResource,
        }
      : null,
    teachingActions,
    promptTemplates: config.promptTemplates,
    aiTools: config.aiTools,
    teacherWebsites: config.teacherWebsites,
    collections,
    teachingTips: config.teachingTips,
  };
}
