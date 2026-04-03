interface ToastNoticeProps {
  message: string;
  tone?: 'info' | 'error';
}

const TONE_CLASS = {
  info: 'bg-slate-900 text-white',
  error: 'bg-red-600 text-white',
};

export default function ToastNotice({ message, tone = 'info' }: ToastNoticeProps) {
  return (
    <div className="fixed right-4 top-4 z-[100] max-w-sm animate-in fade-in slide-in-from-top-2 duration-200">
      <div className={`rounded-2xl px-4 py-3 shadow-xl ${TONE_CLASS[tone]}`}>
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}
