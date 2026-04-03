import PageHeader from '../components/PageHeader';

const PLACEHOLDERS = [
  '顶部主题区',
  '主内容区',
  '辅助内容区',
  '底部行动区',
];

export default function Recommend() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6 lg:px-10 lg:py-10">
      <div className="space-y-6">
        <PageHeader
          title="推荐页设计画布"
          subtitle="旧的推荐内容已经清空，这里保留一个干净页面，方便你重新定义结构和内容。"
          gradientColors="from-slate-400 to-slate-600"
        />

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
              Blank Canvas
            </p>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              这里现在是一张空白画布
            </h2>
            <p className="text-sm leading-7 text-slate-600 sm:text-base">
              推荐页原有的主推资源、提示词、外部工具和专题策展都已经移除。当前保留的是一个极简容器，
              你可以基于它重新安排版块、文案和视觉方向。
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {PLACEHOLDERS.map((label) => (
            <div
              key={label}
              className="flex min-h-[180px] items-center justify-center rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center"
            >
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Placeholder
                </p>
                <p className="text-lg font-semibold text-slate-700">{label}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
