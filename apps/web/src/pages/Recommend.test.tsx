import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Recommend from './Recommend';
import { renderWithProviders } from '../test/render';

describe('Recommend', () => {
  it('renders a clean blank canvas for redesign', () => {
    renderWithProviders(<Recommend />, {
      initialEntries: ['/recommend'],
      routePath: '/recommend',
    });

    expect(screen.getByText('推荐页设计画布')).toBeInTheDocument();
    expect(screen.getByText('这里现在是一张空白画布')).toBeInTheDocument();
    expect(screen.getByText('顶部主题区')).toBeInTheDocument();
    expect(screen.getByText('主内容区')).toBeInTheDocument();
    expect(screen.getByText('辅助内容区')).toBeInTheDocument();
    expect(screen.getByText('底部行动区')).toBeInTheDocument();
  });
});
