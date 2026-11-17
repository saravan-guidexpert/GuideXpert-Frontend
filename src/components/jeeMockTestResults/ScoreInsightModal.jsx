import { useEffect, useRef } from 'react';
import { resultsPrimaryButtonClass } from './ResultsShell';

export default function ScoreInsightModal({ kind, onClose }) {
  const dialogRef = useRef(null);
  const buttonRef = useRef(null);
  const strong = kind === 'strong';

  useEffect(() => {
    buttonRef.current?.focus();
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll('button:not([disabled])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06243A]/50 px-4 py-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="jee-score-insight-title"
        aria-describedby="jee-score-insight-copy"
        className="jee-result-pop w-full max-w-sm overflow-hidden rounded-2xl border border-[#E5EAF0] bg-white shadow-[0_24px_60px_rgba(6,36,58,0.22)]"
      >
        <div className={`h-1 ${strong ? 'bg-[#16A36A]' : 'bg-[#003366]'}`} aria-hidden="true" />
        <div className="px-5 pt-5 pb-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[#69798A] uppercase">JEE Main Mock Test</p>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${
                strong ? 'bg-[#E7F6EF] text-[#127A50]' : 'bg-[#E8EEF5] text-[#003366]'
              }`}
            >
              {strong ? 'Strong score' : 'Result ready'}
            </span>
          </div>

          <h2 id="jee-score-insight-title" className="mt-4 text-[1.35rem] leading-tight font-semibold tracking-tight text-[#06243A]">
            Your mock test result
          </h2>

          <p id="jee-score-insight-copy" className="mt-3 text-[15px] leading-6 text-[#3D5163]">
            {strong
              ? 'A score of 150 or above is a strong result on this mock test. Open the full report for your section-wise marks and the time spent on each part.'
              : 'Open the full report for your section-wise marks and the time spent on each part of the mock test.'}
          </p>

          <button ref={buttonRef} type="button" className={`${resultsPrimaryButtonClass} mt-5`} onClick={onClose}>
            View full result
          </button>
        </div>
      </div>
    </div>
  );
}
