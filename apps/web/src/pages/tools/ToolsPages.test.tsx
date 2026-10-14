import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RandomPicker from './RandomPicker';
import ClassroomTimer from './ClassroomTimer';
import GroupScoreboard from './GroupScoreboard';

describe('tool pages mobile smoke tests', () => {
  beforeEach(() => {
    sessionStorage.clear();
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
      this.querySelector<HTMLTextAreaElement>('textarea')?.focus();
    }) });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.removeAttribute('open'); }) });
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('opens random picker settings and saves a custom list', () => {
    render(
      <MemoryRouter>
        <RandomPicker />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /名单设置/ }));
    fireEvent.change(screen.getByLabelText('姓名列表'), {
      target: { value: '小明，小红，小刚' },
    });
    fireEvent.click(screen.getByRole('button', { name: /保存并生效/ }));

    expect(screen.queryByText('设置名单')).not.toBeInTheDocument();
    expect(screen.getByText('当前名单共 3 人')).toBeInTheDocument();
  });

  it('supports custom timer input and reset', () => {
    render(
      <MemoryRouter>
        <ClassroomTimer />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('分'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('秒'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: /设定时间/ }));

    expect(screen.getByText('02:30')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /重置计时器/ }));
    expect(screen.getByText('02:30')).toBeInTheDocument();
  });

  it('updates scoreboard scores and can reset them', () => {
    render(
      <MemoryRouter>
        <GroupScoreboard />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /第 1 组 加 5 分/ }));
    expect(screen.getByText('5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /清空比分/ }));
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('retains scores across remounts and gives equal scores the same rank', () => {
    const first = render(<MemoryRouter><GroupScoreboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '第 1 组 加 5 分' }));
    fireEvent.click(screen.getByRole('button', { name: '第 2 组 加 5 分' }));
    first.unmount();
    render(<MemoryRouter><GroupScoreboard /></MemoryRouter>);
    expect(screen.getAllByText('5')).toHaveLength(2);
    expect(screen.getAllByText('#1')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /清空比分/ }));
    expect(JSON.parse(sessionStorage.getItem('mathflow_group_scores')!)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('does not crash when persisted classroom data is malformed', () => {
    sessionStorage.setItem('mathflow_group_scores', '["wrong"]');
    sessionStorage.setItem('mathflow_picker_names', '{"names":null}');
    const first = render(<MemoryRouter><GroupScoreboard /></MemoryRouter>);
    expect(screen.getAllByText('0')).toHaveLength(6);
    first.unmount();
    render(<MemoryRouter><RandomPicker /></MemoryRouter>);
    expect(screen.getByText('当前名单共 16 人')).toBeInTheDocument();
  });

  it('rejects empty names, closes settings on cancel and retains a saved list', () => {
    const first = render(<MemoryRouter><RandomPicker /></MemoryRouter>);
    const settings = screen.getByRole('button', { name: /名单设置/ });
    settings.focus();
    fireEvent.click(settings);
    expect(screen.getByLabelText('姓名列表')).toHaveFocus();
    fireEvent.change(screen.getByLabelText('姓名列表'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: '保存并生效' })).toBeDisabled();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(settings).toHaveFocus();
    fireEvent.click(settings);
    fireEvent.change(screen.getByLabelText('姓名列表'), { target: { value: '小明，小红' } });
    fireEvent.click(screen.getByRole('button', { name: '保存并生效' }));
    first.unmount();
    render(<MemoryRouter><RandomPicker /></MemoryRouter>);
    expect(screen.getByText('当前名单共 2 人')).toBeInTheDocument();
  });

  it('uses elapsed wall time after a suspended tab and resumes from pause', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T10:00:00Z'));
    render(<MemoryRouter><ClassroomTimer /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '开始计时' }));
    act(() => { vi.setSystemTime(new Date('2026-10-14T10:02:00Z')); document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.getByText('03:00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '暂停计时' }));
    act(() => vi.advanceTimersByTime(60000));
    expect(screen.getByText('03:00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '开始计时' }));
    act(() => { vi.setSystemTime(new Date('2026-10-14T10:06:00Z')); document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.getByRole('status')).toHaveTextContent('时间到');
    expect(screen.queryByText('00:00')).not.toBeInTheDocument();
  });

  it('returns to the exact filtered tool list', () => {
    render(<MemoryRouter initialEntries={[{ pathname: '/tools/timer', state: { returnTo: '/empower?q=计时' } }]}><ClassroomTimer /></MemoryRouter>);
    expect(screen.getByRole('link', { name: '返回列表' })).toHaveAttribute('href', '/empower?q=计时');
  });
});
