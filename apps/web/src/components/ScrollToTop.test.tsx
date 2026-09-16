import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ScrollToTop from './ScrollToTop';

describe('ScrollToTop', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it('restores the list position on Back, while new pages start at the top', () => {
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(5000);
    vi.stubGlobal('scrollY', 0);
    const scrollTo = vi.fn(({ top }: { top: number }) => { vi.stubGlobal('scrollY', top); });
    vi.stubGlobal('scrollTo', scrollTo);
    function Back() { const navigate = useNavigate(); return <button onClick={() => navigate(-1)}>返回列表</button>; }
    render(<MemoryRouter initialEntries={['/list']}>
      <ScrollToTop />
      <Routes>
        <Route path="/list" element={<Link to="/work">打开作品</Link>} />
        <Route path="/work" element={<Back />} />
      </Routes>
    </MemoryRouter>);
    vi.stubGlobal('scrollY', 750);
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole('link', { name: '打开作品' }));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: 'auto' });
    fireEvent.click(screen.getByRole('button', { name: '返回列表' }));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 750, left: 0, behavior: 'auto' });
  });
  it('returns to the top after pathname navigation', () => {
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);

    render(
      <MemoryRouter initialEntries={['/first']}>
        <ScrollToTop />
        <Link to="/second">下一页</Link>
        <Routes>
          <Route path="/first" element={<div>第一页</div>} />
          <Route path="/second" element={<div>第二页</div>} />
        </Routes>
      </MemoryRouter>
    );

    scrollTo.mockClear();
    fireEvent.click(screen.getByRole('link', { name: '下一页' }));

    expect(screen.getByText('第二页')).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    vi.unstubAllGlobals();
  });
});
