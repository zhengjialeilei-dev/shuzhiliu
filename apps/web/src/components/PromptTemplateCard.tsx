import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PromptTemplateRecommendation } from '../lib/recommendationConfig';

interface PromptTemplateCardProps {
  item: PromptTemplateRecommendation;
  onCopyPrompt: (title: string, prompt: string) => Promise<boolean> | boolean;
}

export default function PromptTemplateCard({ item, onCopyPrompt }: PromptTemplateCardProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    const success = await onCopyPrompt(item.title, item.prompt);
    if (success) setCopied(true);
  };

  return (
    <article className="rounded-[1.6rem] border border-slate-100 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex flex-wrap gap-2">
        {item.badges.map((badge) => (
          <span
            key={badge}
            className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700"
          >
            {badge}
          </span>
        ))}
      </div>

      <h3 className="mt-4 text-xl font-bold text-slate-900">{item.title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{item.summary}</p>

      <div className="mt-4 space-y-2 rounded-[1.2rem] bg-slate-50 p-4 text-sm text-slate-600">
        <p>
          <span className="font-semibold text-slate-800">适用场景：</span>
          {item.useCase}
        </p>
        <p>
          <span className="font-semibold text-slate-800">期望输出：</span>
          {item.expectedOutput}
        </p>
      </div>

      <div className="mt-4 rounded-[1.2rem] border border-dashed border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">提示词正文</p>
        <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {item.prompt}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {item.recommendedTools.map((tool) => (
          <span
            key={tool}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
          >
            {tool}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? '已复制提示词' : '一键复制提示词'}
      </button>
    </article>
  );
}
