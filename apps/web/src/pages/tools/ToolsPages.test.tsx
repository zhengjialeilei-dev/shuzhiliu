import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import RandomPicker from './RandomPicker';
import ClassroomTimer from './ClassroomTimer';
import GroupScoreboard from './GroupScoreboard';

describe('tool pages mobile smoke tests', () => {
  beforeEach(() => {
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
});
