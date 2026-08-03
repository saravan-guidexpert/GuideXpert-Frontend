import { FiActivity, FiClock, FiSearch, FiThermometer, FiTrendingUp } from 'react-icons/fi';

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
        active
          ? 'bg-primary-blue-600 text-white shadow-md'
          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

export default function LeadOverviewHero({
  stats,
  statsLoading,
  searchPhone,
  stage,
  awaitingReply,
  activityDate,
  onSearchChange,
  onFilterChange,
  onRefresh,
  refreshing,
  calendar,
}) {
  const totalLeads = stats?.totalLeads ?? 0;
  const scoredSubtitle =
    stats?.scoredLeads != null && stats?.unscoredLeads != null
      ? `${stats.scoredLeads} scored · ${stats.unscoredLeads} unscored`
      : 'With WhatsApp chat';
  const dateLabel = activityDate || 'All dates';

  return (
    <section className="min-h-[85dvh] pb-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 lg:text-3xl">
            Lead Intelligence
          </h2>
          <p className="mt-1 max-w-xl text-sm text-gray-500">
            Filter WhatsApp leads by activity date, then scroll down to review inbox, chat, and lead
            details.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      <div className="mb-8 grid items-start gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        {calendar}

        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-primary-blue-100 p-2.5">
                <FiSearch className="h-5 w-5 text-primary-blue-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Search Leads</h3>
            </div>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={searchPhone}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by 10-digit phone..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-4 pr-10 text-sm transition-all focus:border-primary-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-blue-200"
              />
              <FiSearch className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
              <svg
                className="h-4 w-4 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Conversation-first inbox · unscored leads included
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
              <Chip
                active={!stage && awaitingReply !== 'true'}
                onClick={() => onFilterChange({ stage: '', awaitingReply: '', minScore: 0 })}
              >
                All
              </Chip>
              <Chip
                active={stage === 'cold'}
                onClick={() => onFilterChange({ stage: 'cold', awaitingReply: '' })}
              >
                <span className="inline-flex items-center gap-1">
                  <FiThermometer className="h-3 w-3" /> Cold
                </span>
              </Chip>
              <Chip
                active={stage === 'warm'}
                onClick={() => onFilterChange({ stage: 'warm', awaitingReply: '' })}
              >
                <span className="inline-flex items-center gap-1">
                  <FiActivity className="h-3 w-3" /> Warm
                </span>
              </Chip>
              <Chip
                active={stage === 'hot'}
                onClick={() => onFilterChange({ stage: 'hot', awaitingReply: '' })}
              >
                <span className="inline-flex items-center gap-1">
                  <FiTrendingUp className="h-3 w-3" /> Hot
                </span>
              </Chip>
              <Chip
                active={awaitingReply === 'true'}
                onClick={() => onFilterChange({ stage: '', awaitingReply: 'true' })}
              >
                <span className="inline-flex items-center gap-1">
                  <FiClock className="h-3 w-3" /> Awaiting
                </span>
              </Chip>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-primary-blue-500 via-primary-blue-600 to-indigo-600 p-5 text-white shadow-lg">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-2.5">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/90">Total Leads</h3>
                <p className="text-xs text-white/70">{dateLabel}</p>
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-5xl font-bold tracking-tight">
                {statsLoading ? '—' : totalLeads.toLocaleString()}
              </span>
              <span className="inline-flex items-center rounded-lg bg-white/20 px-2.5 py-1 text-xs font-medium">
                <svg
                  className="mr-1 h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Live
              </span>
            </div>
            <p className="mt-3 text-xs text-white/80">{scoredSubtitle}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                key: 'cold',
                label: 'Cold',
                value: stats?.coldLeads ?? 0,
                active: stage === 'cold',
                onClick: () => onFilterChange({ stage: 'cold', awaitingReply: '' }),
              },
              {
                key: 'warm',
                label: 'Warm',
                value: stats?.warmLeads ?? 0,
                active: stage === 'warm',
                onClick: () => onFilterChange({ stage: 'warm', awaitingReply: '' }),
              },
              {
                key: 'hot',
                label: 'Hot',
                value: stats?.hotLeads ?? 0,
                active: stage === 'hot',
                onClick: () => onFilterChange({ stage: 'hot', awaitingReply: '' }),
              },
              {
                key: 'awaiting',
                label: 'Awaiting',
                value: stats?.awaitingReplyCount ?? 0,
                active: awaitingReply === 'true',
                onClick: () => onFilterChange({ stage: '', awaitingReply: 'true' }),
              },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                className={`rounded-2xl border p-4 text-left shadow-sm transition-all ${
                  item.active
                    ? 'border-primary-blue-400 bg-primary-blue-50 ring-2 ring-primary-blue-200'
                    : 'border-gray-200 bg-white hover:shadow-md'
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                  {statsLoading ? '—' : Number(item.value).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
