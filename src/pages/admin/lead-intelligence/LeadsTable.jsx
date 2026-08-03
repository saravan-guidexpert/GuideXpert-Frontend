import { memo } from 'react';
import { FiChevronLeft, FiChevronRight, FiClock, FiInbox } from 'react-icons/fi';
import TableSkeleton from '../../../components/UI/TableSkeleton';
import LeadStageBadge from './LeadStageBadge';
import {
  formatLeadShortDate,
  formatNoReplyDuration,
  formatPhoneDisplay,
  LI,
} from './leadIntelligenceUtils';

const LeadListItem = memo(function LeadListItem({ row, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(row.phone)}
      className={`flex h-[84px] w-full items-start gap-3 rounded-[10px] border-l-[3px] px-3.5 py-3.5 text-left transition-all duration-200 ${
        selected
          ? 'border-l-[#2563EB] bg-[#EFF6FF]'
          : 'border-l-transparent hover:bg-[#F8FAFC]'
      }`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[15px] font-semibold text-white">
        {(row.name || '?').charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-[16px] font-semibold ${LI.text}`}>
            {row.name || 'Unknown'}
          </span>
          <span className={`shrink-0 text-[13px] tabular-nums ${LI.muted}`}>
            {formatLeadShortDate(row.lastInboundAt || row.lastInteractionAt)}
          </span>
        </div>
        <p className={`mt-1 truncate text-[14px] ${LI.muted}`}>{formatPhoneDisplay(row.phone)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <LeadStageBadge stage={row.leadStage} />
          {row.awaitingReply ? (
            <span className="inline-flex h-6 items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2.5 text-[12px] font-medium text-amber-700">
              <FiClock className="h-3 w-3" />
              {formatNoReplyDuration(row.noReplyMs)}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
});

export default function LeadsTable({
  items,
  total,
  page,
  limit,
  loading,
  error,
  selectedPhone,
  hasActiveFilters,
  onRetry,
  onSelectPhone,
  onPageChange,
  onClearFilters,
  embedded = false,
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

  return (
    <div className={embedded ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : ''}>
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-[#E5E7EB] px-3">
        <h2 className={`text-[13px] font-semibold ${LI.text}`}>
          Inbox <span className={`font-normal ${LI.muted}`}>({total.toLocaleString()})</span>
        </h2>
        <div className="flex h-7 items-center gap-0.5 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-1 text-[12px] text-[#6B7280]">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            className="rounded-md p-1 transition-all duration-200 hover:bg-white disabled:opacity-40"
            aria-label="Previous page"
          >
            <FiChevronLeft />
          </button>
          <span className="min-w-[3rem] text-center tabular-nums">
            {page}/{totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
            className="rounded-md p-1 transition-all duration-200 hover:bg-white disabled:opacity-40"
            aria-label="Next page"
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-4">
          <TableSkeleton rows={8} cols={1} />
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-3 p-4 text-[15px] text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={onRetry}
            className={`${LI.input} px-3 py-1.5 text-[13px] font-semibold text-red-800`}
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F8FAFC] text-[#6B7280]">
            <FiInbox className="h-5 w-5" />
          </div>
          <p className={`text-[15px] font-semibold ${LI.text}`}>No conversations yet</p>
          <p className={`mt-1 text-[13px] ${LI.muted}`}>
            {hasActiveFilters
              ? 'Try clearing filters or search by phone above.'
              : 'Leads appear after WhatsApp bot conversations.'}
          </p>
          {hasActiveFilters && onClearFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className={`${LI.input} mt-3 px-3 py-1.5 text-[13px] font-medium`}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <div
          className={`min-h-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden overscroll-contain px-2 py-2 ${LI.scrollbar}`}
        >
          {items.map((row) => (
            <LeadListItem
              key={row.phone}
              row={row}
              selected={selectedPhone === row.phone}
              onSelect={onSelectPhone}
            />
          ))}
        </div>
      )}
    </div>
  );
}
