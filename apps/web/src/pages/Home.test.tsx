import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Home from './Home';
import { renderWithProviders } from '../test/render';

vi.mock('../hooks/useResources', () => ({
  useResources: () => ({
    allResources: [
      {
        id: '1',
        title: '圆的面积推导',
        category: '图形与几何',
        grade: '六年级',
        image_url: 'https://example.com/1.png',
        description: '几何资源',
        file_path: '/demo.html',
        route_path: null,
        resource_type: 'html',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        title: '随机点名神器',
        category: '互动工具',
        grade: '通用',
        image_url: 'https://example.com/2.png',
        description: '工具资源',
        file_path: null,
        route_path: '/tools/random-picker',
        resource_type: 'react',
        created_at: new Date().toISOString(),
      },
      {
        id: '3',
        title: '分数练习',
        category: '数与代数',
        grade: '五年级',
        image_url: 'https://example.com/3.png',
        description: '练习资源',
        file_path: '/fraction.html',
        route_path: null,
        resource_type: 'html',
        created_at: new Date().toISOString(),
      },
      {
        id: '4',
        title: '趣味数独',
        category: '互动游戏',
        grade: '通用',
        image_url: 'https://example.com/4.png',
        description: '游戏资源',
        file_path: '/sudoku.html',
        route_path: '/sd',
        resource_type: 'html',
        created_at: new Date().toISOString(),
      },
    ],
    loading: false,
  }),
}));

describe('Home', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('filters resources based on search input', async () => {
    vi.useFakeTimers();

    renderWithProviders(<Home />);

    const input = screen.getByPlaceholderText('搜索资源...');
    fireEvent.change(input, { target: { value: '圆' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByText(/找到/)).toHaveTextContent('找到 1 个结果');
    expect(screen.getByRole('link', { name: /圆的面积推导/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /分数练习/ })).not.toBeInTheDocument();
  });

  it('supports pinyin initials when filtering resources', async () => {
    vi.useFakeTimers();

    renderWithProviders(<Home />);

    const input = screen.getByPlaceholderText('搜索资源...');
    fireEvent.change(input, { target: { value: 'ydmjtd' } });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByText((_, element) => element?.textContent === '搜索 "ydmjtd" 找到 1 个结果')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /圆的面积推导/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /分数练习/ })).not.toBeInTheDocument();
  });

  it('does not mix interactive games into the AI empowerment home list', () => {
    renderWithProviders(<Home />);

    expect(screen.queryByRole('link', { name: /趣味数独/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /圆的面积推导/ })).toBeInTheDocument();
  });
});
