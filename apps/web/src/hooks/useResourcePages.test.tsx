import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { getResourcePage } from '../lib/api';
import { useResourcePages } from './useResourcePages';

vi.mock('../lib/api', () => ({ getResourcePage: vi.fn() }));

describe('resource list navigation cache', () => {
  it('reuses fresh list data on return and still refreshes after explicit invalidation', async () => {
    const api = vi.mocked(getResourcePage);
    api.mockReset().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, hasMore: false, source: 'database' });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const first = renderHook(() => useResourcePages({ section: 'ai' }), { wrapper });
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();
    const second = renderHook(() => useResourcePages({ section: 'ai' }), { wrapper });
    expect(second.result.current.loading).toBe(false);
    expect(api).toHaveBeenCalledTimes(1);
    await act(async () => { await client.invalidateQueries({ queryKey: ['resource-pages'] }); });
    expect(api).toHaveBeenCalledTimes(2);
    second.unmount();
    client.clear();
  });
});
