import { memo } from 'react';
import { getStageLabel, getStageTone } from './leadIntelligenceUtils';

function LeadStageBadge({ stage }) {
  const label = getStageLabel(stage);
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full border px-2.5 text-[12px] font-medium capitalize ${getStageTone(stage)}`}
    >
      {label}
    </span>
  );
}

export default memo(LeadStageBadge);
