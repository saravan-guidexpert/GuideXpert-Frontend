import {
  LuSearch,
  LuRocket,
  LuScale,
  LuGraduationCap,
  LuMapPin,
  LuZap,
  LuCalendar,
} from 'react-icons/lu';
import {
  FiBookOpen,
  FiZap,
  FiBarChart2,
  FiTarget,
  FiCpu,
  FiAward,
  FiActivity,
  FiTrendingUp,
  FiFileText,
  FiGrid,
} from 'react-icons/fi';
import { getRankPredictorExams } from '../utils/rankPredictor';

const RANK_EXAM_ICON_MAP = {
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

const DEFAULT_EXAM_ICON = { Icon: FiBarChart2, iconClass: 'bg-[#fff4ed] text-[#f27921]' };

export const ADMISSION_PREDICTOR_TOOLS = [
  {
    id: 'college-predictor',
    title: 'College Predictor',
    description: 'Shortlist colleges that match your rank, category, and preferences.',
    to: '/students/college-predictor',
    icon: LuSearch,
    iconClass: 'bg-[#fff4ed] text-[#f27921]',
    tags: ['college', 'predictor', 'admission', 'cutoff', 'matches', 'state', 'category'],
  },
  {
    id: 'branch-predictor',
    title: 'Branch Predictor',
    description: 'See which branches you can get at your target institutions.',
    to: '/students/branch-predictor',
    icon: LuRocket,
    iconClass: 'bg-[#eef2f7] text-[#041e30]',
    tags: ['branch', 'predictor', 'academic', 'pathway', 'iit', 'nit', 'seat'],
  },
  {
    id: 'exam-predictor',
    title: 'Exam Predictor',
    description: 'Suggest suitable exams based on your profile and strengths.',
    to: '/students/exam-predictor',
    icon: LuZap,
    iconClass: 'bg-[#fff8ed] text-[#c45a0c]',
    tags: ['exam', 'predictor', 'suitable', 'profile', 'strengths'],
  },
  {
    id: 'deadline-manager',
    title: 'Deadline Manager',
    description: 'Track important exam and admission deadlines at a glance.',
    to: '/students/deadline-manager',
    icon: LuCalendar,
    iconClass: 'bg-[#e8f1f8] text-[#0b3a5c]',
    tags: ['deadline', 'calendar', 'exam', 'admission', 'dates', 'reminder'],
  },
];

export const FIT_TEST_TOOLS = [
  {
    id: 'course-fit',
    title: 'Course Fit Test',
    description: 'Discover courses aligned with your interests and learning style.',
    to: '/students/course-fit-test',
    icon: LuGraduationCap,
    iconClass: 'bg-[#fff4ed] text-[#f27921]',
    tags: ['course', 'fit', 'test', 'career', 'interest', 'subject'],
  },
  {
    id: 'college-fit',
    title: 'College Fit Test',
    description: 'Find campuses that match your lifestyle, budget, and goals.',
    to: '/students/college-fit-test',
    icon: LuMapPin,
    iconClass: 'bg-[#eef2f7] text-[#041e30]',
    tags: ['culture', 'college', 'fit', 'test', 'budget', 'campus', 'fees'],
  },
];

export const COMPARE_TOOLS = [
  {
    id: 'college-comparison',
    title: 'College Comparison',
    description: 'Compare institutions side-by-side on key admission metrics.',
    to: '/students/college-comparison',
    icon: LuScale,
    iconClass: 'bg-[#e8f1f8] text-[#0b3a5c]',
    tags: ['compare', 'comparison', 'college', 'vs', 'metrics'],
  },
];

export function getRankPredictorTools() {
  return getRankPredictorExams().map((exam) => {
    const { Icon, iconClass } = RANK_EXAM_ICON_MAP[exam.id] || DEFAULT_EXAM_ICON;
    return {
      id: `rank-${exam.id}`,
      title: exam.name,
      description: exam.description,
      to: `/students/rank-predictor/${exam.id}`,
      icon: Icon,
      iconClass,
      tags: ['rank', 'predictor', exam.id, exam.name, exam.type, 'exam', 'marks', 'percentile'],
      sectionId: 'rank-predictors',
    };
  });
}

export const WORKSPACE_SECTIONS = [
  {
    id: 'rank-predictors',
    label: 'Rank predictors',
    badge: 'By exam',
    badgeClass: 'bg-sky-50 text-sky-700 ring-sky-100',
    badgeClassDark: 'bg-sky-400/10 text-sky-300 ring-sky-400/20',
    description: 'Estimate your rank or percentile from marks — pick your entrance exam below.',
    getTools: getRankPredictorTools,
    gridClass: 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
    cta: 'Predict rank',
  },
  {
    id: 'admission-predictors',
    label: 'Admission predictors',
    badge: 'Planning tools',
    badgeClass: 'bg-violet-50 text-violet-700 ring-violet-100',
    badgeClassDark: 'bg-violet-400/10 text-violet-300 ring-violet-400/20',
    description: 'Shortlist colleges, branches, exams, and stay on top of admission deadlines.',
    tools: ADMISSION_PREDICTOR_TOOLS,
    gridClass: 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2',
    cta: 'Open tool',
  },
  {
    id: 'fit-tests',
    label: 'Fit tests',
    badge: 'Personality & preference',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    badgeClassDark: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
    description: 'Guided assessments to find courses and campuses that match who you are.',
    tools: FIT_TEST_TOOLS,
    gridClass: 'grid grid-cols-1 gap-5 sm:grid-cols-2',
    cta: 'Take test',
  },
  {
    id: 'compare',
    label: 'Compare',
    badge: 'Side-by-side',
    badgeClass: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    badgeClassDark: 'bg-indigo-400/10 text-indigo-300 ring-indigo-400/20',
    description: 'Evaluate institutions head-to-head before you decide.',
    tools: COMPARE_TOOLS,
    gridClass: 'grid grid-cols-1 gap-5 max-w-md',
    cta: 'Compare now',
  },
];

export function getAllWorkspaceTools() {
  return WORKSPACE_SECTIONS.flatMap((section) => {
    const tools = section.getTools ? section.getTools() : section.tools;
    return tools.map((tool) => ({
      ...tool,
      sectionId: section.id,
      sectionLabel: section.label,
      cta: section.cta,
    }));
  });
}

export const SEARCH_SUGGESTIONS = [
  'JEE Main',
  'AP EAMCET',
  'College Predictor',
  'Branch Predictor',
  'Course Fit Test',
  'College Fit Test',
  'Compare Colleges',
  'Deadline Manager',
];
