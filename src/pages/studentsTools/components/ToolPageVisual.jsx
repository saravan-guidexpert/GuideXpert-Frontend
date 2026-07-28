import {
  RankPredictorIllustration,
  CollegePredictorIllustration,
  BranchPredictorIllustration,
  PredictorIllustration,
  OtherProductIcon,
} from '../../../components/studentDashboard/careers360/SectionIllustrations';
import '../../../components/studentDashboard/careers360/studentsSectionMotion.css';

function resolveToolVisualId(pathname) {
  const path = String(pathname || '');
  if (path.startsWith('/students/rank-predictor')) return 'rank';
  if (path.includes('college-predictor')) return 'college';
  if (path.includes('branch-predictor')) return 'branch';
  if (path.includes('exam-predictor')) return 'exam';
  if (path.includes('college-comparison')) return 'compare';
  if (path.includes('course-fit')) return 'fit-course';
  if (path.includes('college-fit')) return 'fit-college';
  if (path.includes('deadline')) return 'deadline';
  return 'college';
}

function ExamPredictorPanel({ className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[#e8eaed] bg-gradient-to-br from-[#fff8ed] via-[#fff4ed] to-[#eef2f7] ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 320 220" className="mx-auto h-auto w-full max-w-[320px] p-4" fill="none">
        <rect x="36" y="28" width="248" height="164" rx="16" fill="#fff" stroke="#e5e7eb" />
        <rect x="56" y="48" width="80" height="10" rx="5" fill="#1e3a5f" fillOpacity="0.75" />
        <rect x="56" y="68" width="56" height="7" rx="3.5" fill="#e5e7eb" />
        <path
          d="M170 52l-22 30h16l-6 24 26-34h-16l2-20z"
          fill="#f27921"
          className="gx-anim-wiggle"
        />
        <g className="gx-anim-float">
          <rect x="56" y="110" width="100" height="48" rx="10" fill="#fff4ed" stroke="#f27921" strokeOpacity="0.35" />
          <rect x="70" y="126" width="48" height="8" rx="4" fill="#f27921" fillOpacity="0.7" />
          <rect x="70" y="140" width="64" height="6" rx="3" fill="#e5e7eb" />
        </g>
        <g className="gx-anim-float gx-anim-delay-2">
          <rect x="172" y="110" width="90" height="48" rx="10" fill="#eef2f7" />
          <rect x="186" y="126" width="44" height="8" rx="4" fill="#1e3a5f" fillOpacity="0.65" />
          <rect x="186" y="140" width="54" height="6" rx="3" fill="#d1d5db" />
        </g>
      </svg>
    </div>
  );
}

function ComparePanel({ className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[#e8eaed] bg-gradient-to-br from-[#eef2f7] via-[#f7f8fc] to-[#fff4ed] ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 320 220" className="mx-auto h-auto w-full max-w-[320px] p-5" fill="none">
        <rect x="28" y="36" width="100" height="140" rx="16" fill="#1e3a5f" className="gx-anim-float-soft" />
        <rect x="48" y="56" width="60" height="10" rx="5" fill="#fff" fillOpacity="0.35" />
        <rect x="48" y="78" width="48" height="8" rx="4" fill="#fff" fillOpacity="0.2" />
        <rect x="48" y="120" width="60" height="36" rx="8" fill="#fff" fillOpacity="0.12" />

        <rect x="192" y="36" width="100" height="140" rx="16" fill="#f27921" className="gx-anim-float gx-anim-delay-1" />
        <rect x="212" y="56" width="60" height="10" rx="5" fill="#fff" fillOpacity="0.45" />
        <rect x="212" y="78" width="48" height="8" rx="4" fill="#fff" fillOpacity="0.25" />
        <rect x="212" y="120" width="60" height="36" rx="8" fill="#fff" fillOpacity="0.15" />

        <circle cx="160" cy="110" r="22" fill="#fff" stroke="#e5e7eb" />
        <text x="160" y="116" textAnchor="middle" fill="#041e30" fontSize="14" fontWeight="800" fontFamily="system-ui">
          VS
        </text>
      </svg>
    </div>
  );
}

function FitPanel({ kind = 'course', className = '' }) {
  const mint = kind === 'college';
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[#e8eaed] bg-gradient-to-br ${
        mint ? 'from-[#e8f5ef] via-[#f5faf8] to-[#fff8f3]' : 'from-[#fff4ed] via-[#fff8f0] to-[#eef2f7]'
      } ${className}`}
      aria-hidden
    >
      <div className="flex min-h-[200px] items-center justify-center p-6 sm:min-h-[220px]">
        <OtherProductIcon
          id={mint ? 'fit-college' : 'fit-course'}
          className="h-28 w-28 sm:h-32 sm:w-32"
        />
      </div>
    </div>
  );
}

function DeadlinePanel({ className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-[#e8eaed] bg-gradient-to-br from-[#eef0ff] via-[#f7f8fc] to-[#fff4ed] ${className}`}
      aria-hidden
    >
      <svg viewBox="0 0 320 220" className="mx-auto h-auto w-full max-w-[300px] p-6" fill="none">
        <rect x="70" y="30" width="180" height="150" rx="16" fill="#fff" stroke="#e5e7eb" />
        <rect x="70" y="30" width="180" height="36" rx="16" fill="#4f46e5" />
        <circle cx="96" cy="48" r="5" fill="#fff" className="gx-anim-pulse" />
        <circle cx="224" cy="48" r="5" fill="#fff" />
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <rect
              key={`${row}-${col}`}
              x={92 + col * 36}
              y={86 + row * 22}
              width="24"
              height="14"
              rx="4"
              fill={row === 1 && col === 1 ? '#c7f36b' : row === 2 && col === 2 ? '#fff4ed' : '#eef2f7'}
              className={row === 1 && col === 1 ? 'gx-anim-check' : undefined}
            />
          ))
        )}
      </svg>
    </div>
  );
}

/**
 * Large professional visual for the bottom “About this tool” band.
 */
export default function ToolPageVisual({ pathname, className = '' }) {
  const id = resolveToolVisualId(pathname);
  const shell = `h-full min-h-[200px] w-full sm:min-h-[220px] ${className}`;

  if (id === 'rank') {
    return <RankPredictorIllustration className={shell} />;
  }
  if (id === 'college') {
    return <CollegePredictorIllustration className={shell} />;
  }
  if (id === 'branch') {
    return <BranchPredictorIllustration className={shell} />;
  }
  if (id === 'exam') {
    return <ExamPredictorPanel className={shell} />;
  }
  if (id === 'compare') {
    return <ComparePanel className={shell} />;
  }
  if (id === 'fit-course') {
    return <FitPanel kind="course" className={shell} />;
  }
  if (id === 'fit-college') {
    return <FitPanel kind="college" className={shell} />;
  }
  if (id === 'deadline') {
    return <DeadlinePanel className={shell} />;
  }

  return <PredictorIllustration id="college" className={shell} />;
}

/** Compact vector chip for Tool facts / side of text */
export function ToolFactsVector({ pathname, className = '' }) {
  const id = resolveToolVisualId(pathname);
  const map = {
    rank: 'compare',
    college: 'fit-college',
    branch: 'compare',
    exam: 'fit-course',
    compare: 'compare',
    'fit-course': 'fit-course',
    'fit-college': 'fit-college',
    deadline: 'fit-course',
  };
  return (
    <div className={`flex justify-center sm:justify-start ${className}`}>
      <OtherProductIcon id={map[id] || 'compare'} className="h-14 w-14" />
    </div>
  );
}
