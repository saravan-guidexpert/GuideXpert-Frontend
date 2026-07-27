/** Layout and design tokens for the students homepage */
export const C360 = {
  orange: '#f27921',
  orangeDark: '#e06810',
  orangeLight: '#fff4ed',
  text: '#333333',
  textMuted: '#666666',
  textLight: '#999999',
  border: '#e5e7eb',
  bgPage: '#ffffff',
  bgHero: '#eef2f7',
  bgSection: '#f5f7fa',
  bgSectionAlt: '#ffffff',
  link: '#2563eb',
  live: '#dc2626',
  /** Deep teal/navy tool hero (Career360-style atmosphere) */
  bgToolHero: '#0f4550',
  bgToolHeroFrom: '#1a1240',
  bgToolHeroTo: '#0c3a42',
};

/** Shared layout classes for consistent vertical rhythm */
export const LAYOUT = {
  /* Wider on laptops/desktops so side gutters don’t feel empty */
  container: 'mx-auto w-full max-w-[1280px] px-5 sm:px-6 lg:max-w-[1360px] lg:px-8 xl:max-w-[1440px] xl:px-10',
  section: 'border-b border-[#e8eaed] py-12 sm:py-16',
  sectionCompact: 'border-b border-[#e8eaed] py-10 sm:py-12',
  hubGrid: 'grid gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-14',
  hubSidebar: 'lg:col-span-4',
  hubContent: 'min-w-0 lg:col-span-8',
  card: 'rounded-xl border border-[#e5e7eb] bg-white p-6',
  cardMuted: 'rounded-xl border border-[#e8eaed] bg-[#fafbfc] p-6',
};

export const NAV_CATEGORIES = [
  { label: 'Rank Predictors', to: '/students/rank-predictor' },
  { label: 'College Predictors', to: '/students/college-predictor' },
  { label: 'Fit Tests', to: '/students/tests' },
  { label: 'Compare', to: '/students/college-comparison' },
  { label: 'Deadlines', to: '/students/deadline-manager' },
  { label: 'More', to: '/students/predictors' },
];

export const FOOTER_COLUMNS = [
  {
    title: 'Entrance exams',
    links: [
      { label: 'JEE Main', to: '/students/rank-predictor/jeemainmarks' },
      { label: 'JEE Advanced', to: '/students/rank-predictor/jeeadvanced' },
      { label: 'AP EAMCET', to: '/students/rank-predictor/apeamcet' },
      { label: 'TS EAMCET', to: '/students/rank-predictor/tseamcet' },
      { label: 'KCET', to: '/students/rank-predictor/kcet' },
      { label: 'MHT CET', to: '/students/rank-predictor/mhcet' },
    ],
  },
  {
    title: 'Workspace tools',
    links: [
      { label: 'Rank predictor hub', to: '/students/rank-predictor' },
      { label: 'College predictor', to: '/students/college-predictor' },
      { label: 'Branch predictor', to: '/students/branch-predictor' },
      { label: 'College comparison', to: '/students/college-comparison' },
      { label: 'Deadline manager', to: '/students/deadline-manager' },
    ],
  },
  {
    title: 'Assessments',
    links: [
      { label: 'Course fit test', to: '/students/course-fit-test' },
      { label: 'College fit test', to: '/students/college-fit-test' },
      { label: 'All fit tests', to: '/students/tests' },
    ],
  },
  {
    title: 'GuideXpert',
    links: [
      { label: 'Student home', to: '/' },
      { label: 'Become a counsellor', to: '/become-counsellor' },
      { label: 'Blogs', to: '/blogs' },
      { label: 'Counsellor login', to: '/counsellor/login' },
    ],
  },
];
