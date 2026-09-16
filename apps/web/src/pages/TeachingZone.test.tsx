import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TeachingZone from './TeachingZone';
import { renderWithProviders } from '../test/render';
import { getTeachingResourcePage } from '../lib/api';
import type { TeachingResourcePage } from '../lib/types';

vi.mock('../lib/api', () => ({ getTeachingResourcePage: vi.fn() }));
const api = vi.mocked(getTeachingResourcePage);
const empty: TeachingResourcePage = {
  items: [], total: 0, page: 1, pageSize: 20, hasMore: false, source: 'database',
  zones: { standard: 0, textbook: 0, plan: 0, courseware: 1 },
};

describe('TeachingZone', () => {
  beforeEach(() => { api.mockReset(); vi.stubGlobal('open', vi.fn(() => ({ closed: false }))); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('fetches the selected zone and opens its remote resource', async () => {
    api.mockImplementation(async (zone) => zone === 'courseware' ? {
      ...empty, total: 1, items: [{ id: 'remote-1', title: '精品课件示例', description: '课件示例',
        zone: 'courseware', file_url: 'https://example.com/courseware.pdf', file_type: 'pdf' }],
    } : empty);
    renderWithProviders(<TeachingZone />);
    fireEvent.click(screen.getByRole('button', { name: /课件/i }));
    fireEvent.click(await screen.findByText('精品课件示例'));
    expect(api).toHaveBeenCalledWith('courseware', 1, expect.any(AbortSignal));
    expect(window.open).toHaveBeenCalledWith('https://example.com/courseware.pdf', '_blank', 'noopener,noreferrer');
  });

  it('does not resurrect hardcoded textbooks when the database is empty', async () => {
    api.mockResolvedValue(empty);
    renderWithProviders(<TeachingZone />);
    fireEvent.click(screen.getByRole('button', { name: /教材/i }));
    expect(await screen.findByRole('heading', { name: /暂无\s*课本\s*资料/ })).toBeInTheDocument();
    expect(screen.queryByText(/人教版一年级/)).not.toBeInTheDocument();
    await waitFor(() => expect(api).toHaveBeenCalledWith('textbook', 1, expect.any(AbortSignal)));
  });

  it('distinguishes database failure from an empty catalog and allows retry', async () => {
    api.mockRejectedValueOnce(new Error('不可用')).mockResolvedValue(empty);
    renderWithProviders(<TeachingZone />);
    expect(await screen.findByText(/资源加载失败/)).toBeInTheDocument();
    expect(screen.queryByText(/暂无.*资料/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    await waitFor(() => expect(screen.queryByText(/资源加载失败/)).not.toBeInTheDocument());
    expect(api).toHaveBeenCalledTimes(2);
  });
});
