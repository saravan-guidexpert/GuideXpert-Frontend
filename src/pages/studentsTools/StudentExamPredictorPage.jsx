import { useCallback, useMemo, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import {
  FiTrendingUp,
  FiBookOpen,
  FiZap,
  FiBarChart2,
  FiTarget,
  FiCpu,
  FiAward,
  FiActivity,
  FiFileText,
  FiGrid,
} from 'react-icons/fi';
import ToolWorkspaceLayout from './components/ToolWorkspaceLayout';
import ToolFactsPreview from './components/ToolFactsPreview';
import RankPredictorWithLeadGate from '../../components/rankPredictor/RankPredictorWithLeadGate';
import { getExamConfig } from '../../utils/rankPredictor';
import {
  swInsightsPanel,
  swResultCard,
  swResultsPanel,
  swSectionSubtitle,
  swSectionTitle,
  swFormTitle,
  swFormSubtitle,
} from './components/studentWorkspaceUi';

const EXAM_ICON_MAP = {
  apeamcet: { Icon: FiBookOpen, iconClass: 'bg-sky-50 text-sky-600' },
  jeeadvanced: { Icon: FiZap, iconClass: 'bg-rose-50 text-rose-600' },
  jeemainpercentile: { Icon: FiBarChart2, iconClass: 'bg-emerald-50 text-emerald-600' },
  jeemainmarks: { Icon: FiTarget, iconClass: 'bg-rose-50 text-rose-600' },
  kcet: { Icon: FiCpu, iconClass: 'bg-sky-50 text-sky-600' },
  keam: { Icon: FiAward, iconClass: 'bg-emerald-50 text-emerald-600' },
  mhcet: { Icon: FiActivity, iconClass: 'bg-rose-50 text-rose-600' },
  tnea: { Icon: FiTrendingUp, iconClass: 'bg-sky-50 text-sky-600' },
  tseamcet: { Icon: FiFileText, iconClass: 'bg-emerald-50 text-emerald-600' },
  wbjee: { Icon: FiGrid, iconClass: 'bg-violet-50 text-violet-600' },
};

const DEFAULT_ICON = { Icon: FiBarChart2, iconClass: 'bg-emerald-50 text-emerald-600' };

function formatResultRange(range) {
  if (range == null || range === '') return '\u2014';
  if (typeof range === 'string') return range;
  if (typeof range === 'object' && range.low != null && range.high != null) {
    return `${Number(range.low).toLocaleString()} \u2013 ${Number(range.high).toLocaleString()}`;
  }
  return String(range);
}

export default function StudentExamPredictorPage() {
  const { examId } = useParams();
  const exam = useMemo(() => getExamConfig(examId), [examId]);
  const { Icon: ExamIcon, iconClass } = EXAM_ICON_MAP[examId] || DEFAULT_ICON;

  const [result, setResult] = useState(null);
  const resultsRef = useRef(null);

  const onResultChange = useCallback((next) => {
    setResult(next);
  }, []);

  if (!exam) return <Navigate to="/students/rank-predictor" replace />;

  return (
    <ToolWorkspaceLayout
      title={exam.name}
      subtitle={exam.description}
      compactHero
      howItWorks={[
        'Your marks are mapped against historical cutoff trends for this exam.',
        'The model checks previous rank distributions for similar score bands.',
        'Normalization patterns adjust the estimate to produce a likely rank and percentile range.',
      ]}
      whatThisToolDoes={[
        `Predicts your likely rank or percentile for ${exam.name} based on your score.`,
        'Helps you gauge where you stand before counseling rounds begin.',
      ]}
      inputGuide={[
        `${exam.scoreLabel}: Enter your expected or actual ${exam.scoreLabel.toLowerCase()} (${exam.min} – ${exam.max}).`,
        ...(exam.requiresDifficulty ? ['Difficulty: Select the paper difficulty for more accurate prediction.'] : []),
        'Verify your mobile with OTP so we can save your lead and show your prediction.',
      ]}
      preview={
        <ToolFactsPreview
          icon={ExamIcon}
          iconClass={iconClass}
          name={exam.name}
          metricLabel="Score range"
          metricValue={`${exam.min} – ${exam.max}`}
          points={[
            `Enter ${exam.scoreLabel.toLowerCase()} for a rank or percentile estimate`,
            'OTP verification unlocks and saves your prediction',
          ]}
        />
      }
      results={
        result ? (
          <section ref={resultsRef} tabIndex={-1} className={swResultsPanel}>
            <h2 className={swSectionTitle}>Results</h2>
            {result.message && <p className={swSectionSubtitle}>{result.message}</p>}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className={swResultCard}>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  {result.metricLabel || 'Predicted value'}
                </p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
                  {result.predictedValue != null ? result.predictedValue.toLocaleString() : '\u2014'}
                </p>
              </div>
              {result.range && (
                <div className={swResultCard}>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Range</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                    {formatResultRange(result.range)}
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : null
      }
      insights={
        result ? (
          <section className={swInsightsPanel}>
            <h3 className={swSectionTitle}>Next steps</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>Focus on high-weight topics to improve your score by a few marks.</li>
              <li>Use the College Predictor to shortlist matching institutions for this rank range.</li>
            </ul>
          </section>
        ) : null
      }
    >
      <RankPredictorWithLeadGate
        exam={exam}
        variant="student"
        onResultChange={onResultChange}
        resultsRef={resultsRef}
        headerSlot={(
          <div className="mb-6 flex items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
              <ExamIcon className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            </div>
            <div>
              <h2 className={swFormTitle}>{exam.title || `${exam.name} Predictor`}</h2>
              <p className={swFormSubtitle}>
                Enter your score, verify your phone, then see your prediction.
              </p>
            </div>
          </div>
        )}
      />
    </ToolWorkspaceLayout>
  );
}
