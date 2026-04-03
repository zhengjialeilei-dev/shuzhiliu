import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getResources } from '../lib/api';

interface UseResourcesOptions {
  initialFetch?: boolean;
}

export const useResources = (options: UseResourcesOptions = {}) => {
  const { initialFetch = true } = options;

  const {
    data: allResources = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['resources'],
    queryFn: getResources,
    enabled: initialFetch,
  });

  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const error = queryError ? (queryError as Error).message : null;

  return {
    allResources,
    loading,
    error,
    refresh,
  };
};
