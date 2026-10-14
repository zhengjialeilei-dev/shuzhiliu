import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import InteractiveGames from './InteractiveGames';
import { renderWithProviders } from '../test/render';
import { getResourcePage } from '../lib/api';

vi.mock('../lib/api', () => ({
  getResourcePage: vi.fn().mockResolvedValue({
    items: [{ id: '1', title: '趣味数独', category: '互动游戏', grade: '通用',
      image_url: '/test.png', description: '逻辑闯关', file_path: '/sudoku.html',
      route_path: '/sd', resource_type: 'html', created_at: '2026-09-17T00:00:00Z' }],
    total: 1, page: 1, pageSize: 20, hasMore: false, source: 'database',
  }),
}));

describe('InteractiveGames', () => {
  it('requests the games section and renders the returned resources', async () => {
    renderWithProviders(<InteractiveGames />, { initialEntries: ['/games'], routePath: '/games' });
    expect(screen.getByRole('heading', { name: '互动游戏' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /趣味数独/ })).toBeInTheDocument();
    expect(getResourcePage).toHaveBeenCalledWith({ section: 'games', q: '' }, 1, expect.any(AbortSignal));
  });

  it('retains search after opening a game and returning', async () => {
    function Game() {
      const navigate = useNavigate();
      return <button onClick={() => navigate(-1)}>返回游戏列表</button>;
    }
    renderWithProviders(<Routes>
      <Route path="/games" element={<InteractiveGames />} />
      <Route path="/sd" element={<Game />} />
    </Routes>, { initialEntries: ['/games'] });
    fireEvent.change(screen.getByRole('textbox', { name: '搜索游戏...' }), { target: { value: '数独' } });
    await waitFor(() => expect(getResourcePage).toHaveBeenLastCalledWith({ section: 'games', q: '数独' }, 1, expect.any(AbortSignal)));
    fireEvent.click(await screen.findByRole('link', { name: /趣味数独/ }));
    fireEvent.click(screen.getByRole('button', { name: '返回游戏列表' }));
    expect(screen.getByRole('textbox', { name: '搜索游戏...' })).toHaveValue('数独');
    expect(await screen.findByRole('link', { name: /趣味数独/ })).toBeInTheDocument();
  });
});
