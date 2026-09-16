import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './Home';
import { renderWithProviders } from '../test/render';
import { getResourcePage } from '../lib/api';
import type { Resource, ResourcePage } from '../lib/types';

vi.mock('../lib/api', () => ({ getResourcePage: vi.fn() }));
const api = vi.mocked(getResourcePage);
const resource = (id: string, title: string): Resource => ({
  id, title, category: '图形与几何', grade: '六年级', image_url: '/test.png',
  description: title, file_path: '/demo.html', route_path: null,
  resource_type: 'html', created_at: '2026-09-17T00:00:00Z',
});
const circle = resource('1', '圆的面积推导');
const fraction = resource('2', '分数练习');
const page = (items: Resource[], number = 1, hasMore = false): ResourcePage<Resource> => ({
  items, total: hasMore ? 21 : items.length, page: number, pageSize: 20, hasMore, source: 'database',
});

describe('Home server pagination', () => {
  beforeEach(() => { api.mockReset(); localStorage.clear(); });

  it('requests only AI resources and appends the next page without duplicates', async () => {
    api.mockResolvedValueOnce(page([circle], 1, true)).mockResolvedValueOnce(page([circle, fraction], 2));
    renderWithProviders(<Home />);
    expect(await screen.findByRole('link', { name: /圆的面积推导/ })).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ section: 'ai' }), 1, expect.any(AbortSignal));
    fireEvent.click(screen.getByRole('button', { name: /加载更多/ }));
    expect(await screen.findByRole('link', { name: /分数练习/ })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /圆的面积推导/ })).toHaveLength(1);
    expect(api).toHaveBeenLastCalledWith(expect.objectContaining({ section: 'ai' }), 2, expect.any(AbortSignal));
  });

  it('debounces pinyin search, resets the page and keeps the focused input mounted', async () => {
    api.mockResolvedValueOnce(page([fraction], 1, true));
    let finish!: (value: ResourcePage<Resource>) => void;
    api.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    renderWithProviders(<Home />);
    await screen.findByRole('link', { name: /分数练习/ });
    const input = screen.getByPlaceholderText('搜索资源...');
    input.focus();
    fireEvent.change(input, { target: { value: 'ydmjtd' } });
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.objectContaining({ q: 'ydmjtd' }), 1, expect.any(AbortSignal)));
    expect(input).toHaveFocus();
    expect(screen.getByPlaceholderText('搜索资源...')).toBe(input);
    expect(screen.queryByRole('link', { name: /分数练习/ })).not.toBeInTheDocument();
    await act(async () => finish(page([circle])));
    expect(await screen.findByRole('link', { name: /圆的面积推导/ })).toBeInTheDocument();
    expect(screen.getByText((_, e) => e?.textContent === '搜索 "ydmjtd" 找到 1 个结果')).toBeInTheDocument();
  });

  it('sends category and grade to the API instead of filtering the current page', async () => {
    api.mockResolvedValue(page([]));
    renderWithProviders(<Home />);
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '图形与几何' }));
    fireEvent.click(screen.getByRole('button', { name: '六年级' }));
    await waitFor(() => expect(api).toHaveBeenLastCalledWith(expect.objectContaining({ category: '图形与几何', grade: '六年级' }), 1, expect.any(AbortSignal)));
  });

  it('cancels a superseded filter request and ignores its late result', async () => {
    let finish!: (value: ResourcePage<Resource>) => void;
    api.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValue(page([fraction]));
    renderWithProviders(<Home />);
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    const signal = api.mock.calls[0][2]!;
    fireEvent.click(screen.getByRole('button', { name: '数与代数' }));
    await screen.findByRole('link', { name: /分数练习/ });
    expect(signal.aborted).toBe(true);
    await act(async () => finish(page([circle])));
    expect(screen.queryByRole('link', { name: /圆的面积推导/ })).not.toBeInTheDocument();
  });

  it('shows retry on failure and never creates local resources', async () => {
    api.mockRejectedValueOnce(new Error('暂时不可用')).mockResolvedValueOnce(page([circle]));
    renderWithProviders(<Home />);
    fireEvent.click(await screen.findByRole('button', { name: '重试' }));
    expect(await screen.findByRole('link', { name: /圆的面积推导/ })).toBeInTheDocument();
  });

  it('labels explicit development demo data', async () => {
    api.mockResolvedValue({ ...page([circle]), source: 'demo' });
    renderWithProviders(<Home />);
    expect(await screen.findByText(/当前为开发演示数据/)).toBeInTheDocument();
  });
});
