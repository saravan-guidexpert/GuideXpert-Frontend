import { memo } from 'react';
import { FiChevronLeft, FiChevronRight, FiClock, FiInbox } from 'react-icons/fi';
import TableSkeleton from '../../../components/UI/TableSkeleton';
import LeadProfileSummary from './LeadProfileSummary';
import LeadStageBadge from './LeadStageBadge';
import { formatLeadDate, formatNoReplyDuration } from './leadIntelligenceUtils';

const LeadRow = memo(function LeadRow({ row, selected, onSelect }) {
  return (
    <tr
      className={`cursor-pointer transition-colors ${
        selected ? 'bg-primary-blue-50/80' : 'hover:bg-slate-50/90'
      }`}
      onClick={() => onSelect(row.phone)}
    >
      <td className="px-3 py-2.5">
        <div className="font-medium text-slate-900">{row.name || 'Unknown'}</div>
        <div className="text-xs tabular-nums text-slate-500">{row.phone || '—'}</div>
      </td>
      <td className="px-3 py-2.5">
        <LeadStageBadge stage={row.leadStage} />
      </td>
      <td className="px-3 py-2.5 tabular-nums font-semibold text-slate-800">
        {row.leadScore ?? '—'}
      </td>
      <td className="px-3 py-2.5">
        {row.awaitingReply ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
            <FiClock className="h-3 w-3" />
            {formatNoReplyDuration(row.noReplyMs)}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="hidden px-3 py-2.5 min-w-[7rem] xl:table-cell">
        <LeadProfileSummary row={row} />
      </td>
      <td className="hidden whitespace-nowrap px-3 py-2.5 text-xs text-slate-600 2xl:table-cell">
        {formatLeadDate(row.lastInboundAt || row.lastInteractionAt)}
      </td>
    </tr>
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
  onRetry,
  onSelectPhone,
  onPageChange,
  embedded = false,
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);

  return (
    <div className={embedded ? 'flex min-h-0 flex-1 flex-col' : ''}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 px-3 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Lead directory</h2>
          <p className="text-[11px] text-slate-500">
            {total.toLocaleString()} matched · click a row for score &amp; chat
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 px-1.5 py-0.5 text-xs text-slate-600">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            className="rounded p-1 transition hover:bg-white disabled:opacity-40"
            aria-label="Previous page"
          >
            <FiChevronLeft />
          </button>
          <span className="min-w-[4.5rem] text-center tabular-nums">
            {page}/{totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
            className="rounded p-1 transition hover:bg-white disabled:opacity-40"
            aria-label="Next page"
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-3">
          <TableSkeleton rows={8} cols={5} />
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-3 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <FiInbox className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium text-slate-700">No leads found</p>
          <p className="mt-1 text-xs text-slate-500">
            Scores appear after chatbot conversations sync to Lead Intelligence.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-[1] border-b border-slate-200/80 bg-slate-50/95 backdrop-blur">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Lead
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Type
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Score
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  No-reply
                </th>
                <th className="hidden px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500 xl:table-cell">
                  Tags
                </th>
                <th className="hidden px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500 2xl:table-cell">
                  Last inbound
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row) => (
                <LeadRow
                  key={row.phone}
                  row={row}
                  selected={selectedPhone === row.phone}
                  onSelect={onSelectPhone}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
