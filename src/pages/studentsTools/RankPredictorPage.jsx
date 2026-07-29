import { FiBookOpen, FiZap, FiBarChart2, FiTarget, FiCpu, FiAward, FiActivity, FiTrendingUp, FiFileText, FiGrid } from 'react-icons/fi';
import { getRankPredictorExams } from '../../utils/rankPredictor';
import HubPageLayout from './components/HubPageLayout';

/** GuideXpert palette only — navy / orange tones */
const EXAM_ICON_MAP = {
  apeamcet: { Icon: FiBookOpen, iconClass: 'bg-[#eef2f7] text-[#041e30]' },
  jeeadvanced: { Icon: FiZap, iconClass: 'bg-[#fff4ed] text-[#f27921]' },
  jeemainpercentile: { Icon: FiBarChart2, iconClass: 'bg-[#e8f1f8] text-[#0b3a5c]' },
  jeemainmarks: { Icon: FiTarget, iconClass: 'bg-[#fff4ed] text-[#f27921]' },
  kcet: { Icon: FiCpu, iconClass: 'bg-[#eef2f7] text-[#041e30]' },
  keam: { Icon: FiAward, iconClass: 'bg-[#fff8ed] text-[#c45a0c]' },
  mhcet: { Icon: FiActivity, iconClass: 'bg-[#fff4ed] text-[#f27921]' },
  tnea: { Icon: FiTrendingUp, iconClass: 'bg-[#e8f1f8] text-[#0b3a5c]' },
  tseamcet: { Icon: FiFileText, iconClass: 'bg-[#fff8ed] text-[#c45a0c]' },
  wbjee: { Icon: FiGrid, iconClass: 'bg-[#eef2f7] text-[#041e30]' },
};

const DEFAULT_ICON = { Icon: FiBarChart2, iconClass: 'bg-[#fff4ed] text-[#f27921]' };

export default function RankPredictorPage() {
  const cards = getRankPredictorExams().map((exam) => {
    const meta = EXAM_ICON_MAP[exam.id] || DEFAULT_ICON;
    return {
      to: `/students/rank-predictor/${exam.id}`,
      title: exam.name,
      description: exam.description,
      icon: meta.Icon,
      iconClass: meta.iconClass,
      cta: 'Predict now',
    };
  });

  return (
    <HubPageLayout
      eyebrow="Rank predictors"
      title="Choose your exam"
      subtitle="Select an entrance exam to estimate rank from your marks — built on historical score patterns."
      cards={cards}
    />
  );
}
