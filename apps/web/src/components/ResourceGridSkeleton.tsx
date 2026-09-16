export default function ResourceGridSkeleton() {
  return <>
    <span role="status" className="sr-only">正在加载资源…</span>
    {Array.from({ length: 8 }, (_, index) => (
      <div key={index} aria-hidden="true" className="overflow-hidden rounded-xl border border-slate-100 bg-white sm:rounded-2xl motion-safe:animate-pulse">
        <div className="aspect-[4/3] bg-slate-100" />
        <div className="space-y-2 p-3 sm:p-4">
          <div className="h-4 w-3/4 rounded bg-slate-100" />
          <div className="hidden h-3 w-full rounded bg-slate-50 sm:block" />
        </div>
      </div>
    ))}
  </>;
}
