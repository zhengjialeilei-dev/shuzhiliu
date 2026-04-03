import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import HtmlViewerSkeleton from '../components/HtmlViewerSkeleton';
import { useResources } from '../hooks/useResources';
import {
  findHtmlResourceByPath,
  findHtmlResourceByUrl,
  getHtmlResourcePath,
} from '../lib/resourceRoutes';

type HtmlViewResult =
  | { mode: 'srcdoc'; text: string }
  | { mode: 'src'; text: ''; error: string };

const HtmlViewer = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();
  const legacyUrl = searchParams.get('url');

  const currentPath = useMemo(() => {
    if (!slug || location.pathname === '/view') return null;
    return location.pathname;
  }, [location.pathname, slug]);

  const { allResources, loading: resourcesLoading } = useResources({
    initialFetch: Boolean(currentPath || legacyUrl),
  });

  const matchedResource = useMemo(() => {
    if (currentPath) return findHtmlResourceByPath(allResources, currentPath);
    if (legacyUrl) return findHtmlResourceByUrl(allResources, legacyUrl);
    return null;
  }, [allResources, currentPath, legacyUrl]);

  useEffect(() => {
    if (currentPath || !legacyUrl || !matchedResource) return;
    navigate(getHtmlResourcePath(matchedResource), { replace: true });
  }, [currentPath, legacyUrl, matchedResource, navigate]);

  const url = matchedResource?.file_path || legacyUrl;
  const title = matchedResource?.title || searchParams.get('title') || '数学应用';

  const baseHref = useMemo(() => {
    if (!url) return null;

    try {
      const parsed = new URL(url, window.location.origin);
      parsed.pathname = parsed.pathname.replace(/\/[^/]*$/, '/');
      parsed.search = '';
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return null;
    }
  }, [url]);

  const buildSrcDoc = (raw: string) => {
    const base = baseHref ? `<base href="${baseHref}" />` : '';
    if (/<base\s/i.test(raw)) return raw;

    if (/<head[^>]*>/i.test(raw)) {
      return raw.replace(/<head([^>]*)>/i, `<head$1>${base}`);
    }

    return `${base}\n${raw}`;
  };

  const { data: htmlData, isLoading, error: queryError } = useQuery<HtmlViewResult>({
    queryKey: ['html-file', url],
    queryFn: async () => {
      if (!url) throw new Error('No URL provided');

      try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) {
          throw new Error(`Failed to load: ${response.status} ${response.statusText}`);
        }
        const text = await response.text();

        if (!/<!doctype html|<html[\s>]/i.test(text)) {
          throw new Error('NOT_HTML');
        }

        return { text, mode: 'srcdoc' as const };
      } catch (outerErr: unknown) {
        try {
          const proxyUrl = `/api/html-proxy?url=${encodeURIComponent(url)}`;
          const response = await fetch(proxyUrl);
          if (!response.ok) {
            throw new Error(`Proxy load failed: ${response.status} ${response.statusText}`);
          }
          const text = await response.text();
          if (!/<!doctype html|<html[\s>]/i.test(text)) {
            throw new Error('Proxy returned non-HTML content');
          }

          return { text, mode: 'srcdoc' as const };
        } catch (innerErr: unknown) {
          const innerMessage = innerErr instanceof Error ? innerErr.message : '';
          const outerMessage = outerErr instanceof Error ? outerErr.message : '';
          return {
            text: '',
            mode: 'src' as const,
            error: innerMessage || outerMessage || 'Failed to load HTML content',
          };
        }
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: !!url,
    retry: 1,
  });

  const mode = htmlData?.mode ?? 'srcdoc';
  const loadError =
    htmlData?.mode === 'src'
      ? htmlData.error
      : queryError instanceof Error
        ? queryError.message
        : null;
  const html = htmlData?.mode === 'srcdoc' && htmlData.text ? buildSrcDoc(htmlData.text) : null;

  if ((currentPath || legacyUrl) && resourcesLoading && !matchedResource && !url) {
    return (
      <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-100">
        <HtmlViewerSkeleton />
      </div>
    );
  }

  if (currentPath && !resourcesLoading && !matchedResource) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="mb-2 text-lg font-semibold text-slate-800">没有找到对应的教学应用</p>
          <p className="mb-4 text-sm text-slate-500">
            这个链接可能已经失效，或者资源还没有发布。
          </p>
          <button onClick={() => navigate('/')} className="rounded-lg bg-slate-900 px-4 py-2 text-white">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <p className="mb-4 text-slate-500">没有提供有效的资源地址</p>
          <button onClick={() => navigate('/')} className="rounded-lg bg-slate-900 px-4 py-2 text-white">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-100">
      <button
        onClick={() => navigate(-1)}
        className="absolute left-3 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/90 shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-white sm:left-4 sm:top-4 sm:h-12 sm:w-12"
        title="返回"
      >
        <ArrowLeft className="h-5 w-5 text-slate-700" />
      </button>

      <div className="pointer-events-none absolute left-14 right-3 top-3 z-40 sm:left-20 sm:right-4 sm:top-4">
        <div className="inline-flex max-w-full rounded-full border border-white/60 bg-white/90 px-4 py-2 text-xs font-medium text-slate-600 shadow-lg backdrop-blur-md sm:text-sm">
          <span className="truncate">{title}</span>
        </div>
      </div>

      <div className="relative h-full w-full flex-1 overflow-hidden">
        {isLoading && !html ? (
          <>
            <HtmlViewerSkeleton />
            <div className="absolute left-1/2 top-14 z-50 flex w-[min(calc(100%-1.5rem),28rem)] -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/60 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-lg backdrop-blur-md sm:top-4 sm:w-[min(calc(100%-6rem),30rem)] sm:text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
              正在加载教学应用...
            </div>
          </>
        ) : null}

        {loadError && mode === 'src' ? (
          <div className="absolute left-1/2 top-16 z-50 flex w-[min(calc(100%-1.5rem),32rem)] -translate-x-1/2 items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/95 p-3 text-sm text-amber-700 shadow-lg backdrop-blur-md sm:top-20">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold">已回退到直连模式</div>
              <div className="mt-0.5 text-amber-800/80">{loadError}</div>
              <div className="mt-1 text-xs text-amber-800/70">
                如果页面显示源码而不是完整界面，通常说明源文件返回的 Content-Type 不是
                {' '}
                <code>text/html</code>
                。
              </div>
            </div>
          </div>
        ) : null}

        <iframe
          id="html-frame"
          src={mode === 'src' ? url : undefined}
          srcDoc={mode === 'srcdoc' ? (html || undefined) : undefined}
          title={title}
          loading="lazy"
          className="h-full w-full border-none bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      </div>
    </div>
  );
};

export default HtmlViewer;
