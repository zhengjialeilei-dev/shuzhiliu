import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HtmlViewer from './HtmlViewer';
import { renderWithProviders } from '../test/render';

describe('HtmlViewer', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders proxy iframe url for direct html viewing', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Resource not found' }),
    } as Response);

    renderWithProviders(<HtmlViewer />, {
      initialEntries: ['/view?url=https://example.com/demo.html'],
      routePath: '/view',
    });

    const iframe = await screen.findByTitle('数学应用');
    expect(iframe).toHaveAttribute(
      'src',
      '/api/html-proxy?iframe=1&url=https%3A%2F%2Fexample.com%2Fdemo.html&title=%E6%95%B0%E5%AD%A6%E5%BA%94%E7%94%A8'
    );
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-modals');
    expect(iframe).not.toHaveAttribute('sandbox', expect.stringContaining('allow-same-origin'));
  });

  it('distinguishes network failure from missing content and offers retry', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Failed to fetch'));
    renderWithProviders(<HtmlViewer />, { initialEntries: ['/works/demo'], routePath: '/works/:slug' });
    expect(await screen.findByText('暂时无法打开教学应用', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText('没有找到对应的教学应用')).not.toBeInTheDocument();
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ id: '1', title: '恢复的作品', version: 1, route_path: '/works/demo' }) } as Response);
    fireEvent.click(screen.getByRole('button', { name: '重新尝试' }));
    expect(await screen.findByTitle('恢复的作品')).toBeInTheDocument();
  });

  it('shows empty-url state', () => {
    renderWithProviders(<HtmlViewer />, {
      initialEntries: ['/view'],
      routePath: '/view',
    });

    expect(screen.getByText('没有提供有效的资源地址')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回首页' }));
  });

  it('renders direct path-based proxy iframe for generated clean slug routes', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: '1',
        title: '魔法药水浓度模拟器',
        category: '数与代数',
        grade: '六年级',
        image_url: 'https://example.com/potion.png',
        description: '百分数互动资源',
        file_path:
          'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/legacy/ai-apps/potion-percentages.html',
        route_path: null,
        resource_type: 'html',
        created_at: new Date().toISOString(),
      }),
    } as Response);

    renderWithProviders(<HtmlViewer />, {
      initialEntries: ['/zhijing/potion-percentages'],
      routePath: '/zhijing/:slug',
    });

    const iframe = await screen.findByTitle('魔法药水浓度模拟器');
    expect(iframe).toHaveAttribute(
      'src',
      '/api/html-proxy?iframe=1&path=%2Fzhijing%2Fpotion-percentages&v=1'
    );
  });

  it('renders direct path-based proxy iframe for short route aliases', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: '2',
        version: 3,
        title: '利率',
        category: '数与代数',
        grade: '六年级',
        image_url: 'https://example.com/interest.png',
        description: '利率互动资源',
        file_path:
          'https://mathflow-1317654855.cos.ap-guangzhou.myqcloud.com/collections/ai-apps/interest-calculator.html',
        route_path: '/ll',
        resource_type: 'html',
        created_at: new Date().toISOString(),
      }),
    } as Response);

    renderWithProviders(<HtmlViewer />, {
      initialEntries: ['/ll'],
      routePath: '/:slug',
    });

    const iframe = await screen.findByTitle('利率');
    expect(iframe).toHaveAttribute(
      'src',
      '/api/html-proxy?iframe=1&path=%2Fll&v=3'
    );
  });

  it('returns direct visitors to the home page when no in-app history exists', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Resource not found' }),
    } as Response);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/view?url=https://example.com/demo.html']}>
          <Routes>
            <Route path="/view" element={<HtmlViewer />} />
            <Route path="/" element={<div>首页内容</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await screen.findByTitle('数学应用');
    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(screen.getByText('首页内容')).toBeInTheDocument();
  });
});
