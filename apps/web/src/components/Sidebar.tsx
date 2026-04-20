import { useState, useRef, useCallback } from 'react';
import { Zap, GraduationCap, Hexagon, Sparkles, ThumbsUp, Menu, X, Gamepad2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';

const MENU_ITEMS = [
  { icon: Sparkles, label: 'AI赋能', path: '/', adminPath: '/admin/upload' },
  { icon: Gamepad2, label: '互动游戏', path: '/games', adminPath: '/admin/upload' },
  { icon: Zap, label: '实用工具', path: '/empower', adminPath: '/admin/upload' },
  { icon: GraduationCap, label: '教学专区', path: '/teaching-zone', adminPath: '/admin/upload' },
  { icon: ThumbsUp, label: '推荐', path: '/recommend', adminPath: '/admin/upload' },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const clickCountsRef = useRef<Record<string, number>>({});
  const clickTimersRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const [showHint, setShowHint] = useState<string | null>(null);

  const handleNavClick = useCallback(
    (e: React.MouseEvent, item: (typeof MENU_ITEMS)[number]) => {
      const key = item.path;

      if (!clickCountsRef.current[key]) {
        clickCountsRef.current[key] = 0;
      }

      clickCountsRef.current[key] += 1;

      if (clickTimersRef.current[key]) {
        clearTimeout(clickTimersRef.current[key] as ReturnType<typeof setTimeout>);
      }

      if (clickCountsRef.current[key] === 2) {
        setShowHint(key);
        setTimeout(() => setShowHint(null), 800);
      }

      if (clickCountsRef.current[key] >= 3) {
        e.preventDefault();
        clickCountsRef.current[key] = 0;
        navigate(item.adminPath);
        setMobileMenuOpen(false);
        return;
      }

      clickTimersRef.current[key] = setTimeout(() => {
        clickCountsRef.current[key] = 0;
      }, 2000);

      setMobileMenuOpen(false);
    },
    [navigate]
  );

  const handleLogoClick = useCallback(() => {
    navigate('/admin/upload');
    setMobileMenuOpen(false);
  }, [navigate]);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <>
      <div className="hidden md:flex w-72 h-[calc(100vh-2rem)] sticky top-4 flex-col bg-white/60 backdrop-blur-2xl rounded-[2rem] shadow-2xl shadow-slate-200/50 z-50 transition-all duration-300 ml-2">
        <div className="pt-10 pb-8 px-8 flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-emerald-500 rounded-2xl blur opacity-40 group-hover:opacity-60 transition-opacity duration-500 animate-pulse" />
            <div
              onClick={handleLogoClick}
              className="relative w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white transform group-hover:scale-105 transition-transform duration-300 cursor-pointer select-none"
            >
              <Hexagon className="w-7 h-7 stroke-[2.5]" />
            </div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-sans font-bold text-slate-800 tracking-tight leading-none group-hover:text-emerald-700 transition-colors">
              MathFlow
            </h1>
            <span className="text-xs font-medium text-slate-400 tracking-[0.2em] mt-1.5 ml-0.5">
              数智流
            </span>
          </div>
        </div>

        <nav className="flex-1 px-6 py-6 space-y-3">
          {MENU_ITEMS.map((item, index) => {
            const isActive = location.pathname === item.path;
            const isHinting = showHint === item.path;
            return (
              <Link
                key={index}
                to={item.path}
                onClick={(e) => handleNavClick(e, item)}
                className={clsx(
                  'group relative flex items-center px-5 py-4 rounded-2xl transition-all duration-500 ease-out overflow-hidden',
                  isActive ? 'shadow-lg shadow-emerald-500/20' : 'hover:bg-emerald-50/60'
                )}
              >
                <div
                  className={clsx(
                    'absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 transition-opacity duration-500',
                    isActive ? 'opacity-100' : 'opacity-0'
                  )}
                />

                <div className="relative flex items-center gap-4 z-10">
                  <item.icon
                    className={clsx(
                      'w-5 h-5 transition-all duration-300',
                      isActive
                        ? 'text-white scale-110'
                        : 'text-slate-500 group-hover:text-emerald-600 group-hover:scale-110'
                    )}
                  />
                  <span
                    className={clsx(
                      'text-[15px] tracking-wide transition-colors duration-300',
                      isActive
                        ? 'font-bold text-white'
                        : 'font-medium text-slate-600 group-hover:text-emerald-700'
                    )}
                  >
                    {item.label}
                  </span>
                </div>

                {isActive && (
                  <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse" />
                )}

                {isHinting && (
                  <div className="absolute right-4 w-3 h-3 bg-amber-400 rounded-full animate-ping z-20" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 pb-8">
          <div className="px-4 py-3 rounded-2xl border border-slate-100/50 bg-gradient-to-br from-white/50 to-transparent">
            <p className="text-[10px] text-slate-300 text-center font-medium tracking-widest uppercase">
              Copyright 2026 MathFlow
            </p>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3" onClick={handleLogoClick}>
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center text-white">
              <Hexagon className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">MathFlow</h1>
              <span className="text-[10px] text-slate-400 tracking-wider">数智流</span>
            </div>
          </div>
          <button onClick={toggleMobileMenu} className="p-2 rounded-xl bg-slate-100 text-slate-600">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={closeMobileMenu} />
      )}

      <div
        className={clsx(
          'md:hidden fixed top-[60px] right-0 bottom-0 w-64 bg-white z-50 shadow-2xl transition-transform duration-300 ease-out',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <nav className="p-4 space-y-2">
          {MENU_ITEMS.map((item, index) => {
            const isActive = location.pathname === item.path;
            const isHinting = showHint === item.path;
            return (
              <Link
                key={index}
                to={item.path}
                onClick={(e) => handleNavClick(e, item)}
                className={clsx(
                  'relative flex items-center px-4 py-3 rounded-xl transition-all',
                  isActive
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                )}
              >
                <item.icon className={clsx('w-5 h-5 mr-3', isActive ? 'text-white' : 'text-slate-500')} />
                <span className={clsx('font-medium', isActive ? 'text-white' : 'text-slate-700')}>
                  {item.label}
                </span>
                {isHinting && (
                  <div className="absolute right-3 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-slate-200 safe-area-pb">
        <nav className="flex items-center justify-around py-2 px-2">
          {MENU_ITEMS.map((item, index) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={index}
                to={item.path}
                onClick={(e) => handleNavClick(e, item)}
                className={clsx(
                  'flex flex-col items-center py-2 px-4 rounded-xl transition-all min-w-[70px]',
                  isActive ? 'text-emerald-600' : 'text-slate-400'
                )}
              >
                <div className={clsx('p-2 rounded-xl transition-all', isActive ? 'bg-emerald-100' : '')}>
                  <item.icon
                    className={clsx(
                      'w-5 h-5 transition-all',
                      isActive ? 'text-emerald-600' : 'text-slate-400'
                    )}
                  />
                </div>
                <span
                  className={clsx(
                    'text-[10px] mt-1 font-medium transition-all',
                    isActive ? 'text-emerald-600' : 'text-slate-400'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
