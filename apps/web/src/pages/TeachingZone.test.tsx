import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TeachingZone from './TeachingZone';
import { renderWithProviders } from '../test/render';

vi.mock('../lib/api', () => ({
  getTeachingResources: vi.fn().mockResolvedValue([
    {
      id: 'remote-1',
      title: '精品课件示例',
      description: '课件示例',
      zone: 'courseware',
      file_url: 'https://example.com/courseware.pdf',
      file_type: 'pdf',
    },
  ]),
}));

describe('TeachingZone', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn(() => ({ closed: false })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens remote resource in a new window after selecting the zone', async () => {
    renderWithProviders(<TeachingZone />);

    fireEvent.click(screen.getByRole('button', { name: /课件/i }));

    await waitFor(() => {
      expect(screen.getByText('精品课件示例')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('精品课件示例'));

    expect(window.open).toHaveBeenCalledWith(
      'https://example.com/courseware.pdf',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
