import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HtmlViewer from './HtmlViewer';
import { renderWithProviders } from '../test/render';

const mockUseResources = vi.fn();

vi.mock('../hooks/useResources', () => ({
  useResources: (options?: unknown) => mockUseResources(options),
}));

describe('HtmlViewer', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    mockUseResources.mockReturnValue({
      allResources: [],
      loading: false,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('renders fetched html via srcDoc when html content is available', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => '<html><head></head><body>Hello MathFlow</body></html>',
    } as Response);

    renderWithProviders(<HtmlViewer />, {
      initialEntries: ['/view?url=https://example.com/demo.html'],
      routePath: '/view',
    });

    const iframe = await screen.findByTitle('数学应用');
    await waitFor(() => {
      expect(iframe).toHaveAttribute('srcdoc');
      expect(iframe.getAttribute('srcdoc')).toContain('Hello MathFlow');
    });
  });

  it('falls back to direct src mode when both direct and proxy fetch fail', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => '',
      } as Response);

    renderWithProviders(<HtmlViewer />, {
      initialEntries: ['/view?url=https://example.com/demo.html'],
      routePath: '/view',
    });

    expect(await screen.findByText('已回退到直连模式')).toBeInTheDocument();
    const iframe = await screen.findByTitle('数学应用');
    expect(iframe).toHaveAttribute('src', 'https://example.com/demo.html');
  });

  it('shows empty-url state', () => {
    renderWithProviders(<HtmlViewer />, {
      initialEntries: ['/view'],
      routePath: '/view',
    });

    expect(screen.getByText('没有提供有效的资源地址')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回首页' }));
  });

  it('supports generated clean slug routes for html resources', async () => {
    mockUseResources.mockReturnValue({
      allResources: [
        {
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
        },
      ],
      loading: false,
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => '<html><head></head><body>Potion</body></html>',
    } as Response);

    renderWithProviders(<HtmlViewer />, {
      initialEntries: ['/zhijing/potion-percentages'],
      routePath: '/zhijing/:slug',
    });

    const iframe = await screen.findByTitle('魔法药水浓度模拟器');
    await waitFor(() => {
      expect(iframe.getAttribute('srcdoc')).toContain('Potion');
    });
  });

  it('supports short route aliases for html resources', async () => {
    mockUseResources.mockReturnValue({
      allResources: [
        {
          id: '2',
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
        },
      ],
      loading: false,
    });

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      text: async () => '<html><head></head><body>Interest</body></html>',
    } as Response);

    renderWithProviders(<HtmlViewer />, {
      initialEntries: ['/ll'],
      routePath: '/:slug',
    });

    const iframe = await screen.findByTitle('利率');
    await waitFor(() => {
      expect(iframe.getAttribute('srcdoc')).toContain('Interest');
    });
  });
});
