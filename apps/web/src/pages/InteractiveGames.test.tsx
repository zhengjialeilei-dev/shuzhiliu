import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InteractiveGames from './InteractiveGames';
import { renderWithProviders } from '../test/render';

vi.mock('../hooks/useResources', () => ({
  useResources: () => ({
    allResources: [
      {
        id: '1',
        title: '趣味数独',
        category: '互动游戏',
        grade: '通用',
        image_url: 'https://example.com/1.png',
        description: '逻辑闯关',
        file_path: '/sudoku.html',
        route_path: '/sd',
        resource_type: 'html',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        title: '圆的面积推导',
        category: '图形与几何',
        grade: '六年级',
        image_url: 'https://example.com/2.png',
        description: '推导资源',
        file_path: '/circle.html',
        route_path: '/ymj',
        resource_type: 'html',
        created_at: new Date().toISOString(),
      },
    ],
    loading: false,
  }),
}));

describe('InteractiveGames', () => {
  it('renders only interactive game resources', () => {
    renderWithProviders(<InteractiveGames />, {
      initialEntries: ['/games'],
      routePath: '/games',
    });

    expect(screen.getByRole('heading', { name: '互动游戏' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /趣味数独/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /圆的面积推导/ })).not.toBeInTheDocument();
  });
});
