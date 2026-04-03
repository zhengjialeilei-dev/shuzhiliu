import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Settings, X, Play, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';

const DEFAULT_NAMES = [
  '张三',
  '李四',
  '王五',
  '赵六',
  '孙七',
  '周八',
  '吴九',
  '郑十',
  '陈一',
  '林二',
  '黄三',
  '许四',
  '冯五',
  '沈六',
  '韩七',
  '杨八',
];

const RandomPicker = () => {
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES);
  const [currentName, setCurrentName] = useState<string>('准备就绪');
  const [isRolling, setIsRolling] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [inputNames, setInputNames] = useState(DEFAULT_NAMES.join('，'));
  const [winner, setWinner] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const speedRef = useRef<number>(50);

  const nameCount = useMemo(
    () => inputNames.split(/[,\n，、]/).map((item) => item.trim()).filter(Boolean).length,
    [inputNames]
  );

  const handleNamesUpdate = () => {
    const newNames = inputNames
      .split(/[,\n，、]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (newNames.length > 0) {
      setNames(newNames);
      setShowSettings(false);
      setCurrentName('准备就绪');
      setWinner(null);
    }
  };

  const startRoll = () => {
    if (isRolling || names.length === 0) return;

    setIsRolling(true);
    setWinner(null);
    speedRef.current = 50;

    let duration = 0;
    const totalDuration = 1800;
    const slowDownDuration = 1100;

    const roll = () => {
      const randomIndex = Math.floor(Math.random() * names.length);
      setCurrentName(names[randomIndex]);
      duration += speedRef.current;

      if (duration < totalDuration) {
        timerRef.current = window.setTimeout(roll, speedRef.current);
        return;
      }

      if (duration < totalDuration + slowDownDuration) {
        speedRef.current *= 1.12;
        timerRef.current = window.setTimeout(roll, speedRef.current);
        return;
      }

      setIsRolling(false);
      setWinner(names[randomIndex]);
    };

    roll();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-rose-400 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-8 pt-5 sm:px-6 sm:pt-6">
        <div className="mb-5 flex items-start justify-between gap-3 sm:mb-8">
          <Link
            to="/empower"
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white/90 backdrop-blur-md transition-colors hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Link>

          <button
            onClick={() => setShowSettings(true)}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white/90 backdrop-blur-md transition-colors hover:bg-white/15"
          >
            <Settings className="h-4 w-4" />
            名单设置
          </button>
        </div>

        <div className="relative flex flex-1 flex-col items-center justify-center">
          <div className="pointer-events-none absolute inset-x-4 top-1/2 hidden h-64 -translate-y-1/2 rounded-full bg-yellow-300/20 blur-3xl sm:block" />

          <div
            className={clsx(
              'relative z-10 flex w-full max-w-3xl flex-col items-center rounded-[2rem] border bg-white px-5 py-8 text-center shadow-2xl transition-all duration-500 sm:px-8 sm:py-10',
              winner
                ? 'border-yellow-300 shadow-yellow-500/30 sm:scale-[1.03]'
                : 'border-white/80 text-slate-800'
            )}
          >
            <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-2 text-left">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Random Picker</p>
                <p className="mt-1 text-sm text-slate-500">当前名单共 {names.length} 人</p>
              </div>
              {winner ? (
                <div className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                  幸运之星
                </div>
              ) : null}
            </div>

            <div className="flex min-h-[180px] w-full items-center justify-center rounded-[1.75rem] bg-slate-50 px-4 py-6 sm:min-h-[240px] sm:px-8">
              <h1
                className={clsx(
                  'w-full break-words text-center font-black leading-none tracking-tight',
                  winner
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-4xl text-transparent sm:text-6xl md:text-7xl'
                    : 'text-4xl text-slate-800 sm:text-6xl md:text-7xl'
                )}
              >
                {currentName}
              </h1>
            </div>

            <p className="mt-5 text-sm font-medium text-slate-500 sm:text-base">
              {isRolling ? '正在随机抽取中...' : winner ? '恭喜这位同学上榜' : '点击下方按钮开始随机点名'}
            </p>

            <div className="mt-6 w-full max-w-md">
              <button
                onClick={startRoll}
                disabled={isRolling}
                className={clsx(
                  'flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-lg font-black shadow-xl transition-all duration-200 active:scale-[0.98] sm:text-xl',
                  isRolling
                    ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                    : 'bg-gradient-to-b from-yellow-300 to-yellow-500 text-yellow-950 hover:translate-y-[-1px] hover:shadow-yellow-500/40'
                )}
              >
                {isRolling ? (
                  <>
                    <RotateCcw className="h-6 w-6 animate-spin" />
                    抽取中...
                  </>
                ) : (
                  <>
                    <Play className="h-6 w-6 fill-current" />
                    {winner ? '再抽一次' : '开始点名'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSettings ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full rounded-t-[2rem] bg-white p-5 text-slate-800 shadow-2xl sm:max-w-xl sm:rounded-[2rem] sm:p-8">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">设置名单</h2>
                <p className="mt-1 text-sm text-slate-500">用逗号、顿号或换行分隔姓名</p>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <label htmlFor="random-picker-names" className="mb-2 block text-sm font-semibold text-slate-600">
              姓名列表
            </label>
            <textarea
              id="random-picker-names"
              value={inputNames}
              onChange={(e) => setInputNames(e.target.value)}
              className="h-48 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base leading-relaxed text-slate-700 outline-none transition focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-200"
              placeholder="例如：张三，李四，王五"
            />
            <div className="mt-3 text-right text-sm text-slate-400">当前共 {nameCount} 人</div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setInputNames(DEFAULT_NAMES.join('，'))}
                className="min-h-12 rounded-2xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-200"
              >
                恢复默认
              </button>
              <button
                onClick={handleNamesUpdate}
                className="min-h-12 flex-1 rounded-2xl bg-fuchsia-600 px-5 py-3 font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition-colors hover:bg-fuchsia-700"
              >
                保存并生效
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RandomPicker;
