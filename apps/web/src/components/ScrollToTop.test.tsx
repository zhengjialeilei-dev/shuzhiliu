import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ScrollToTop from './ScrollToTop';

describe('ScrollToTop', () => {
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
