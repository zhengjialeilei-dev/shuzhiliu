import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProgressiveImage from './ProgressiveImage';

describe('ProgressiveImage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads priority images immediately', () => {
    render(<ProgressiveImage src="/cover.png" alt="首屏封面" priority />);
    expect(screen.getByRole('img', { name: '首屏封面' })).toHaveAttribute('src', '/cover.png');
  });

  it('defers off-screen images until they approach the viewport', () => {
    let notifyIntersection: ((entries: IntersectionObserverEntry[]) => void) | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();

    class MockIntersectionObserver {
      constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
        notifyIntersection = callback;
      }

      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = '500px 0px';
      thresholds = [0];
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    render(<ProgressiveImage src="/later.png" alt="后续封面" />);

    const image = screen.getByRole('img', { name: '后续封面' });
    expect(image).not.toHaveAttribute('src');
    expect(observe).toHaveBeenCalledWith(image);

    act(() => {
      notifyIntersection?.([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    expect(image).toHaveAttribute('src', '/later.png');
    expect(disconnect).toHaveBeenCalled();
  });
});
