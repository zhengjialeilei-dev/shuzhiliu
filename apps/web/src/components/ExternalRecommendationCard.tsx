import { ExternalLink } from 'lucide-react';
import type { ExternalRecommendation } from '../lib/recommendationConfig';

interface ExternalRecommendationCardProps {
  item: ExternalRecommendation;
}

const LABELS = {
  external_tool: 'AI 工具',
  teacher_website: '教师常用网页',
} as const;

export default function ExternalRecommendationCard({ item }: ExternalRecommendationCardProps) {
  return (
    <article className="rounded-[1.6rem] border border-slate-100 bg-white/90 p-5 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {LABELS[item.kind]}
          </p>
          <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
        </div>
        <ExternalLink className="mt-1 h-4 w-4 flex-shrink-0 text-slate-400" />
      </div>

      <p className="mt-3 text-sm leading-7 text-slate-600">{item.summary}</p>

      <div className="mt-4 space-y-2 rounded-[1.2rem] bg-slate-50 p-4 text-sm text-slate-600">
        <p>
          <span className="font-semibold text-slate-800">老师最适合拿它做：</span>
          {item.bestFor}
        </p>
        <p>
          <span className="font-semibold text-slate-800">什么时候别直接照用：</span>
          {item.cautions}
        </p>
        <p>
          <span className="font-semibold text-slate-800">使用门槛：</span>
          {item.access}
        </p>
        {item.pairedPromptTitle ? (
          <p>
            <span className="font-semibold text-slate-800">推荐搭配提示词：</span>
            {item.pairedPromptTitle}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {item.badges.map((badge) => (
          <span
            key={badge}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
          >
            {badge}
          </span>
        ))}
      </div>

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        打开 {item.title}
        <ExternalLink className="h-4 w-4" />
      </a>
    </article>
  );
}
