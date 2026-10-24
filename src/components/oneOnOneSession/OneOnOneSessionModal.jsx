import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import JeeMainMockTestForm from '../jeeMainMockTest/JeeMainMockTestForm';

export default function OneOnOneSessionModal({ open, onClose }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="one-on-one-booking-title">
      <button
        type="button"
        className="absolute inset-0 bg-[#041e30]/45 backdrop-blur-[3px]"
        aria-label="Close registration form"
        onClick={onClose}
      />
      <div className="relative z-[1] flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[#e5e7eb] bg-[#F8FAFC] shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e8eaed] bg-white px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f27921]">
              JEE Main mock test
            </p>
            <h2 id="one-on-one-booking-title" className="mt-1 text-lg font-bold text-[#0F172A] sm:text-xl">
              Register for the JEE Main mock test
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#555] transition hover:bg-[#f5f6f8] hover:text-[#111]"
            aria-label="Close"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <JeeMainMockTestForm key={open ? 'open' : 'closed'} scrollContainerRef={bodyRef} />
        </div>
      </div>
    </div>,
    document.body
  );
}
