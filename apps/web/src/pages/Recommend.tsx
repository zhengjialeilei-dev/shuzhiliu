import { BookOpen, ExternalLink, Wrench } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  teachingTools,
  teachingWebsites,
  type RecommendedLink,
} from '../lib/recommendedLinks';

interface LinkSectionProps {
  title: string;
  description: string;
  items: RecommendedLink[];
  icon: typeof BookOpen;
}

function LinkSection({ title, description, items, icon: Icon }: LinkSectionProps) {
  return (
    <section aria-labelledby={`${title}-title`} className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id={`${title}-title`} className="text-xl font-bold text-slate-900 sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-40 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            aria-label={`访问${item.name}`}
          >
            <div>
              <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-emerald-700">
                {item.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              访问网站
              <ExternalLink
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function Recommend() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
      <div className="space-y-10">
        <PageHeader
          title="教师常用网站与工具"
          subtitle="精选日常教学中真正用得上的网站和工具，点击即可访问。"
          gradientColors="from-emerald-400 to-teal-600"
        />

        <LinkSection
          title="常用教学网站"
          description="查找课程资源、教材资料和课程标准。"
          items={teachingWebsites}
          icon={BookOpen}
        />

        <div className="h-px bg-slate-200" aria-hidden="true" />

        <LinkSection
          title="实用工具"
          description="辅助备课、整理资料、制作课件和数学演示。"
          items={teachingTools}
          icon={Wrench}
        />
      </div>
    </div>
  );
}
