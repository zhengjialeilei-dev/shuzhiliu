import type { Resource } from './types';

export const HTML_ROUTE_PREFIX = '/zhijing';

function normalizeRoutePath(routePath?: string | null) {
  if (!routePath) return null;

  const trimmed = routePath.trim();
  if (!trimmed) return null;

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const normalized = withLeadingSlash.replace(/\/+/g, '/').replace(/\/$/, '');
  return normalized || null;
}

function normalizeSlugSegment(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[%\s_]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getFilenameStem(resource: Pick<Resource, 'file_path'>) {
  if (!resource.file_path) return null;

  try {
    const parsed = new URL(resource.file_path, window.location.origin);
    const rawName = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '');
    return rawName || null;
  } catch {
    const rawName = decodeURIComponent(resource.file_path.split('/').filter(Boolean).pop() || '');
    return rawName || null;
  }
}

export function buildHtmlResourceSlug(resource: Pick<Resource, 'id' | 'title' | 'file_path' | 'route_path'>) {
  const routePath = normalizeRoutePath(resource.route_path);
  if (routePath) {
    return routePath.split('/').filter(Boolean).pop() || '';
  }

  const filenameSlug = getFilenameStem(resource);
  const normalizedFilenameSlug = filenameSlug ? normalizeSlugSegment(filenameSlug) : '';
  if (normalizedFilenameSlug && normalizedFilenameSlug !== 'html' && normalizedFilenameSlug.length >= 3) {
    return normalizedFilenameSlug;
  }

  const titleSlug = normalizeSlugSegment(resource.title);
  if (titleSlug.length >= 3) {
    return titleSlug;
  }

  return `resource-${resource.id.slice(0, 8).toLowerCase()}`;
}

export function getHtmlResourcePath(resource: Pick<Resource, 'id' | 'title' | 'file_path' | 'route_path'>) {
  const routePath = normalizeRoutePath(resource.route_path);
  if (routePath) {
    return routePath;
  }

  return `${HTML_ROUTE_PREFIX}/${buildHtmlResourceSlug(resource)}`;
}

export function getResourcePath(resource: Resource) {
  if (resource.resource_type === 'react') {
    return resource.route_path || '#';
  }

  if (resource.resource_type === 'html' && resource.file_path) {
    return getHtmlResourcePath(resource);
  }

  if (resource.file_path) {
    return `/view?url=${encodeURIComponent(resource.file_path)}`;
  }

  return resource.route_path || '#';
}

export function findHtmlResourceBySlug(resources: Resource[], slug?: string | null) {
  if (!slug) return null;

  return (
    resources.find(
      (resource) =>
        resource.resource_type === 'html' &&
        resource.file_path &&
        buildHtmlResourceSlug(resource) === slug
    ) || null
  );
}

export function findHtmlResourceByPath(resources: Resource[], path?: string | null) {
  if (!path) return null;

  const normalizedPath = normalizeRoutePath(path);
  if (!normalizedPath) return null;

  return (
    resources.find(
      (resource) =>
        resource.resource_type === 'html' &&
        resource.file_path &&
        getHtmlResourcePath(resource) === normalizedPath
    ) || null
  );
}

export function findHtmlResourceByUrl(resources: Resource[], url?: string | null) {
  if (!url) return null;

  return (
    resources.find(
      (resource) => resource.resource_type === 'html' && resource.file_path && resource.file_path === url
    ) || null
  );
}
