import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

const RecommendationEmptyState = () => {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white/80 p-8 text-center shadow-sm sm:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-500">
        <Compass className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-slate-900">推荐清单正在整理中</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
        当前推荐位还没有匹配到可展示的资源。你可以先去首页浏览全部互动资源，或者进入教学专区查看成体系的教学资料。
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          去首页找资源
        </Link>
        <Link
          to="/teaching-zone"
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          进入教学专区
        </Link>
      </div>
    </div>
  );
};

export default RecommendationEmptyState;
