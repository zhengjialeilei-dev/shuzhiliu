import { useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Search } from 'lucide-react';
import PageHeader from './PageHeader';
import ResourceCard from './ResourceCard';
import ResourceGridSkeleton from './ResourceGridSkeleton';
import { useResourcePages } from '../hooks/useResourcePages';
import { useDebounce } from '../hooks/useDebounce';

interface ResourceGalleryPageProps {
  title: string;
  subtitle: string;
  emptyText: string;
  accentColor: 'orange' | 'emerald';
  gradientColors: string;
  section: 'games' | 'tools';
  searchPlaceholder: string;
}

export default function ResourceGalleryPage({
  title,
  subtitle,
  emptyText,
  accentColor,
  gradientColors,
  section,
  searchPlaceholder,
}: ResourceGalleryPageProps) {
  const [search, setSearch] = useState('');

  const q = useDebounce(search.trim(), 300);
  const { items: filteredResources, loading, loadingMore, error, refresh: onRetry, hasMore, loadMore, source } = useResourcePages({ section, q });

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 mb-6 sm:mb-10">
        <PageHeader title={title} subtitle={subtitle} gradientColors={gradientColors} />

        <div className="bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-white/50 shadow-sm w-full">
          <div className="relative group flex-1">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="pl-10 pr-4 py-2.5 sm:py-3 bg-white rounded-xl border-none ring-1 ring-gray-100 w-full focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all duration-300 placeholder-gray-400 text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
          </div>

        </div>
      </div>

      {source === 'demo' ? <p role="status" className="mb-4 text-amber-700">当前为开发演示数据，不代表已发布资源。</p> : null}
      {error ? (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="flex min-w-0 items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">资源加载失败，请检查网络后重试。</span>
          </span>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1 font-medium hover:bg-amber-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              重试
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
        {loading ? <ResourceGridSkeleton /> : null}
        {filteredResources.map((resource, index) => (
          <ResourceCard key={resource.id} resource={resource} accentColor={accentColor} priority={index < 2} />
        ))}
        {!loading && !error && filteredResources.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
            {emptyText}
          </div>
        )}
      </div>
      {hasMore ? <div className="mt-8 text-center"><button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-full border bg-white px-8 py-3 disabled:opacity-50">
        {loadingMore ? <Loader2 className="inline h-4 w-4 animate-spin" /> : null}
        {loadingMore ? '加载中...' : '加载更多资源'}
      </button></div> : null}
    </div>
  );
}
