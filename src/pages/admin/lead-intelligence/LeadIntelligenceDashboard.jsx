import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';
import { useLeadActivity } from '../../../hooks/useLeadActivity';
import { useLeadDetails } from '../../../hooks/useLeadDetails';
import { useLeadList } from '../../../hooks/useLeadList';
import { useLeadStats } from '../../../hooks/useLeadStats';
import { useLeadTranscript } from '../../../hooks/useLeadTranscript';
import LeadActivityCalendar from './LeadActivityCalendar';
import LeadChatHeader from './LeadChatHeader';
import LeadChatTranscript from './LeadChatTranscript';
import LeadDetailPanel from './LeadDetailPanel';
import LeadDetailsSidebar, { LeadDetailsHeader } from './LeadDetailsSidebar';
import LeadFilters, { LeadSearchHeader } from './LeadFilters';
import LeadOverviewHero from './LeadOverviewHero';
import LeadsTable from './LeadsTable';
import { flattenRecentEvents, isValidPhone10, LI } from './leadIntelligenceUtils';

export default function LeadIntelligenceDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPhone, setSelectedPhone] = useState(() => {
    const phone = String(searchParams.get('phone') || '').trim();
    return isValidPhone10(phone) ? phone : '';
  });
  const [refreshing, setRefreshing] = useState(false);

  const { stats, loading: statsLoading, retry: retryStats } = useLeadStats();
  const {
    year: calYear,
    month: calMonth,
    days: activityDays,
    loading: activityLoading,
    goToMonth,
    goToday,
    retry: retryActivity,
  } = useLeadActivity();

  const syncPhoneToUrl = useCallback(
    (phone) => {
      const next = new URLSearchParams(searchParams);
      if (phone && isValidPhone10(phone)) {
        next.set('phone', phone);
      } else {
        next.delete('phone');
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleSelectPhone = useCallback(
    (phone) => {
      const phone10 = String(phone || '').trim();
      if (!isValidPhone10(phone10)) return;
      setSelectedPhone(phone10);
      syncPhoneToUrl(phone10);
    },
    [syncPhoneToUrl]
  );

  const handleExactPhoneMatch = useCallback(
    (phone) => {
      handleSelectPhone(phone);
    },
    [handleSelectPhone]
  );

  const {
    stage,
    minScore,
    page,
    limit,
    searchPhone,
    awaitingReply,
    activityDate,
    items,
    total,
    loading: listLoading,
    error: listError,
    hasActiveFilters,
    retry: retryList,
    setFilters,
    clearFilters,
    setPage,
  } = useLeadList({ onExactPhoneMatch: handleExactPhoneMatch });

  const { details, loading: detailsLoading, error: detailsError, retry: retryDetails } =
    useLeadDetails(selectedPhone);
  const {
    messages,
    loading: transcriptLoading,
    error: transcriptError,
    retry: retryTranscript,
  } = useLeadTranscript(selectedPhone);

  const profile = details?.profile || null;
  const score = details?.score || null;
  const eventRows = useMemo(
    () => flattenRecentEvents(details?.recentEvents || []),
    [details?.recentEvents]
  );
  const displayName = details?.name || profile?.name || 'Unknown lead';

  useEffect(() => {
    const phone = String(searchParams.get('phone') || '').trim();
    if (isValidPhone10(phone) && phone !== selectedPhone) {
      setSelectedPhone(phone);
    }
  }, [searchParams, selectedPhone]);

  const handleCloseDetail = () => {
    setSelectedPhone('');
    syncPhoneToUrl('');
  };

  const handleFilterChange = useCallback(
    (patch) => {
      if (patch.stage !== undefined) setFilters({ stage: patch.stage });
      if (patch.awaitingReply !== undefined) setFilters({ awaitingReply: patch.awaitingReply });
      if (patch.minScore !== undefined) setFilters({ minScore: patch.minScore });
    },
    [setFilters]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([retryStats(), retryActivity(), retryList()]);
    } finally {
      setRefreshing(false);
    }
  }, [retryStats, retryActivity, retryList]);

  return (
    <div>
      <LeadOverviewHero
        stats={stats}
        statsLoading={statsLoading}
        searchPhone={searchPhone}
        stage={stage}
        awaitingReply={awaitingReply}
        activityDate={activityDate}
        onSearchChange={(value) => setFilters({ searchPhone: value })}
        onFilterChange={handleFilterChange}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        calendar={
          <LeadActivityCalendar
            year={calYear}
            month={calMonth}
            days={activityDays}
            selectedDate={activityDate}
            loading={activityLoading}
            onSelectDate={(date) => setFilters({ activityDate: date })}
            onPrevMonth={() => goToMonth(calYear, calMonth - 1)}
            onNextMonth={() => goToMonth(calYear, calMonth + 1)}
            onToday={goToday}
          />
        }
      />

      {/*
        Messaging container:
        - exactly 16px top padding (pt-4)
        - shared header row so Search / Chat / Details share one baseline
        - body fills remaining height (no vertical centering gap)
      */}
      <section className="mb-4 flex h-[85dvh] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white pt-4 shadow-lg">
        <div className="grid shrink-0 grid-cols-1 border-b border-gray-200 xl:grid-cols-[30%_30%_40%]">
          <div className="flex h-14 items-center px-3">
            <LeadSearchHeader
              searchPhone={searchPhone}
              onSearchChange={(value) => setFilters({ searchPhone: value })}
            />
          </div>
          <div className="hidden h-14 items-center border-l border-gray-200 px-3 xl:flex">
            {selectedPhone ? (
              <LeadChatHeader
                bare
                displayName={displayName}
                phone={selectedPhone}
                onClose={handleCloseDetail}
              />
            ) : (
              <p className={`text-[14px] font-semibold ${LI.text}`}>Chat</p>
            )}
          </div>
          <div className="hidden h-14 items-center border-l border-gray-200 px-3 xl:flex">
            {selectedPhone && !detailsLoading && !detailsError ? (
              <LeadDetailsHeader
                phone={selectedPhone}
                details={details}
                score={score}
                profile={profile}
              />
            ) : (
              <p className={`text-[14px] font-semibold ${LI.text}`}>Details</p>
            )}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 content-stretch overflow-hidden xl:grid-cols-[30%_30%_40%]">
          <aside className="flex min-h-0 flex-col overflow-hidden border-r border-gray-200 bg-white">
            <LeadFilters
              stage={stage}
              minScore={minScore}
              limit={limit}
              awaitingReply={awaitingReply}
              hasActiveFilters={hasActiveFilters}
              onStageChange={(value) => setFilters({ stage: value })}
              onMinScoreChange={(value) => setFilters({ minScore: value })}
              onLimitChange={(value) => setFilters({ limit: value })}
              onAwaitingReplyChange={(value) => setFilters({ awaitingReply: value })}
              onClearFilters={clearFilters}
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
              hasActiveFilters={hasActiveFilters}
              onRetry={retryList}
              onSelectPhone={handleSelectPhone}
              onPageChange={setPage}
              onClearFilters={clearFilters}
            />
          </aside>

          <main className="hidden min-h-0 flex-col overflow-hidden border-r border-gray-200 bg-white xl:flex">
            {selectedPhone ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <LeadChatTranscript
                  messages={messages}
                  loading={transcriptLoading}
                  error={transcriptError}
                  onRetry={retryTranscript}
                  contactName={displayName}
                />
              </div>
            ) : (
              <div
                className={`flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center ${LI.bg}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm">
                  <FiMessageSquare className="h-4 w-4" />
                </div>
                <p className="mt-3 text-[14px] font-semibold text-gray-900">Select a conversation</p>
                <p className="mt-1 text-[12px] text-gray-500">Choose a lead to view chat.</p>
              </div>
            )}
          </main>

          <aside className="hidden min-h-0 flex-col overflow-hidden xl:flex">
            {selectedPhone ? (
              <LeadDetailsSidebar
                hideHeader
                phone={selectedPhone}
                details={details}
                score={score}
                profile={profile}
                eventRows={eventRows}
                loading={detailsLoading}
                error={detailsError}
                onRetry={retryDetails}
              />
            ) : (
              <div className={`flex min-h-0 flex-1 items-center justify-center px-6 text-center ${LI.bg}`}>
                <p className="text-[13px] text-gray-500">Lead details appear here</p>
              </div>
            )}
          </aside>
        </div>
      </section>

      {selectedPhone ? (
        <section className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-white pt-14 xl:hidden">
          <LeadDetailPanel phone={selectedPhone} compact onClose={handleCloseDetail} />
        </section>
      ) : null}
    </div>
  );
}
