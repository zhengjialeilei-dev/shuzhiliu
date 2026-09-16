import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row md:p-4 md:gap-6 relative overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-h-screen md:min-h-[calc(100vh-2rem)] md:rounded-3xl bg-white/40 backdrop-blur-sm md:border md:border-white/20 md:shadow-soft overflow-y-auto overflow-x-hidden relative pt-[68px] pb-[88px] safe-area-pb md:pt-0 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
