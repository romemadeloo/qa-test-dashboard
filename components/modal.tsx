'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// Modals open from a query parameter (?run=1, ?schedule=new), so links, buttons and the browser's
// Back button all drive them. This removes those parameters again.
export function useCloseModal(params: string[]) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  return () => {
    const next = new URLSearchParams(searchParams.toString());
    for (const p of params) next.delete(p);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
}

export function Modal({
  title,
  subtitle,
  icon,
  onClose,
  width = 620,
  children
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('form input:not([type=hidden]), form select')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button type="button" className="modal-backdrop absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} aria-label="Close" tabIndex={-1} />
      <div ref={panel} className="modal-panel card relative w-full" style={{ maxWidth: width }}>
        <header className="flex items-start gap-4 px-6 pt-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--accent-soft)] text-accent" aria-hidden>
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="modal-title" className="text-lg font-extrabold tracking-tight">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 truncate text-xs font-semibold text-[var(--muted)]">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn -mt-1 -mr-2" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="px-6 pt-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mb-4 rounded-2xl bg-[var(--critical-soft)] px-4 py-3 text-sm font-semibold text-critical-text">{message}</p>;
}
