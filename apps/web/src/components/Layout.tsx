import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row md:p-4 md:gap-6 relative overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:p-4">跳到主要内容</a>
      <Sidebar />
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 min-h-screen md:min-h-[calc(100vh-2rem)] md:rounded-3xl bg-white/40 backdrop-blur-sm md:border md:border-white/20 md:shadow-soft overflow-y-auto overflow-x-hidden relative pt-[68px] pb-[calc(104px+env(safe-area-inset-bottom,0px))] md:pt-0 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
