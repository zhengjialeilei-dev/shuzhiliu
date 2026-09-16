import { useInfiniteQuery } from '@tanstack/react-query';
import { getResourcePage, getTeachingResourcePage } from '../lib/api';
import type { ResourceFilters } from '../lib/types';

export function useResourcePages(filters: ResourceFilters) {
  const query = useInfiniteQuery({
    queryKey: ['resource-pages', filters],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => getResourcePage(filters, pageParam, signal),
    getNextPageParam: (page) => page.hasMore ? page.page + 1 : undefined,
    staleTime: 30_000,
    refetchOnMount: true,
  });
  // Offset pagination is a live view; deduplicate if new uploads shift a page.
  const items = [...new Map(query.data?.pages.flatMap((page) => page.items).map((item) => [item.id, item]) ?? []).values()];
  return {
    items, total: query.data?.pages[0]?.total ?? 0,
    source: query.data?.pages[0]?.source,
    loading: query.isLoading, loadingMore: query.isFetchingNextPage,
    error: query.error?.message ?? null, hasMore: query.hasNextPage,
    loadMore: () => { if (!query.isFetching) void query.fetchNextPage(); },
    refresh: () => { void query.refetch(); },
  };
}

export function useTeachingPages(zone: string) {
  const query = useInfiniteQuery({
    queryKey: ['teaching-pages', zone],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => getTeachingResourcePage(zone, pageParam, signal),
    getNextPageParam: (page) => page.hasMore ? page.page + 1 : undefined,
    staleTime: 30_000,
    refetchOnMount: true,
  });
  return {
    items: [...new Map(query.data?.pages.flatMap((page) => page.items).map((item) => [item.id, item]) ?? []).values()],
    zones: query.data?.pages[0]?.zones ?? {},
    loading: query.isLoading, loadingMore: query.isFetchingNextPage,
    error: query.error?.message ?? null, hasMore: query.hasNextPage,
    loadMore: () => { if (!query.isFetching) void query.fetchNextPage(); },
    refresh: () => { void query.refetch(); },
  };
}
