import ResourceCard from './ResourceCard';
import ExternalRecommendationCard from './ExternalRecommendationCard';
import PromptTemplateCard from './PromptTemplateCard';
import type {
  ResolvedInternalRecommendation,
  ResolvedRecommendationContent,
} from '../lib/recommendations';

interface RecommendationContentCardProps {
  item: ResolvedRecommendationContent;
  accentColor?: 'orange' | 'emerald';
  onCopyPrompt: (title: string, prompt: string) => Promise<boolean> | boolean;
}

function isResolvedInternalRecommendation(
  item: ResolvedRecommendationContent
): item is ResolvedInternalRecommendation {
  return item.kind === 'internal_resource';
}

export default function RecommendationContentCard({
  item,
  accentColor = 'orange',
  onCopyPrompt,
}: RecommendationContentCardProps) {
  if (item.kind === 'prompt_template') {
    return <PromptTemplateCard item={item} onCopyPrompt={onCopyPrompt} />;
  }

  if (item.kind === 'external_tool' || item.kind === 'teacher_website') {
    return <ExternalRecommendationCard item={item} />;
  }

  if (!isResolvedInternalRecommendation(item)) {
    return null;
  }

  const resourceItem = item;

  return (
    <div className="space-y-3">
      <ResourceCard resource={resourceItem.resource} accentColor={accentColor} />
      <article className="rounded-[1.35rem] border border-slate-100 bg-white/85 p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {resourceItem.badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
            >
              {badge}
            </span>
          ))}
        </div>
        <h3 className="mt-3 text-lg font-bold text-slate-900">
          {resourceItem.titleOverride || resourceItem.resource.title}
        </h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">{resourceItem.summary}</p>
        <p className="mt-3 text-sm text-slate-500">
          <span className="font-semibold text-slate-700">为什么推荐：</span>
          {resourceItem.reason}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          <span className="font-semibold text-slate-700">适合场景：</span>
          {resourceItem.audience}
        </p>
      </article>
    </div>
  );
}
