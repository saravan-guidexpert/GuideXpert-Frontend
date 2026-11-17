import { resultsSecondaryButtonClass } from './ResultsShell';

function RegistrationIllustration() {
  return (
    <svg viewBox="0 0 180 128" className="mx-auto h-28 w-44" role="img" aria-label="Registration completed, examination not attempted">
      <rect x="42" y="24" width="74" height="88" rx="10" fill="#ffffff" stroke="#003366" strokeWidth="2" />
      <rect x="64" y="14" width="30" height="16" rx="5" fill="#e0ebf5" stroke="#003366" strokeWidth="2" />
      <path d="M58 48h42M58 62h42M58 76h28" stroke="#85b3d9" strokeWidth="3" strokeLinecap="round" />
      <circle cx="132" cy="88" r="22" fill="#ffffff" stroke="#f27921" strokeWidth="2" />
      <path d="M132 76v13l8 5" fill="none" stroke="#f27921" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STATUS_ROWS = [
  ['Registration Status', 'Completed'],
  ['Examination Status', 'Not Attempted'],
  ['Result Status', 'Not Available'],
];

export default function NotAttemptedState({ studentName, onLeave, leaving }) {
  return (
    <div>
      <RegistrationIllustration />
      <p className="mt-5 text-center text-xs font-semibold tracking-[0.16em] text-[#003366] uppercase">
        Registration completed
      </p>
      <h1 className="mt-2 text-center text-[1.75rem] leading-tight font-semibold tracking-tight">
        You're Registered Successfully!
      </h1>
      {studentName && <p className="mt-2 text-center text-sm font-medium text-[#5c6b7a]">{studentName}</p>}
      <p className="mt-4 text-center text-[15px] leading-6 text-[#243646]">
        We've successfully verified your registration for the JEE Main Mock Test. However, our records show that you haven't attempted the examination.
      </p>

      <dl className="mt-6 divide-y divide-[#e5e7eb] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
        {STATUS_ROWS.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-[#5c6b7a]">{label}</dt>
            <dd className="text-right text-sm font-semibold text-[#041e30]">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 text-center text-sm leading-6 text-[#5c6b7a]">
        Since you haven't attempted the mock test, there is no performance report available to download.
      </p>
      <button type="button" className={`${resultsSecondaryButtonClass} mt-6`} onClick={onLeave} disabled={leaving}>
        {leaving ? 'Taking you back…' : 'Back to GuideXpert'}
      </button>
    </div>
  );
}
