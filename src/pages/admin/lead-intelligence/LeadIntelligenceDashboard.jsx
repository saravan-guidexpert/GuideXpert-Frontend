import { useCallback, useState } from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import { useHotLeads } from '../../../hooks/useHotLeads';
import { useLeadList } from '../../../hooks/useLeadList';
import { useLeadStats } from '../../../hooks/useLeadStats';
import HotLeadsTable from './HotLeadsTable';
import LeadDetailPanel from './LeadDetailPanel';
import LeadFilters from './LeadFilters';
import LeadStatsCards from './LeadStatsCards';
import LeadsTable from './LeadsTable';
import { PANEL_CLASS } from './leadIntelligenceUtils';

export default function LeadIntelligenceDashboard() {
  const [selectedPhone, setSelectedPhone] = useState('');
  const { stats, loading: statsLoading, error: statsError, retry: retryStats } = useLeadStats();
  const { items: hotItems, loading: hotLoading, error: hotError, retry: retryHot } = useHotLeads();

  const handleExactPhoneMatch = useCallback((phone) => {
    setSelectedPhone(phone);
  }, []);

  const {
    stage,
    minScore,
    page,
    limit,
    searchPhone,
    awaitingReply,
    items,
    total,
    loading: listLoading,
    error: listError,
    retry: retryList,
    setFilters,
    setPage,
  } = useLeadList({ onExactPhoneMatch: handleExactPhoneMatch });

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-4">
      <header className={`${PANEL_CLASS} bg-gradient-to-br from-white via-white to-slate-50/90 px-5 py-4 sm:px-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-primary-blue-600">
              <FiMessageSquare className="h-4 w-4 shrink-0" aria-hidden />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
                WhatsApp Chatbot
              </p>
            </div>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">
              Chatbot Lead Intelligence
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-600">
              Live scoring, lead type, no-reply timing, and full bot chat history for every WhatsApp
              lead — read-only operations workspace.
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            Read-only intelligence
          </span>
        </div>
      </header>

      <LeadStatsCards
        stats={stats}
        loading={statsLoading}
        error={statsError}
        onRetry={retryStats}
      />

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)]">
        <section className={`${PANEL_CLASS} flex min-h-[28rem] flex-col overflow-hidden xl:min-h-0`}>
          <LeadFilters
            stage={stage}
            minScore={minScore}
            limit={limit}
            searchPhone={searchPhone}
            awaitingReply={awaitingReply}
            onStageChange={(value) => setFilters({ stage: value })}
            onMinScoreChange={(value) => setFilters({ minScore: value })}
            onLimitChange={(value) => setFilters({ limit: value })}
            onSearchChange={(value) => setFilters({ searchPhone: value })}
            onAwaitingReplyChange={(value) => setFilters({ awaitingReply: value })}
          />
          <LeadsTable
            embedded
            items={items}
            total={total}
            page={page}
            limit={limit}
            loading={listLoading}
            error={listError}
            selectedPhone={selectedPhone}
            onRetry={retryList}
            onSelectPhone={setSelectedPhone}
            onPageChange={setPage}
          />
        </section>

        <section
          className={`${PANEL_CLASS} min-h-[32rem] overflow-hidden ${
            selectedPhone ? '' : 'hidden xl:block'
          } ${selectedPhone ? 'fixed inset-0 z-40 rounded-none xl:static xl:z-auto xl:rounded-2xl' : ''}`}
        >
          {selectedPhone ? (
            <LeadDetailPanel
              phone={selectedPhone}
              compact
              onClose={() => setSelectedPhone('')}
            />
          ) : (
            <div className="flex h-full min-h-[32rem] flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-sm font-medium text-slate-700">Select a lead</p>
              <p className="max-w-sm text-xs text-slate-500">
                Open any row to inspect score breakdown, lead type, no-reply time, and the full
                WhatsApp chat with the bot.
              </p>
            </div>
          )}
        </section>
      </div>

      <HotLeadsTable
        items={hotItems}
        loading={hotLoading}
        error={hotError}
        onRetry={retryHot}
        onSelectPhone={setSelectedPhone}
      />
    </div>
  );
}
