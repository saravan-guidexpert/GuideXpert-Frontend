import ConsultancyMetricCard from './ConsultancyMetricCard';
import NeedsAttentionPanel from './NeedsAttentionPanel';
import NextActionCard from './NextActionCard';
import RecentActivityFeed from './RecentActivityFeed';
import ReferralTrendChart from './ReferralTrendChart';
import StudentPipeline from './StudentPipeline';

export default function ConsultancyOverview({
  stacked,
  nextAction,
  saving,
  onSchedule,
  onOpenFollowUp,
  onComplete,
  kpis,
  points,
  rangeLabel,
  rangeInvalid,
  seriesError,
  onRetry,
  rangeControl,
  pipeline,
  linkedTotal,
  onOpenStatus,
  attention,
  attentionError,
  onOpenAttention,
  activity,
  activityTotal,
  activityError,
  now,
  onViewActivity,
}) {
  const chart = (
    <ReferralTrendChart
      points={points}
      rangeLabel={rangeLabel}
      invalid={rangeInvalid}
      error={seriesError}
      onRetry={onRetry}
      rangeControl={rangeControl}
    />
  );
  const pipelineCard = <StudentPipeline rows={pipeline} total={linkedTotal} onOpen={onOpenStatus} />;
  const attentionCard = (
    <NeedsAttentionPanel items={attention} error={attentionError} onRetry={onRetry} onOpen={onOpenAttention} />
  );
  const activityCard = (
    <RecentActivityFeed
      entries={activity}
      total={activityTotal}
      now={now}
      error={activityError}
      onRetry={onRetry}
      onViewAll={onViewActivity}
    />
  );
  return (
    <div className="gx-ov">
      <NextActionCard action={nextAction} saving={saving} onSchedule={onSchedule} onOpen={onOpenFollowUp} onComplete={onComplete} />
      <section className="gx-ov-kpis gx-ov-rise" aria-label="Consultancy metrics">
        {kpis.map((card) => <ConsultancyMetricCard key={card.label} {...card} />)}
      </section>
      {stacked ? (
        <div className="gx-ov-stack">
          {attentionCard}
          {chart}
          {pipelineCard}
          {activityCard}
        </div>
      ) : (
        <div className="gx-ov-grid">
          <div className="gx-ov-main">{chart}{pipelineCard}</div>
          <aside className="gx-ov-side">{attentionCard}{activityCard}</aside>
        </div>
      )}
    </div>
  );
}
