import { getRankPredictorExams } from '../../../utils/rankPredictor';
import { ADMISSION_PREDICTOR_TOOLS, FIT_TEST_TOOLS, COMPARE_TOOLS } from '../../../constants/studentWorkspaceTools';
import { TRENDING_COLLEGES } from '../landing/landingPageData';
import { WORKSPACE_IMAGES } from './studentWorkspaceImages';

export const HOME_TAGLINE = 'Guiding Every Choice. Shaping Every Future.';
export const HOME_SUBTITLE =
  'Rank predictors, college shortlists, and fit tests — one workspace for Indian entrance exams.';

export const POPULAR_PREDICTORS = [
  { label: 'JEE Main College Predictor', to: '/students/college-predictor', popular: true },
  { label: 'JEE Main Rank Predictor', to: '/students/rank-predictor/jeemainmarks', popular: true },
  { label: 'Branch Predictor', to: '/students/branch-predictor', popular: false },
  { label: 'AP EAMCET Rank', to: '/students/rank-predictor/apeamcet', popular: false },
];

export const HOME_BANNERS = [
  {
    id: 'rank',
    title: 'Turn marks into an estimated rank',
    subtitle: 'JEE, EAMCET, KCET, MHT CET and more on GuideXpert',
    to: '/students/rank-predictor',
    image: WORKSPACE_IMAGES.bannerRank,
  },
  {
    id: 'college',
    title: 'Shortlist colleges around your rank',
    subtitle: 'Cutoff-aware lists with category and preference filters',
    to: '/students/college-predictor',
    image: WORKSPACE_IMAGES.bannerCollege,
  },
  {
    id: 'niat',
    title: 'Discover NIAT and partner institutes',
    subtitle: 'Tech-focused pathways with industry-aligned programs',
    to: '/students/college-predictor',
    image: WORKSPACE_IMAGES.bannerNiat,
  },
];

/** Fixed right-side hero counselling card */
export const HERO_FEATURE_SLIDES = [
  {
    id: 'iitian-counselling',
    title: 'Free IITian One-on-One Counselling',
    description:
      'Want to join a free IITian one-on-one counselling session? Book your free slot today and get personalised guidance.',
    cta: 'Book free',
    to: '/one-on-one-session',
    accent: 'from-[#1a2744] via-[#2a1f4d] to-[#4a1d6a]',
    badge: 'Free session',
    ctaIcon: 'calendar',
  },
];

/** Animated trust metrics shown in the students hero */
export const HERO_TRUST_STATS = [
  { value: 1000, suffix: '+', label: 'Successfully guided students' },
  { value: 50, suffix: '+', label: 'IITians' },
  { value: 1000, suffix: '+', label: 'Counsellors' },
];

export const WORKSPACE_UPDATES = [
  {
    id: 1,
    tag: 'Updated',
    title: 'JEE Main rank model refreshed for the latest session trends',
    date: 'Jun 2026',
    to: '/students/rank-predictor/jeemainmarks',
  },
  {
    id: 2,
    tag: 'New data',
    title: 'AP & TS EAMCET cutoff sets added for 2026 shortlisting',
    date: 'Jun 2026',
    to: '/students/rank-predictor/apeamcet',
  },
  {
    id: 3,
    title: 'Compare up to four colleges on fees, placements, and campus',
    date: 'May 2026',
    to: '/students/college-comparison',
  },
  {
    id: 4,
    title: 'Course fit test — map interests to engineering and science tracks',
    date: 'May 2026',
    to: '/students/course-fit-test',
  },
  {
    id: 5,
    tag: 'Partner',
    title: 'NIAT programs now discoverable in the college predictor',
    date: 'Apr 2026',
    to: '/students/college-predictor',
  },
];

export const DATA_STATS = [
  { value: '50,000+', label: 'Students on platform' },
  { value: '500+', label: 'Colleges indexed' },
  { value: '40k+', label: 'Cutoff data points' },
  { value: '10+', label: 'Exams supported' },
];

export const SECTION_COPY = {
  updates: {
    title: 'Education updates',
    subtitle: 'Exam news, admission windows, deadlines, and tool refreshes — kept current for every session.',
  },
  guidance: {
    title: 'Guidance & discovery',
    description:
      'Start with short assessments when you are unsure about course or campus fit — then move to predictors with a clearer profile.',
  },
  data: {
    title: 'Colleges & cutoffs',
    description:
      'Browse institutes students shortlist most often, backed by indexed cutoff data across major entrance exams.',
  },
  predictors: {
    title: 'Tools that turn scores into decisions',
    description:
      'Each predictor answers a different admissions question—rank first, then colleges and branches—so you move from uncertainty to a clear plan.',
  },
  moreTools: {
    title: 'Alongside your predictions',
    description: 'Compare colleges, track deadlines, and run fit tests when you need more than a shortlist.',
  },
  outcomes: {
    title: 'Student outcomes',
    description: 'How GuideXpert predictions lined up with the colleges students ultimately joined.',
  },
  helpCta: {
    title: 'Not sure where to begin?',
    description: 'Take a fit test to narrow your options, or open the predictor hub for your exam.',
    cta: 'Open tool hub',
  },
};

export function getTopExamLinks() {
  return getRankPredictorExams().map((exam) => ({
    label: exam.name,
    to: `/students/rank-predictor/${exam.id}`,
  }));
}

export const TOP_COLLEGE_LINKS = TRENDING_COLLEGES.map((c) => ({
  label: c.name,
  to: c.to,
}));

export function getCollegePredictorLinks() {
  return [
    ...ADMISSION_PREDICTOR_TOOLS.map((t) => ({ label: t.title, to: t.to })),
    { label: 'College comparison', to: '/students/college-comparison' },
  ];
}

export function getRankPredictorLinks() {
  return getRankPredictorExams().map((exam) => ({
    label: `${exam.name} rank`,
    to: `/students/rank-predictor/${exam.id}`,
  }));
}

export const OTHER_PRODUCTS = [
  {
    id: 'compare',
    title: 'College compare',
    description: 'Fees, placements, and campus metrics side by side.',
    to: '/students/college-comparison',
    icon: 'compare',
  },
  {
    id: 'fit-course',
    title: 'Course fit test',
    description: 'Match programs to aptitude and interests.',
    to: '/students/course-fit-test',
    icon: 'fit',
  },
  {
    id: 'fit-college',
    title: 'College fit test',
    description: 'Filter campuses by budget, location, and goals.',
    to: '/students/college-fit-test',
    icon: 'fit',
  },
  {
    id: 'deadline',
    title: 'Deadline manager',
    description: 'Keep exam and admission dates in one list.',
    to: '/students/deadline-manager',
    icon: 'calendar',
  },
];

export const EXAM_STRIP_LINKS = [
  ...getRankPredictorExams().slice(0, 8).map((e) => ({ label: e.name, to: `/students/rank-predictor/${e.id}` })),
  { label: 'All exams', to: '/students/rank-predictor', highlight: true },
];

export { FIT_TEST_TOOLS, COMPARE_TOOLS };
