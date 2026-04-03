import type { ReactNode } from 'react';

interface RecommendationSectionProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
  children: ReactNode;
}

const RecommendationSection = ({
  eyebrow,
  title,
  subtitle,
  action,
  children,
}: RecommendationSectionProps) => {
  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">{eyebrow}</p>
          ) : null}
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[2rem]">{title}</h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-500 sm:text-base">{subtitle}</p>
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>

      {children}
    </section>
  );
};

export default RecommendationSection;
