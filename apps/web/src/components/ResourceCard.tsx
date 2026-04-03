import React, { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Resource } from '../lib/types';
import { getResourcePath } from '../lib/resourceRoutes';
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

  const to = useMemo(() => {
    return getResourcePath(resource);
  }, [resource]);

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
      queryFn: async () => {
        try {
          const response = await fetch(resource.file_path, { mode: 'cors' });
          if (!response.ok) throw new Error(`加载失败: ${response.status}`);
          const text = await response.text();
          if (!/<!doctype html|<html[\s>]/i.test(text)) {
            throw new Error('NOT_HTML');
          }
          return { text, mode: 'srcdoc' as const };
        } catch {
          return null;
        }
      },
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
      className={`group relative flex flex-col bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl ${accent.hoverShadow} hover:-translate-y-1 transition-all duration-300`}
    >
      <div className="aspect-[4/3] overflow-hidden bg-gray-100 relative">
        <img
          src={resource.image_url}
          alt={resource.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
          <span
            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white/90 backdrop-blur-md text-[8px] sm:text-[10px] font-bold ${accent.categoryBadge} rounded sm:rounded-md shadow-sm uppercase tracking-wider border`}
          >
            {resource.category}
          </span>
        </div>

        <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-white/90 backdrop-blur-md text-[8px] sm:text-[10px] font-bold text-purple-600 rounded sm:rounded-md shadow-sm uppercase tracking-wider border border-purple-100">
            {resource.grade}
          </span>
        </div>
      </div>

      <div className="p-3 sm:p-4 flex flex-col gap-0.5 sm:gap-1">
        <h3 className={`font-bold text-gray-800 text-sm sm:text-base ${accent.hoverText} transition-colors line-clamp-1`}>
          {searchQuery ? <HighlightText text={resource.title} query={searchQuery} /> : resource.title}
        </h3>
        <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-1 hidden sm:block">
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
