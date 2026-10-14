import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import HtmlViewerSkeleton from '../components/HtmlViewerSkeleton';
import { getResolvedHtmlResource } from '../lib/api';
import { buildHtmlProxyUrl } from '../lib/htmlContent';
import { getHtmlResourcePath } from '../lib/resourceRoutes';
import type { Resource } from '../lib/types';

const DEFAULT_TITLE = '数学应用';
const EXTERNAL_URL_PATTERN = /^https?:\/\//i;

const HtmlViewer = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();
  const legacyUrl = searchParams.get('url');
  const [isFrameLoading, setIsFrameLoading] = useState(true);

  const handleBack = () => {
    const historyIndex = window.history.state?.idx;
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate('/');
  };

  const currentPath = useMemo(() => {
    if (!slug || location.pathname === '/view') return null;
    return location.pathname;
  }, [location.pathname, slug]);

  const shouldResolveResource = Boolean(currentPath || legacyUrl);

  const { data: matchedResource, isLoading: isResolvingResource, error: resolveError, refetch } = useQuery<Resource | null>({
    queryKey: ['html-resource-resolve', currentPath ?? '', legacyUrl ?? ''],
    queryFn: async () => {
      try {
        return await getResolvedHtmlResource({
          path: currentPath,
          url: legacyUrl,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Resource not found') {
          return null;
        }

        throw error;
      }
    },
    enabled: shouldResolveResource,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  });

  useEffect(() => {
    if (currentPath || !legacyUrl || !matchedResource) return;
    navigate(getHtmlResourcePath(matchedResource), { replace: true });
  }, [currentPath, legacyUrl, matchedResource, navigate]);

  const title = matchedResource?.title || searchParams.get('title') || DEFAULT_TITLE;
  const directUrl = matchedResource?.file_path && EXTERNAL_URL_PATTERN.test(matchedResource.file_path)
    ? matchedResource.file_path
    : legacyUrl && EXTERNAL_URL_PATTERN.test(legacyUrl)
      ? legacyUrl
      : null;
  const iframeUrl = currentPath
    ? matchedResource
      ? buildHtmlProxyUrl({ path: currentPath, version: matchedResource.version || 1 })
      : null
    : directUrl
      ? buildHtmlProxyUrl({ url: directUrl, title })
      : legacyUrl
        ? buildHtmlProxyUrl({ url: legacyUrl, title })
        : matchedResource?.file_path
          ? buildHtmlProxyUrl({ url: matchedResource.file_path, title })
          : null;

  useEffect(() => {
    if (!iframeUrl) {
      setIsFrameLoading(false);
      return;
    }

    setIsFrameLoading(true);
  }, [iframeUrl]);

  if (currentPath && isResolvingResource && !matchedResource && !iframeUrl) {
    return (
      <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-slate-100">
        <HtmlViewerSkeleton />
      </div>
    );
  }

  if (currentPath && !isResolvingResource && !matchedResource) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="mb-2 text-lg font-semibold text-slate-800">{resolveError ? '暂时无法打开教学应用' : '没有找到对应的教学应用'}</p>
          <p className="mb-4 text-sm text-slate-500">{resolveError ? '请检查网络后重试，你无需重新寻找这个作品。' : '这个链接可能已经失效，或者资源还没有发布。'}</p>
          {resolveError ? <button onClick={() => void refetch()} className="mr-3 rounded-lg bg-emerald-600 px-4 py-2 text-white">重新尝试</button> : null}
          <button onClick={() => navigate('/')} className="rounded-lg bg-slate-900 px-4 py-2 text-white">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (!iframeUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
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
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-slate-100">
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-2">
        <button onClick={handleBack} aria-label="返回" title="返回"
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />返回
        </button>
        <h1 className="min-w-0 truncate text-sm font-semibold text-slate-700">{title}</h1>
      </header>
      <div className="relative min-h-0 w-full flex-1 overflow-hidden">
        {isFrameLoading ? <HtmlViewerSkeleton /> : null}

        <iframe
          id="html-frame"
          src={iframeUrl}
          title={title}
          className="h-full w-full border-none bg-white"
          sandbox="allow-scripts allow-forms allow-popups allow-modals"
          referrerPolicy="no-referrer"
          onLoad={() => {
            setIsFrameLoading(false);
          }}
        />
      </div>
    </div>
  );
};

export default HtmlViewer;
