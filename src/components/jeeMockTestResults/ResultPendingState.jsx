import { resultsSecondaryButtonClass } from './ResultsShell';

function PendingIllustration() {
  return (
    <svg viewBox="0 0 180 128" className="mx-auto h-28 w-44" role="img" aria-label="Examination not attempted">
      <rect x="46" y="20" width="88" height="92" rx="12" fill="#ffffff" stroke="#003366" strokeWidth="2" />
      <rect x="62" y="38" width="56" height="8" rx="4" fill="#e0ebf5" />
      <rect x="62" y="56" width="40" height="6" rx="3" fill="#f3f4f6" />
      <rect x="62" y="70" width="48" height="6" rx="3" fill="#f3f4f6" />
      <rect x="62" y="84" width="28" height="6" rx="3" fill="#f3f4f6" />
    </svg>
  );
}

const STATUS_ROWS = [
  ['Registration', 'Completed', 'text-[#15803d]'],
  ['Examination', 'Not Attempted', 'text-[#041e30]'],
  ['Result', 'Not Available', 'text-[#041e30]'],
];

export default function ResultPendingState({ studentName, onLeave, leaving }) {
  return (
    <div>
      <PendingIllustration />
      <p className="mt-5 text-center text-xs font-semibold tracking-[0.16em] text-[#003366] uppercase">
        JEE Main Mock Test
      </p>
      <h1 className="mt-2 text-center text-[1.75rem] leading-tight font-semibold tracking-tight">
        Examination not attempted
      </h1>
      {studentName && <p className="mt-2 text-center text-sm font-medium text-[#5c6b7a]">{studentName}</p>}
      <p className="mt-4 text-center text-[15px] leading-6 text-[#243646]">
        Your registration is complete. There is no attempt on record for this mobile number, so a result cannot be shown.
      </p>

      <dl className="mt-6 divide-y divide-[#e5e7eb] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
        {STATUS_ROWS.map(([label, value, tone]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-[#5c6b7a]">{label}</dt>
            <dd className={`text-right text-sm font-semibold ${tone}`}>{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-center text-sm leading-6 text-[#5c6b7a]">
        A performance report is available only after the mock test has been attempted.
      </p>
      <button type="button" className={`${resultsSecondaryButtonClass} mt-6`} onClick={onLeave} disabled={leaving}>
        {leaving ? 'Taking you back…' : 'Back to GuideXpert'}
      </button>
    </div>
  );
}
