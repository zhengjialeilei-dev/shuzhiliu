import React from 'react';
import { clsx } from 'clsx';

interface TabOption {
  id: string;
  label: string;
}

interface FilterTabsProps {
  categories: TabOption[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  grades?: TabOption[];
  activeGrade?: string;
  onGradeChange?: (id: string) => void;
}

const FilterTabs: React.FC<FilterTabsProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
  grades,
  activeGrade = '',
  onGradeChange,
}) => {
  return (
    <div className="space-y-4 mb-8 sm:mb-12">
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={clsx(
              'px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium transition-all duration-300 ease-out border whitespace-nowrap flex-shrink-0',
              activeCategory === cat.id
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/20 border-transparent'
                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-orange-100 hover:text-orange-600 hover:shadow-sm'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {grades && onGradeChange && (
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap items-center scrollbar-hide">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1 sm:mr-2 flex-shrink-0">
            年级:
          </span>
          {grades.map((grade) => (
            <button
              key={grade.id}
              onClick={() => onGradeChange(activeGrade === grade.id ? '' : grade.id)}
              className={clsx(
                'px-3 sm:px-4 py-1.5 rounded-lg sm:rounded-xl text-xs font-medium transition-all duration-200 border whitespace-nowrap flex-shrink-0',
                activeGrade === grade.id
                  ? 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm'
                  : 'bg-transparent border-transparent text-gray-500 hover:bg-white hover:border-gray-100 hover:shadow-sm'
              )}
            >
              {grade.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterTabs;
