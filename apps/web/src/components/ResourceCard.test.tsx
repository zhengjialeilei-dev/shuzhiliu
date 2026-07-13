import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Resource } from '../lib/types';
import ResourceCard from './ResourceCard';

const resource: Resource = {
  id: 'resource-1',
  title: '旧标题',
  category: '数与代数',
  grade: '一年级',
  image_url: 'https://example.com/old.png',
  description: '旧描述',
  file_path: 'https://example.com/demo.html',
  route_path: null,
  resource_type: 'html',
  created_at: new Date().toISOString(),
};

function CardHarness({ value }: { value: Resource }) {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ResourceCard resource={value} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ResourceCard', () => {
  it('renders updated metadata when an existing resource changes', () => {
    const view = render(<CardHarness value={resource} />);

    view.rerender(
      <CardHarness
        value={{
          ...resource,
          title: '新标题',
          description: '新描述',
          image_url: 'https://example.com/new.png',
        }}
      />
    );

    expect(screen.getByText('新标题')).toBeInTheDocument();
    expect(screen.getByText('新描述')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '新标题' })).toHaveAttribute('src', 'https://example.com/new.png');
    expect(screen.getByRole('link', { name: /新标题/ })).not.toHaveAttribute('target');
  });
});
