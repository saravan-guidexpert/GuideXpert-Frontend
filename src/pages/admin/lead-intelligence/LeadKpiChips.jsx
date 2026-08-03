import { FiActivity, FiClock, FiThermometer, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { LI } from './leadIntelligenceUtils';

const CHIP =
  'inline-flex h-8 items-center gap-1 rounded-[10px] border border-[#E5E7EB] bg-[#F8FAFC] px-2 text-[12px] font-medium text-[#6B7280] transition-all duration-200 hover:bg-white';
const CHIP_ACTIVE = 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]';

export default function LeadKpiChips({
  stats,
  loading,
  activeStage,
  activeAwaitingReply,
  onFilterChange,
}) {
  if (loading) {
    return (
      <div className="flex flex-wrap gap-2 px-4 pb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-16 animate-pulse rounded-[10px] bg-[#F8FAFC]" />
        ))}
      </div>
    );
  }

  const chips = [
    {
      key: 'total',
      label: 'All',
      value: stats?.totalLeads ?? 0,
      icon: FiUsers,
      active: !activeStage && !activeAwaitingReply,
      onClick: () => onFilterChange?.({ stage: '', awaitingReply: '', minScore: 0 }),
    },
    {
      key: 'cold',
      label: 'Cold',
      value: stats?.coldLeads ?? 0,
      icon: FiThermometer,
      active: activeStage === 'cold',
      onClick: () => onFilterChange?.({ stage: 'cold', awaitingReply: '' }),
    },
    {
      key: 'warm',
      label: 'Warm',
      value: stats?.warmLeads ?? 0,
      icon: FiActivity,
      active: activeStage === 'warm',
      onClick: () => onFilterChange?.({ stage: 'warm', awaitingReply: '' }),
    },
    {
      key: 'hot',
      label: 'Hot',
      value: stats?.hotLeads ?? 0,
      icon: FiTrendingUp,
      active: activeStage === 'hot',
      onClick: () => onFilterChange?.({ stage: 'hot', awaitingReply: '' }),
    },
    {
      key: 'awaiting',
      label: 'Waiting',
      value: stats?.awaitingReplyCount ?? 0,
      icon: FiClock,
      active: activeAwaitingReply === 'true',
      onClick: () => onFilterChange?.({ stage: '', awaitingReply: 'true' }),
    },
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-[#E5E7EB] px-4 pb-3">
      {chips.map(({ key, label, value, icon: Icon, active, onClick }) => (
        <button
          key={key}
          type="button"
          onClick={onClick}
          className={`${CHIP} ${active ? CHIP_ACTIVE : ''}`}
        >
          <Icon className="h-3 w-3" />
          <span>{label}</span>
          <span className={`tabular-nums ${LI.text}`}>{value}</span>
        </button>
      ))}
    </div>
  );
}
