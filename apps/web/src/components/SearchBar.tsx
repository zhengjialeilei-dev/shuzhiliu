import React, { useRef } from 'react';
import { Clock, Search, Trash2, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  searchHistory?: string[];
  showHistory?: boolean;
  onFocus?: () => void;
  onHistoryClick?: (query: string) => void;
  onHistoryRemove?: (e: React.MouseEvent, query: string) => void;
  onHistoryClear?: () => void;
  historyRef?: React.RefObject<HTMLDivElement | null>;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onClear,
  placeholder = '搜索资源...',
  searchHistory = [],
  showHistory = false,
  onFocus,
  onHistoryClick,
  onHistoryRemove,
  onHistoryClear,
  historyRef,
  inputRef: externalInputRef,
}) => {
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef || internalInputRef;

  return (
    <div className="relative group flex-1">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        className="pl-10 pr-10 py-2.5 sm:py-3 bg-white rounded-xl border-none ring-1 ring-gray-100 w-full focus:ring-2 focus:ring-orange-400 focus:outline-none transition-all duration-300 placeholder-gray-400 text-sm"
      />
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
        </button>
      )}

      {showHistory && searchHistory.length > 0 && !value && (
        <div
          ref={historyRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50">
            <span className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              最近搜索
            </span>
            <button
              onClick={onHistoryClear}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              清空
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {searchHistory.map((query, index) => (
              <div
                key={index}
                onClick={() => onHistoryClick?.(query)}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-orange-50 cursor-pointer group/item transition-colors"
              >
                <span className="text-sm text-gray-600">{query}</span>
                <button
                  onClick={(e) => onHistoryRemove?.(e, query)}
                  className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-orange-100 rounded transition-all"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
