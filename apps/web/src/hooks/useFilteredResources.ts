import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Resource } from '../lib/types';
import { matchBasicSearch, type SearchMatch } from '../lib/basicSearch';

type SearchMatcher = (text: string, query: string) => SearchMatch;

interface CategoryOption {
  id: string;
  label: string;
}

interface GradeOption {
  id: string;
  label: string;
}

interface UseFilteredResourcesOptions {
  resources: Resource[];
  activeCategory: string;
  activeGrade: string;
  debouncedSearch: string;
  categories: CategoryOption[];
  grades: GradeOption[];
  pageSize?: number;
}

export function useFilteredResources({
  resources,
  activeCategory,
  activeGrade,
  debouncedSearch,
  categories,
  grades,
  pageSize = 20,
}: UseFilteredResourcesOptions) {
  const [page, setPage] = useState(1);
  const [searchMatcher, setSearchMatcher] = useState<SearchMatcher>(() => matchBasicSearch);

  useEffect(() => {
    if (!/^[a-z\s]+$/i.test(debouncedSearch)) return undefined;

    let active = true;
    import('../lib/pinyinSearch').then(({ matchSearch }) => {
      if (active) setSearchMatcher(() => matchSearch);
    });

    return () => {
      active = false;
    };
  }, [debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, activeGrade, debouncedSearch]);

  const displayApps = useMemo(() => {
    let filtered = resources;

    if (activeCategory !== 'all') {
      const selectedCat = categories.find((c) => c.id === activeCategory);
      if (selectedCat) {
        filtered = filtered.filter((app) => app.category === selectedCat.label);
      }
    }

    if (activeGrade) {
      const selectedGrade = grades.find((g) => g.id === activeGrade);
      if (selectedGrade) {
        filtered = filtered.filter(
          (app) => app.grade && (app.grade.includes(selectedGrade.label) || app.grade === '通用')
        );
      }
    }

    if (debouncedSearch) {
      filtered = filtered
        .map((app) => {
          const titleMatch = searchMatcher(app.title, debouncedSearch);
          const descMatch = searchMatcher(app.description, debouncedSearch);
          const score = Math.max(titleMatch.score, descMatch.score);
          return { app, matched: titleMatch.matched || descMatch.matched, score };
        })
        .filter((item) => item.matched)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.app);
    }

    return filtered;
  }, [resources, activeCategory, activeGrade, debouncedSearch, categories, grades, searchMatcher]);

  const paginatedApps = useMemo(() => displayApps.slice(0, page * pageSize), [displayApps, page, pageSize]);

  const hasMore = paginatedApps.length < displayApps.length;

  const loadMore = useCallback(() => {
    setPage((value) => value + 1);
  }, []);

  return {
    displayApps,
    paginatedApps,
    hasMore,
    loadMore,
    totalCount: displayApps.length,
  };
}
