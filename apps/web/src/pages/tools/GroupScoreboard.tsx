import React, { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Crown, RotateCcw, Plus, Minus, Trophy } from 'lucide-react';
import { clsx } from 'clsx';

interface Group {
  id: number;
  name: string;
  score: number;
  color: string;
  borderColor: string;
  textColor: string;
}

const PRESET_COLORS = [
  { bg: 'bg-red-100', border: 'border-red-200', text: 'text-red-700' },
  { bg: 'bg-orange-100', border: 'border-orange-200', text: 'text-orange-700' },
  { bg: 'bg-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700' },
  { bg: 'bg-green-100', border: 'border-green-200', text: 'text-green-700' },
  { bg: 'bg-blue-100', border: 'border-blue-200', text: 'text-blue-700' },
  { bg: 'bg-purple-100', border: 'border-purple-200', text: 'text-purple-700' },
];

const INITIAL_GROUPS: Group[] = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  name: `第 ${index + 1} 组`,
  score: 0,
  color: PRESET_COLORS[index].bg,
  borderColor: PRESET_COLORS[index].border,
  textColor: PRESET_COLORS[index].text,
}));

const GroupScoreboard = () => {
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.id - b.id;
    });
  }, [groups]);

  const updateScore = useCallback((id: number, delta: number) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) =>
        group.id === id ? { ...group, score: Math.max(0, group.score + delta) } : group
      )
    );
  }, []);

  const resetScores = useCallback(() => {
    if (window.confirm('确定要清空所有小组比分吗？')) {
      setGroups((prevGroups) => prevGroups.map((group) => ({ ...group, score: 0 })));
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link
            to="/empower"
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Link>

          <div className="flex items-center gap-2 text-base font-bold text-slate-800 sm:text-xl">
            <Trophy className="h-5 w-5 text-yellow-500 sm:h-6 sm:w-6" />
            小组积分榜
          </div>

          <button
            onClick={resetScores}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50"
          >
            <RotateCcw className="h-4 w-4" />
            清空比分
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedGroups.map((group, index) => {
            const isFirst = index === 0 && group.score > 0;
            const rank = index + 1;

            return (
              <div
                key={group.id}
                className={clsx(
                  'relative rounded-[1.75rem] border-4 bg-white p-4 shadow-sm transition-all duration-300 sm:p-5',
                  group.borderColor
                )}
              >
                {isFirst ? (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                    <Crown className="h-10 w-10 fill-yellow-400 text-yellow-400 drop-shadow-lg sm:h-12 sm:w-12" />
                  </div>
                ) : null}

                <div className="mb-4 flex items-start justify-between gap-3">
                  <div
                    className={clsx(
                      'flex h-8 w-8 items-center justify-center rounded-full text-sm font-black',
                      rank === 1
                        ? 'bg-yellow-400 text-yellow-900'
                        : rank === 2
                          ? 'bg-slate-300 text-slate-700'
                          : rank === 3
                            ? 'bg-orange-300 text-orange-800'
                            : 'bg-slate-100 text-slate-400'
                    )}
                  >
                    #{rank}
                  </div>
                  <h3 className={clsx('flex-1 text-center text-lg font-bold sm:text-xl', group.textColor)}>
                    {group.name}
                  </h3>
                  <div className="w-8" />
                </div>

                <div className={clsx('mb-5 text-center font-black tracking-tighter', group.textColor)}>
                  <div className="text-5xl tabular-nums sm:text-6xl">{group.score}</div>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Score</p>
                </div>

                <div className="grid grid-cols-[auto_1fr_1fr] gap-2 sm:gap-3">
                  <button
                    onClick={() => updateScore(group.id, -1)}
                    aria-label={`${group.name} 减 1 分`}
                    className="flex min-h-12 items-center justify-center rounded-2xl bg-slate-100 px-3 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Minus className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => updateScore(group.id, 1)}
                    aria-label={`${group.name} 加 1 分`}
                    className={clsx(
                      'flex min-h-12 items-center justify-center gap-1 rounded-2xl px-3 text-base font-black shadow-sm transition-transform active:scale-[0.98]',
                      group.color,
                      group.textColor
                    )}
                  >
                    <Plus className="h-5 w-5" />
                    1 分
                  </button>

                  <button
                    onClick={() => updateScore(group.id, 5)}
                    aria-label={`${group.name} 加 5 分`}
                    className={clsx(
                      'flex min-h-12 items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-3 text-base font-black shadow-sm transition-transform active:scale-[0.98]',
                      group.borderColor,
                      group.textColor
                    )}
                  >
                    <Plus className="h-5 w-5" />
                    5 分
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GroupScoreboard;
