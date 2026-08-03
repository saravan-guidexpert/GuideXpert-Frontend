import { FiActivity, FiClock, FiThermometer, FiTrendingUp, FiUsers } from 'react-icons/fi';
import KpiCard from '../../../components/Admin/KpiCard';
import StatCardSkeleton from '../../../components/UI/CardSkeleton';
import { LI, PANEL_CLASS } from './leadIntelligenceUtils';

function ErrorBanner({ message, onRetry }) {
  return (
    <div
      className={`${PANEL_CLASS} flex items-center justify-between gap-3 border-red-100 bg-red-50 p-3 text-[13px] text-red-800`}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className={`${LI.input} px-3 py-1.5 text-[12px] font-semibold text-red-800`}
      >
        Retry
      </button>
    </div>
  );
}

function ClickableKpiCard({ active, onClick, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left transition-all duration-200 ${
        active
          ? 'rounded-xl ring-2 ring-[#2563EB] ring-offset-1'
          : 'hover:opacity-95'
      }`}
    >
      <KpiCard {...props} compact />
    </button>
  );
}

export default function LeadStatsCards({
  stats,
  loading,
  error,
  onRetry,
  activeStage,
  activeAwaitingReply,
  onFilterChange,
}) {
  if (loading) {
    return (
      <div className="grid h-full grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorBanner message={error} onRetry={onRetry} />;
  }

  const scoredSubtitle =
    stats?.scoredLeads != null && stats?.unscoredLeads != null
      ? `${stats.scoredLeads} scored · ${stats.unscoredLeads} unscored`
      : 'With WhatsApp chat';

  return (
    <div className="grid h-full grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6">
      <ClickableKpiCard
        label="Total Leads"
        value={stats?.totalLeads ?? 0}
        icon={FiUsers}
        accent="hero"
        subtitle={scoredSubtitle}
        active={!activeStage && !activeAwaitingReply}
        onClick={() => onFilterChange?.({ stage: '', awaitingReply: '', minScore: 0 })}
      />
      <ClickableKpiCard
        label="Cold"
        value={stats?.coldLeads ?? 0}
        icon={FiThermometer}
        active={activeStage === 'cold'}
        onClick={() => onFilterChange?.({ stage: 'cold', awaitingReply: '' })}
      />
      <ClickableKpiCard
        label="Warm"
        value={stats?.warmLeads ?? 0}
        icon={FiActivity}
        active={activeStage === 'warm'}
        onClick={() => onFilterChange?.({ stage: 'warm', awaitingReply: '' })}
      />
      <ClickableKpiCard
        label="Hot"
        value={stats?.hotLeads ?? 0}
        icon={FiTrendingUp}
        accent
        active={activeStage === 'hot'}
        onClick={() => onFilterChange?.({ stage: 'hot', awaitingReply: '' })}
      />
      <KpiCard
        label="Avg Score"
        value={stats?.averageScore ?? 0}
        icon={FiTrendingUp}
        subtitle="Scored leads"
        compact
      />
      <ClickableKpiCard
        label="Awaiting Reply"
        value={stats?.awaitingReplyCount ?? 0}
        icon={FiClock}
        subtitle="Student waiting"
        active={activeAwaitingReply === 'true'}
        onClick={() => onFilterChange?.({ stage: '', awaitingReply: 'true' })}
      />
    </div>
  );
}
