import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Filter, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useResources } from '../hooks/useResources';
import { useDebounce } from '../hooks/useDebounce';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { useFilteredResources } from '../hooks/useFilteredResources';
import PageHeader from '../components/PageHeader';
import SearchBar from '../components/SearchBar';
import FilterTabs from '../components/FilterTabs';
import ResourceCard from '../components/ResourceCard';

const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'algebra', label: '数与代数' },
  { id: 'geometry', label: '图形与几何' },
  { id: 'statistics', label: '统计与概率' },
  { id: 'practice', label: '综合实践' },
  { id: 'micro', label: '微课' },
  { id: 'exercises', label: '习题' },
  { id: 'other', label: '其他' },
];

const GRADES = [
  { id: '1', label: '一年级' },
  { id: '2', label: '二年级' },
  { id: '3', label: '三年级' },
  { id: '4', label: '四年级' },
  { id: '5', label: '五年级' },
  { id: '6', label: '六年级' },
];

const Home = () => {
  const { allResources, loading } = useResources();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState(searchParams.get('cat') || 'all');
  const [activeGrade, setActiveGrade] = useState(searchParams.get('grade') || '');
  const [search, setSearch] = useState(searchParams.get('q') || '');

  const debouncedSearch = useDebounce(search.trim(), 300);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const {
    history,
    historyRef,
    showHistory,
    setShowHistory,
    add: addHistory,
    remove: removeHistoryItem,
    clear: clearHistory,
  } = useSearchHistory(searchInputRef);

  useEffect(() => {
    if (debouncedSearch) {
      addHistory(debouncedSearch);
    }
  }, [addHistory, debouncedSearch]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeCategory !== 'all') params.set('cat', activeCategory);
    if (activeGrade) params.set('grade', activeGrade);
    if (debouncedSearch) params.set('q', debouncedSearch);
    setSearchParams(params, { replace: true });
  }, [activeCategory, activeGrade, debouncedSearch, setSearchParams]);

  const interactiveApps = useMemo(
    () => allResources.filter((app) => app.category !== '赋能教学' && (app.route_path || app.file_path)),
    [allResources]
  );

  const { paginatedApps, hasMore, loadMore, totalCount } = useFilteredResources({
    resources: interactiveApps,
    activeCategory,
    activeGrade,
    debouncedSearch,
    categories: CATEGORIES,
    grades: GRADES,
  });

  const handleHistoryClick = useCallback(
    (query: string) => {
      setSearch(query);
      setShowHistory(false);
      searchInputRef.current?.focus();
    },
    [setShowHistory]
  );

  const handleRemoveHistoryItem = useCallback(
    (e: React.MouseEvent, query: string) => {
      e.stopPropagation();
      removeHistoryItem(query);
    },
    [removeHistoryItem]
  );

  const handleClearSearch = useCallback(() => {
    setSearch('');
    searchInputRef.current?.focus();
  }, []);

  if (loading && allResources.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 mb-6 sm:mb-10">
        <PageHeader title="AI应用" subtitle="探索精彩的数学教学互动资源库" />

        <div className="flex items-center gap-2 sm:gap-4 bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-white/50 shadow-sm w-full">
          <SearchBar
            value={search}
            onChange={setSearch}
            onClear={handleClearSearch}
            placeholder="搜索资源..."
            searchHistory={history}
            showHistory={showHistory}
            onFocus={() => setShowHistory(true)}
            onHistoryClick={handleHistoryClick}
            onHistoryRemove={handleRemoveHistoryItem}
            onHistoryClear={clearHistory}
            historyRef={historyRef}
            inputRef={searchInputRef}
          />
          <button className="p-2.5 hover:bg-white hover:shadow-md rounded-xl text-gray-500 hover:text-orange-600 transition-all duration-300 flex-shrink-0">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {debouncedSearch && (
        <div className="mb-6 flex items-center gap-2 text-sm">
          <span className="text-gray-500">
            搜索 "<span className="text-orange-600 font-medium">{debouncedSearch}</span>" 找到{' '}
            <span className="font-bold text-gray-700">{totalCount}</span> 个结果
          </span>
          <button
            onClick={handleClearSearch}
            className="text-orange-500 hover:text-orange-600 hover:underline ml-2"
          >
            清除搜索
          </button>
        </div>
      )}

      <FilterTabs
        categories={CATEGORIES}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        grades={GRADES}
        activeGrade={activeGrade}
        onGradeChange={setActiveGrade}
      />

      <div className="mb-8 sm:mb-12">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
          <span className="w-1.5 h-5 sm:h-6 bg-purple-500 rounded-full block" />
          AI 教学应用
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {paginatedApps.map((app) => (
            <ResourceCard
              key={app.id}
              resource={app}
              searchQuery={debouncedSearch || undefined}
              accentColor="orange"
            />
          ))}
          {paginatedApps.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
              {debouncedSearch ? (
                <div>
                  <p className="mb-2">未找到与 "{debouncedSearch}" 相关的资源</p>
                  <p className="text-sm">试试其他关键词，或使用拼音首字母搜索。</p>
                </div>
              ) : (
                '暂无资源，敬请期待。'
              )}
            </div>
          )}
        </div>

        {hasMore && (
          <div className="flex justify-center mt-8 pb-12">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-8 py-3 bg-white text-slate-600 font-medium rounded-full shadow-sm border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? '加载中...' : '加载更多资源'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
