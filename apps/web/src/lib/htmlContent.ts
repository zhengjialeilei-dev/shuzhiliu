import { buildApiUrl } from './api';

type HtmlProxyParams = {
  url?: string | null;
  path?: string | null;
  title?: string | null;
};

export function buildHtmlProxyUrl(params: HtmlProxyParams) {
  const searchParams = new URLSearchParams({
    iframe: '1',
  });

  if (params.url) {
    searchParams.set('url', params.url);
  }

  if (params.path) {
    searchParams.set('path', params.path);
  }

  if (params.title) {
    searchParams.set('title', params.title);
  }

  return buildApiUrl(`/api/html-proxy?${searchParams.toString()}`);
}

export async function prefetchHtmlView(url: string, title?: string) {
  const response = await fetch(buildHtmlProxyUrl({ url, title }), {
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Failed to preload HTML: ${response.status} ${response.statusText}`);
  }

  return true;
}
