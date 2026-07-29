import { useState } from 'react';

const FALLBACK_GRADIENTS = {
  'iit-hyd': 'from-sky-900 via-slate-800 to-slate-900',
  'iiit-hyd': 'from-indigo-900 via-slate-800 to-slate-900',
  'nit-w': 'from-amber-900 via-slate-800 to-slate-900',
  vit: 'from-rose-900 via-slate-800 to-slate-900',
  bits: 'from-orange-900 via-slate-800 to-slate-900',
  srm: 'from-blue-900 via-slate-800 to-slate-900',
  niat: 'from-emerald-900 via-slate-800 to-slate-900',
  'campus-1': 'from-sky-900 via-slate-800 to-slate-900',
  'campus-2': 'from-amber-900 via-slate-800 to-slate-900',
  'campus-3': 'from-rose-900 via-slate-800 to-slate-900',
  'campus-4': 'from-orange-900 via-slate-800 to-slate-900',
  'campus-5': 'from-indigo-900 via-slate-800 to-slate-900',
  'campus-niat': 'from-emerald-900 via-slate-800 to-slate-900',
  rank: 'from-sky-900 via-slate-800 to-slate-900',
  college: 'from-amber-900 via-slate-800 to-slate-900',
  'update-jee': 'from-indigo-900 via-slate-800 to-slate-900',
  'update-eamcet': 'from-sky-900 via-slate-800 to-slate-900',
  'update-compare': 'from-rose-900 via-slate-800 to-slate-900',
  'update-fit': 'from-violet-900 via-slate-800 to-slate-900',
  'update-niat': 'from-emerald-900 via-slate-800 to-slate-900',
  'guidance-course': 'from-violet-900 via-slate-800 to-slate-900',
  'guidance-college': 'from-sky-900 via-slate-800 to-slate-900',
  'outcome-1': 'from-rose-900 via-slate-800 to-slate-900',
  'outcome-2': 'from-sky-900 via-slate-800 to-slate-900',
  'outcome-3': 'from-indigo-900 via-slate-800 to-slate-900',
  'outcome-4': 'from-amber-900 via-slate-800 to-slate-900',
  'outcome-5': 'from-orange-900 via-slate-800 to-slate-900',
  'outcome-6': 'from-emerald-900 via-slate-800 to-slate-900',
};

/**
 * Renders a campus photo with automatic fallback if the primary URL fails.
 * @param {{ id?: string, name: string, src: string | string[], className?: string, imgClassName?: string }} props
 */
export default function CollegeCampusImage({ id, name, src, className = '', imgClassName = 'h-full w-full object-cover' }) {
  const sources = (Array.isArray(src) ? src : [src]).filter(Boolean);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const gradient = FALLBACK_GRADIENTS[id] || 'from-slate-800 via-slate-900 to-slate-950';
  const showFallback = failed || sources.length === 0;

  if (showFallback) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br ${gradient} ${className}`}
        role="img"
        aria-label={name}
      >
        <span className="px-4 text-center text-base font-bold tracking-tight text-white/90 sm:text-lg">{name}</span>
      </div>
    );
  }

  return (
    <img
      src={sources[index]}
      alt=""
      className={`${imgClassName} ${className}`}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (index < sources.length - 1) {
          setIndex((i) => i + 1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
