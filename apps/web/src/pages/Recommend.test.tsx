import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Recommend from './Recommend';
import { renderWithProviders } from '../test/render';

describe('Recommend', () => {
  it('renders the concise website and tool recommendations', () => {
    renderWithProviders(<Recommend />, {
      initialEntries: ['/recommend'],
      routePath: '/recommend',
    });

    expect(screen.getByText('教师常用网站与工具')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '常用教学网站' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '实用工具' })).toBeInTheDocument();
    expect(screen.getByText('国家中小学智慧教育平台')).toBeInTheDocument();
    expect(screen.getByText('豆包')).toBeInTheDocument();
    expect(screen.getByText('网络画板')).toBeInTheDocument();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(7);
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', expect.stringMatching(/^https:\/\//));
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
