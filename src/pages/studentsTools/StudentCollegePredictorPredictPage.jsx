import { useMemo, useRef, useState, useCallback } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  FiBookOpen,
  FiZap,
  FiBarChart2,
  FiCpu,
  FiAward,
  FiActivity,
  FiTrendingUp,
  FiFileText,
  FiGrid,
  FiArrowLeft,
} from 'react-icons/fi';
import ToolWorkspaceLayout from './components/ToolWorkspaceLayout';
import ToolFactsPreview from './components/ToolFactsPreview';
import CollegePredictorWithLeadGate from '../../components/collegePredictor/CollegePredictorWithLeadGate';
import { getEntranceExamMeta, ENTRANCE_EXAMS } from '../../constants/collegePredictorOptions';
import {
  swBtnGhost,
  swInsightsPanel,
  swSectionSubtitle,
  swSectionTitle,
  swWorkspaceTitle,
} from './components/studentWorkspaceUi';

const EXAM_ICON_MAP = {
  KCET: { Icon: FiCpu, iconClass: 'bg-[#eef2f7] text-[#041e30]' },
  MHT_CET: { Icon: FiActivity, iconClass: 'bg-[#fff4ed] text-[#f27921]' },
  KEAM: { Icon: FiAward, iconClass: 'bg-[#fff8ed] text-[#c45a0c]' },
  AP_EAMCET: { Icon: FiBookOpen, iconClass: 'bg-[#e8f1f8] text-[#0b3a5c]' },
  TS_EAMCET: { Icon: FiFileText, iconClass: 'bg-[#fff8ed] text-[#c45a0c]' },
  TNEA: { Icon: FiTrendingUp, iconClass: 'bg-[#eef2f7] text-[#041e30]' },
  JEE: { Icon: FiZap, iconClass: 'bg-[#fff4ed] text-[#f27921]' },
  WBJEE: { Icon: FiGrid, iconClass: 'bg-[#e8f1f8] text-[#0b3a5c]' },
};

const DEFAULT_ICON = { Icon: FiBarChart2, iconClass: 'bg-[#fff4ed] text-[#f27921]' };
const VALID_EXAMS = new Set(ENTRANCE_EXAMS.map((e) => e.value));

export default function StudentCollegePredictorPredictPage() {
  const { exam: examParam } = useParams();
  const exam = examParam;
  const examMeta = useMemo(() => getEntranceExamMeta(exam), [exam]);
  const { Icon: ExamIcon, iconClass } = EXAM_ICON_MAP[exam] || DEFAULT_ICON;
  const [matchCount, setMatchCount] = useState(null);
  const resultsRef = useRef(null);

  const onMatchCount = useCallback((n) => {
    setMatchCount(typeof n === 'number' ? n : null);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, []);

  if (!exam || !VALID_EXAMS.has(exam) || examMeta?.supported === false) {
    return <Navigate to="/students/college-predictor" replace />;
  }

  const title = examMeta?.predictorPageTitle || `${examMeta?.label || exam} College Predictor`;
  const subtitle =
    examMeta?.predictorPageSubtitle ||
    'Enter your profile, verify your phone with OTP, then see college matches.';

  return (
    <ToolWorkspaceLayout
      title={title}
      subtitle={subtitle}
      compactHero
      howItWorks={[
        'Your rank (or percentile) and category are compared with historical opening and closing ranks.',
        'Optional filters (district, branch, quota) narrow the college pool.',
        'After phone verification, matches are tagged from live cutoff data.',
      ]}
      whatThisToolDoes={[
        `Builds a shortlist of colleges for ${examMeta?.label || exam} where your profile has realistic admission probability.`,
        'Helps separate safer and more ambitious options before counselling rounds.',
      ]}
      inputGuide={[
        'Complete the exam-specific profile fields (rank/percentile, category, and filters).',
        'Verify your mobile with OTP — results unlock only after verification.',
        'Browse matches and load more colleges as needed.',
      ]}
      preview={
        <ToolFactsPreview
          icon={ExamIcon}
          iconClass={iconClass}
          name={examMeta?.label || exam}
          metricLabel="Live predictor"
          metricValue={matchCount != null ? `${matchCount} matches` : 'OTP gated'}
          points={[
            'College shortlist from your rank and category',
            'Results unlock after mobile OTP verification',
          ]}
        />
      }
      insights={
        <section className={swInsightsPanel}>
          <h3 className={swSectionTitle}>Tips</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Verify once per session — load more and re-predict stay unlocked after OTP.</li>
            <li>Try nearby ranks or alternate categories if the first shortlist looks thin.</li>
            <li>Use district and branch filters to focus on locations you can realistically join.</li>
          </ul>
        </section>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className={swWorkspaceTitle}>Your profile</h2>
          <p className={swSectionSubtitle}>
            Fill details, then verify your phone to unlock live college matches.
          </p>
        </div>
        <Link to="/students/college-predictor" className={swBtnGhost}>
          <FiArrowLeft className="mr-1 inline h-4 w-4" aria-hidden />
          All exams
        </Link>
      </div>
      <div ref={resultsRef}>
        <CollegePredictorWithLeadGate onMatchCount={onMatchCount} />
      </div>
    </ToolWorkspaceLayout>
  );
}
