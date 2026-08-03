import { FiSearch } from 'react-icons/fi';
import { LI } from './leadIntelligenceUtils';

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

const MIN_SCORE_OPTIONS = [
  { value: 0, label: 'Any score' },
  { value: 30, label: '30+' },
  { value: 50, label: '50+' },
  { value: 70, label: '70+' },
];

const LIMIT_OPTIONS = [25, 50, 100];

const selectClass = `${LI.input} h-8 w-full px-2 text-[12px]`;

/** Search field for the shared top header row (no extra vertical padding). */
export function LeadSearchHeader({ searchPhone, onSearchChange }) {
  return (
    <div className="relative w-full">
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
      <input
        type="text"
        inputMode="numeric"
        value={searchPhone}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by 10-digit phone…"
        className={`${LI.input} h-9 w-full bg-[#F8FAFC] pl-9 pr-3 text-[13px]`}
      />
    </div>
  );
}

/** Dropdown filters only — sits under the shared header inside the inbox column. */
export default function LeadFilters({
  stage,
  minScore,
  limit,
  awaitingReply,
  hasActiveFilters,
  onStageChange,
  onMinScoreChange,
  onLimitChange,
  onAwaitingReplyChange,
  onClearFilters,
}) {
  return (
    <div className="grid shrink-0 grid-cols-2 gap-1.5 border-b border-[#E5E7EB] px-3 py-2">
      <select value={stage} onChange={(e) => onStageChange(e.target.value)} className={selectClass}>
        {STAGE_OPTIONS.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        value={awaitingReply || ''}
        onChange={(e) => onAwaitingReplyChange(e.target.value)}
        className={selectClass}
      >
        {AWAITING_OPTIONS.map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        value={minScore}
        onChange={(e) => onMinScoreChange(Number(e.target.value))}
        className={selectClass}
      >
        {MIN_SCORE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        value={limit}
        onChange={(e) => onLimitChange(Number(e.target.value))}
        className={selectClass}
      >
        {LIMIT_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size} / page
          </option>
        ))}
      </select>
      {hasActiveFilters ? (
        <button
          type="button"
          onClick={onClearFilters}
          className={`${selectClass} col-span-2 font-medium text-[#6B7280] hover:bg-[#F8FAFC]`}
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}
