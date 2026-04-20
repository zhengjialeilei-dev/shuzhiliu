import React, { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Resource } from '../lib/types';
import { prefetchHtmlView } from '../lib/htmlContent';
import { getResourcePath } from '../lib/resourceRoutes';
import { formatCategoryLabel } from '../lib/displayLabels';
import HighlightText from './HighlightText';

interface ResourceCardProps {
  resource: Resource;
  searchQuery?: string;
  accentColor?: 'orange' | 'emerald';
}

const ACCENT_CONFIG = {
  orange: {
    hoverShadow: 'hover:shadow-orange-900/5',
    hoverText: 'group-hover:text-orange-600',
    categoryBadge: 'text-orange-600 border-orange-100',
  },
  emerald: {
    hoverShadow: 'hover:shadow-emerald-900/5',
    hoverText: 'group-hover:text-emerald-600',
    categoryBadge: 'text-emerald-600 border-emerald-100',
  },
};

const ResourceCardMemo: React.FC<ResourceCardProps> = ({
  resource,
  searchQuery,
  accentColor = 'orange',
}) => {
  const queryClient = useQueryClient();
  const [hasPrefetched, setHasPrefetched] = useState(false);
  const accent = ACCENT_CONFIG[accentColor];

  const to = useMemo(() => getResourcePath(resource), [resource]);

  const href = useMemo(() => {
    if (to.startsWith('/')) {
      return `${window.location.origin}${to}`;
    }

    return to;
  }, [to]);

  const handleMouseEnter = useCallback(() => {
    if (resource.resource_type !== 'html' || !resource.file_path || hasPrefetched) return;

    queryClient.prefetchQuery({
      queryKey: ['html-file', resource.file_path],
      queryFn: () => prefetchHtmlView(resource.file_path as string),
      staleTime: 30 * 60 * 1000,
    });

    setHasPrefetched(true);
  }, [hasPrefetched, queryClient, resource.file_path, resource.resource_type]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={handleMouseEnter}
      className={`group relative flex flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:rounded-2xl ${accent.hoverShadow}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <img
          src={resource.image_url}
          alt={resource.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute left-2 top-2 sm:left-3 sm:top-3">
          <span
            className={`rounded border bg-white/90 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md sm:rounded-md sm:px-2 sm:py-1 sm:text-[10px] ${accent.categoryBadge}`}
          >
            {formatCategoryLabel(resource.category)}
          </span>
        </div>

        <div className="absolute right-2 top-2 sm:right-3 sm:top-3">
          <span className="rounded border border-purple-100 bg-white/90 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-purple-600 shadow-sm backdrop-blur-md sm:rounded-md sm:px-2 sm:py-1 sm:text-[10px]">
            {resource.grade}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 p-3 sm:gap-1 sm:p-4">
        <h3 className={`line-clamp-1 text-sm font-bold text-gray-800 transition-colors sm:text-base ${accent.hoverText}`}>
          {searchQuery ? <HighlightText text={resource.title} query={searchQuery} /> : resource.title}
        </h3>
        <p className="hidden line-clamp-1 text-[10px] text-gray-500 sm:block sm:text-xs">
          {searchQuery ? (
            <HighlightText text={resource.description} query={searchQuery} />
          ) : (
            resource.description
          )}
        </p>
      </div>
    </a>
  );
};

const ResourceCard = React.memo<ResourceCardProps>(ResourceCardMemo, (prevProps, nextProps) => {
  return (
    prevProps.resource.id === nextProps.resource.id &&
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.accentColor === nextProps.accentColor
  );
});

ResourceCard.displayName = 'ResourceCard';

export default ResourceCard;
