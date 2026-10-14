import { useEffect, useRef, type ReactNode } from 'react';

export default function Modal({ labelledBy, onClose, children }: {
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  return (
    <dialog ref={ref} aria-labelledby={labelledBy}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-[2rem] bg-white p-5 text-slate-800 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm sm:p-8">
      {children}
    </dialog>
  );
}
