function normalizeRoutePath(routePath) {
  if (!routePath) return null;

  const trimmed = routePath.trim();
  if (!trimmed) return null;

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const normalized = withLeadingSlash.replace(/\/+/g, '/').replace(/\/$/, '');
  return normalized || null;
}

function normalizeSlugSegment(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[%\s_]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getFilenameStem(resource) {
  if (!resource.file_path) return null;

  try {
    const parsed = new URL(resource.file_path);
    const rawName = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '');
    return rawName || null;
  } catch {
    const rawName = decodeURIComponent(resource.file_path.split('/').filter(Boolean).pop() || '');
    return rawName || null;
  }
}

export function buildHtmlResourceSlug(resource) {
  const routePath = normalizeRoutePath(resource.route_path);
  if (routePath) {
    return routePath.split('/').filter(Boolean).pop() || '';
  }

  const filenameSlug = getFilenameStem(resource);
  const normalizedFilenameSlug = filenameSlug ? normalizeSlugSegment(filenameSlug) : '';
  if (normalizedFilenameSlug && normalizedFilenameSlug !== 'html' && normalizedFilenameSlug.length >= 3) {
    return normalizedFilenameSlug;
  }

  const titleSlug = normalizeSlugSegment(resource.title || '');
  if (titleSlug.length >= 3) {
    return titleSlug;
  }

  return `resource-${String(resource.id || '').slice(0, 8).toLowerCase()}`;
}

export function getHtmlResourcePath(resource) {
  const routePath = normalizeRoutePath(resource.route_path);
  if (routePath) {
    return routePath;
  }

  return `/zhijing/${buildHtmlResourceSlug(resource)}`;
}

export function findHtmlResourceByPath(resources, resourcePath) {
  const normalizedPath = normalizeRoutePath(resourcePath);
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

export function findHtmlResourceByUrl(resources, url) {
  if (!url) return null;

  return (
    resources.find(
      (resource) => resource.resource_type === 'html' && resource.file_path && resource.file_path === url
    ) || null
  );
}
