import { Link } from 'react-router-dom';

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center px-6 text-center">
    <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="mb-3 text-sm font-bold text-emerald-600">404</p>
      <h1 className="mb-3 text-2xl font-bold text-slate-800">没有找到这个页面</h1>
      <p className="mb-6 text-slate-500">链接可能已失效，可以回到首页重新查找教学资源。</p>
      <Link to="/" className="inline-flex min-h-11 items-center rounded-xl bg-emerald-600 px-6 py-3 text-white hover:bg-emerald-700">返回首页</Link>
    </div>
  </main>;
}
