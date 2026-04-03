import React from 'react';
import { highlightMatch } from '../lib/pinyinSearch';

interface HighlightTextProps {
  text: string;
  query: string;
  className?: string;
}

/**
 * 搜索高亮文本组件
 * 将匹配到的文本片段用 <mark> 标签高亮显示
 */
const HighlightText: React.FC<HighlightTextProps> = ({ text, query, className = '' }) => {
  const parts = highlightMatch(text, query);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.highlighted ? (
          <mark key={i} className="bg-orange-200 text-orange-800 rounded px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
};

export default HighlightText;
