import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSearchHistory,
  addSearchHistory,
  clearSearchHistory,
  removeSearchHistoryItem,
} from '../lib/searchHistory';

export function useSearchHistory(inputRef: React.RefObject<HTMLElement | null>) {
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        historyRef.current &&
        !historyRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputRef]);

  const add = useCallback((query: string) => {
    if (query.trim()) {
      addSearchHistory(query.trim());
      setHistory(getSearchHistory());
    }
  }, []);

  const remove = useCallback((query: string) => {
    removeSearchHistoryItem(query);
    setHistory(getSearchHistory());
  }, []);

  const clear = useCallback(() => {
    clearSearchHistory();
    setHistory([]);
  }, []);

  return {
    history,
    historyRef,
    showHistory,
    setShowHistory,
    add,
    remove,
    clear,
  };
}
