import { FiSearch, FiSliders } from 'react-icons/fi';

const STAGE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'cold', label: 'Cold' },
  { value: 'warm', label: 'Warm' },
  { value: 'hot', label: 'Hot' },
];

const AWAITING_OPTIONS = [
  { value: '', label: 'All reply states' },
  { value: 'true', label: 'Awaiting reply' },
  { value: 'false', label: 'Already replied' },
];

const LIMIT_OPTIONS = [25, 50, 100];

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 shadow-sm transition focus:border-primary-blue-300 focus:outline-none focus:ring-2 focus:ring-primary-blue-100';

export default function LeadFilters({
  stage,
  minScore,
  limit,
  searchPhone,
  awaitingReply,
  onStageChange,
  onMinScoreChange,
  onLimitChange,
  onSearchChange,
  onAwaitingReplyChange,
}) {
  return (
    <div className="space-y-3 border-b border-slate-200/80 bg-slate-50/60 px-3 py-3">
      <div className="flex items-center gap-2 text-slate-600">
        <FiSliders className="h-3.5 w-3.5" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wide">Filters</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Lead type
          </span>
          <select value={stage} onChange={(e) => onStageChange(e.target.value)} className={inputClass}>
            {STAGE_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            No-reply
          </span>
          <select
            value={awaitingReply || ''}
            onChange={(e) => onAwaitingReplyChange(e.target.value)}
            className={inputClass}
          >
            {AWAITING_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block col-span-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Min score
            </span>
            <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-700">
              {minScore}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={minScore}
            onChange={(e) => onMinScoreChange(Number(e.target.value))}
            className="mt-2 w-full accent-primary-navy"
          />
        </label>

        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Page size
          </span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className={inputClass}
          >
            {LIMIT_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Phone
          </span>
          <div className="relative mt-1">
            <FiSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              inputMode="numeric"
              value={searchPhone}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="10-digit phone"
              className={`${inputClass} mt-0 pl-8`}
            />
          </div>
        </label>
      </div>
    </div>
  );
}
