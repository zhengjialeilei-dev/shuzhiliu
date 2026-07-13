import React, { useEffect, useState } from 'react';
import { highlightLiteralMatch, type HighlightPart } from '../lib/basicSearch';

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
  const [parts, setParts] = useState<HighlightPart[]>(() => highlightLiteralMatch(text, query));

  useEffect(() => {
    const literalParts = highlightLiteralMatch(text, query);
    setParts(literalParts);

    if (
      literalParts.some((part) => part.highlighted) ||
      !/^[a-z\s]+$/i.test(query.trim())
    ) return undefined;

    let active = true;
    import('../lib/pinyinSearch').then(({ highlightMatch }) => {
      if (active) setParts(highlightMatch(text, query));
    });

    return () => {
      active = false;
    };
  }, [query, text]);

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
