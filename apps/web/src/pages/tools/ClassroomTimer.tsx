import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { clsx } from 'clsx';

const PRESETS = [
  { label: '1分钟', value: 60 },
  { label: '3分钟', value: 180 },
  { label: '5分钟', value: 300 },
  { label: '10分钟', value: 600 },
];

const SVG_SIZE = 280;
const CENTER = SVG_SIZE / 2;
const RADIUS = 108;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ClassroomTimer = () => {
  const [totalTime, setTotalTime] = useState(300);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const [customSeconds, setCustomSeconds] = useState('');

  const timerRef = useRef<number | null>(null);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setIsFinished(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setIsFinished(false);
    setTimeLeft(totalTime);
  }, [totalTime]);

  const handleSetTime = useCallback((seconds: number) => {
    setIsRunning(false);
    setIsFinished(false);
    setTotalTime(seconds);
    setTimeLeft(seconds);
  }, []);

  const handleCustomSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const minutes = parseInt(customMinutes, 10) || 0;
      const seconds = parseInt(customSeconds, 10) || 0;
      const total = minutes * 60 + seconds;

      if (total > 0) {
        handleSetTime(total);
        setCustomMinutes('');
        setCustomSeconds('');
      }
    },
    [customMinutes, customSeconds, handleSetTime]
  );

  const progress = totalTime > 0 ? timeLeft / totalTime : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const isUrgent = timeLeft <= 10 && timeLeft > 0;
  const themeColor = isUrgent ? 'text-red-500' : isFinished ? 'text-emerald-500' : 'text-blue-500';
  const bgColor = isUrgent ? 'bg-red-50' : isFinished ? 'bg-emerald-50' : 'bg-blue-50';

  return (
    <div className={clsx('min-h-screen transition-colors duration-500', bgColor)}>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-8 pt-5 sm:px-6 sm:pt-6">
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-8">
          <Link
            to="/empower"
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/60 bg-white/60 px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </Link>

          <div className="hidden items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-400 sm:flex">
            <Clock className="h-4 w-4" />
            课堂计时器
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-2">
          <div className="relative mb-8 sm:mb-10">
            <div
              className={clsx(
                'pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-30 transition-colors duration-500 sm:h-72 sm:w-72',
                isUrgent ? 'bg-red-400 animate-pulse' : isFinished ? 'bg-emerald-400' : 'bg-blue-400'
              )}
            />

            <div className="relative h-[min(78vw,22rem)] w-[min(78vw,22rem)] sm:h-[24rem] sm:w-[24rem]">
              <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="h-full w-full -rotate-90 drop-shadow-xl">
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  stroke="white"
                  strokeWidth="12"
                  fill="none"
                  className="opacity-60"
                />
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="white"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  className={clsx('transition-all duration-1000 ease-linear', themeColor)}
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
                {isFinished ? (
                  <>
                    <span className="text-4xl sm:text-6xl">铃响</span>
                    <p className="mt-3 text-2xl font-black text-emerald-600 sm:text-4xl">时间到</p>
                  </>
                ) : (
                  <div
                    className={clsx(
                      'font-mono font-black tabular-nums tracking-tighter transition-all duration-300',
                      isUrgent ? 'scale-105 text-5xl text-red-500 sm:text-7xl' : 'text-5xl text-slate-700 sm:text-7xl'
                    )}
                  >
                    {formatTime(timeLeft)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex w-full max-w-2xl flex-col items-center gap-6 sm:gap-8">
            <div className="flex items-center gap-4 sm:gap-6">
              {!isRunning ? (
                <button
                  onClick={() => {
                    if (timeLeft === 0) handleSetTime(totalTime);
                    setIsRunning(true);
                    setIsFinished(false);
                  }}
                  aria-label="开始计时"
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all duration-300 hover:bg-blue-500 hover:shadow-blue-500/30 sm:h-20 sm:w-20"
                >
                  <Play className="ml-1 h-7 w-7 fill-current sm:h-8 sm:w-8" />
                </button>
              ) : (
                <button
                  onClick={() => setIsRunning(false)}
                  aria-label="暂停计时"
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg transition-all duration-300 hover:bg-amber-400 hover:shadow-amber-500/30 sm:h-20 sm:w-20"
                >
                  <Pause className="h-7 w-7 fill-current sm:h-8 sm:w-8" />
                </button>
              )}

              <button
                onClick={handleReset}
                aria-label="重置计时器"
                className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-500 shadow-md transition-colors hover:bg-slate-50 hover:text-slate-700 sm:h-16 sm:w-16"
              >
                <RotateCcw className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-center">
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleSetTime(preset.value)}
                  className={clsx(
                    'min-h-12 rounded-2xl border-2 px-4 py-3 text-sm font-bold transition-all sm:min-w-[108px]',
                    totalTime === preset.value
                      ? 'translate-y-[-1px] border-blue-500 bg-white text-blue-600 shadow-md'
                      : 'border-transparent bg-white/70 text-slate-500 hover:border-slate-200 hover:bg-white'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={handleCustomSubmit}
              className="flex w-full max-w-md flex-col gap-3 rounded-[1.75rem] border border-white/60 bg-white/70 p-3 shadow-sm sm:flex-row sm:items-center"
            >
              <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
                <input
                  type="number"
                  placeholder="分"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  className="h-12 rounded-xl bg-white px-3 text-center text-base font-bold text-slate-700 outline-none ring-1 ring-slate-100 transition focus:ring-2 focus:ring-blue-300"
                  min="0"
                  max="99"
                />
                <span className="text-center text-lg font-bold text-slate-400">:</span>
                <input
                  type="number"
                  placeholder="秒"
                  value={customSeconds}
                  onChange={(e) => setCustomSeconds(e.target.value)}
                  className="h-12 rounded-xl bg-white px-3 text-center text-base font-bold text-slate-700 outline-none ring-1 ring-slate-100 transition focus:ring-2 focus:ring-blue-300"
                  min="0"
                  max="59"
                />
              </div>
              <button
                type="submit"
                className="min-h-12 rounded-2xl bg-slate-800 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-700"
              >
                设定时间
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassroomTimer;
