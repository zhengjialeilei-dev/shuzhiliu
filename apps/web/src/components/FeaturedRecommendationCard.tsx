import { ArrowRight, Copy, ExternalLink, Sparkles } from 'lucide-react';
import type { ResolvedFeaturedTheme } from '../lib/recommendations';

interface FeaturedRecommendationCardProps {
  theme: ResolvedFeaturedTheme;
  onCopyPrompt: (title: string, prompt: string) => void;
}

const FeaturedRecommendationCard = ({
  theme,
  onCopyPrompt,
}: FeaturedRecommendationCardProps) => {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-orange-100 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(255,247,237,0.95)_45%,_rgba(255,237,213,0.92)_100%)] p-5 shadow-[0_18px_60px_rgba(251,146,60,0.12)] sm:p-8">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.2),_transparent_70%)] lg:block" />
      <div className="absolute -right-16 -top-14 h-44 w-44 rounded-full bg-orange-200/40 blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/85 px-3 py-1 text-xs font-semibold text-orange-600 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {theme.eyebrow}
          </div>

          <div className="space-y-3">
            <h2 className="max-w-3xl text-2xl font-bold leading-tight text-slate-900 sm:text-3xl lg:text-[2.35rem]">
              {theme.title}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">{theme.subtitle}</p>
            <div className="inline-flex rounded-full bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700">
              {theme.focusLabel}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap gap-2">
              {theme.resource.badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700"
                >
                  {badge}
                </span>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">主资源</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {theme.resource.titleOverride || theme.resource.resource.title}
              </h3>
              <p className="text-sm leading-7 text-slate-600 sm:text-base">{theme.resource.summary}</p>
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-slate-800">为什么先看它：</span>
                {theme.resource.reason}
              </p>
              <p>
                <span className="font-semibold text-slate-800">适合什么时候用：</span>
                {theme.resource.audience}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <a
                href={theme.resource.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                先打开主资源
                <ArrowRight className="h-4 w-4" />
              </a>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-3 text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{theme.resource.resource.category}</span>
                <span className="text-slate-300">·</span>
                <span>{theme.resource.resource.grade}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <a
            href={theme.resource.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group block overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/85 p-3 shadow-lg"
          >
            <div className="overflow-hidden rounded-[1.4rem]">
              <img
                src={theme.resource.resource.image_url}
                alt={theme.resource.resource.title}
                className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105"
              />
            </div>
            <div className="mt-3 flex items-start justify-between gap-3 rounded-[1.25rem] bg-slate-950/92 p-4 text-white">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-orange-200">Featured Theme</p>
                <h3 className="mt-1 text-lg font-semibold">{theme.resource.resource.title}</h3>
                <p className="mt-1 text-sm text-white/80">{theme.resource.summary}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-orange-200" />
            </div>
          </a>

          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-slate-100 bg-white/85 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">配套提示词</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">{theme.prompt.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{theme.prompt.summary}</p>
              <p className="mt-3 text-sm text-slate-500">
                <span className="font-semibold text-slate-700">适用场景：</span>
                {theme.prompt.useCase}
              </p>
              <button
                type="button"
                onClick={() => onCopyPrompt(theme.prompt.title, theme.prompt.prompt)}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
              >
                <Copy className="h-4 w-4" />
                复制这条提示词
              </button>
            </div>

            <a
              href={theme.extension.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-[1.5rem] border border-slate-100 bg-white/85 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">延伸工具</p>
                  <h3 className="mt-2 text-lg font-bold text-slate-900">{theme.extension.title}</h3>
                </div>
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-600">{theme.extension.summary}</p>
              <p className="mt-3 text-sm text-slate-500">
                <span className="font-semibold text-slate-700">最适合拿来做：</span>
                {theme.extension.bestFor}
              </p>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedRecommendationCard;
