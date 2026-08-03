import { getRankPredictorExams } from '../utils/rankPredictor';

/** Labels and paths match TestsHubPage TEST_CARDS */
export const fitTestNavItems = [
  { label: 'Course Fit Test', to: '/students/course-fit-test' },
  { label: 'College Fit Test', to: '/students/college-fit-test' },
  { label: 'All fit tests', to: '/students/tests' },
];

export const compareCollegesNavItems = [
  { label: 'College comparison', to: '/students/college-comparison' },
];

export const collegePredictorNavItems = [
  { label: 'College Predictor', to: '/students/college-predictor' },
  { label: 'Branch Predictor', to: '/students/branch-predictor' },
  { label: 'Exam Predictor', to: '/students/exam-predictor' },
  { label: 'All predictors', to: '/students/predictors' },
];

export const moreToolsNavItems = [
  { label: 'Deadline Manager', to: '/students/deadline-manager' },
  { label: 'Predictors hub', to: '/students/predictors' },
  { label: 'Tests hub', to: '/students/tests' },
];

/**
 * Rank predictor exam links — same targets as RankPredictorPage exam cards.
 * @returns {{ label: string, to: string }[]}
 */
export function getRankPredictorNavItems() {
  return [
    { label: 'All rank predictors', to: '/students/rank-predictor' },
    ...getRankPredictorExams().map((exam) => ({
      label: exam.name,
      to: `/students/rank-predictor/${exam.id}`,
    })),
  ];
}

function chunkLinks(links, size = 6) {
  const columns = [];
  for (let i = 0; i < links.length; i += size) {
    columns.push(links.slice(i, i + size));
  }
  return columns.length ? columns : [[]];
}

/**
 * Mega-menu panels for the students workspace category bar.
 * Each panel has links shown in columns on the right when hovered in the sidebar.
 */
export function getWorkspaceMegaMenus() {
  const examLinks = getRankPredictorExams().map((exam) => ({
    label: `${exam.name} Rank Predictor`,
    to: `/students/rank-predictor/${exam.id}`,
  }));

  return [
    {
      key: 'rank',
      label: 'Rank Predictors',
      hub: '/students/rank-predictor',
      panels: [
        {
          id: 'exams',
          label: 'Exams',
          columns: chunkLinks(examLinks, 5),
          viewAll: { label: 'View All Rank Predictors', to: '/students/rank-predictor' },
        },
        {
          id: 'popular',
          label: 'Popular',
          columns: [
            [
              { label: 'JEE Main Marks', to: '/students/rank-predictor/jeemainmarks' },
              { label: 'JEE Main Percentile', to: '/students/rank-predictor/jeemainpercentile' },
              { label: 'JEE Advanced', to: '/students/rank-predictor/jeeadvanced' },
              { label: 'AP EAMCET', to: '/students/rank-predictor/apeamcet' },
              { label: 'TS EAMCET', to: '/students/rank-predictor/tseamcet' },
            ],
            [
              { label: 'KCET', to: '/students/rank-predictor/kcet' },
              { label: 'MHT CET', to: '/students/rank-predictor/mhcet' },
              { label: 'KEAM', to: '/students/rank-predictor/keam' },
              { label: 'WBJEE', to: '/students/rank-predictor/wbjee' },
            ],
          ],
          viewAll: { label: 'Browse Exam Hub', to: '/students/rank-predictor' },
        },
        {
          id: 'tools',
          label: 'Related Tools',
          columns: [
            [
              { label: 'College Predictor', to: '/students/college-predictor' },
              { label: 'Branch Predictor', to: '/students/branch-predictor' },
              { label: 'Exam Predictor', to: '/students/exam-predictor' },
              { label: 'Deadline Manager', to: '/students/deadline-manager' },
            ],
          ],
          viewAll: { label: 'All Predictors', to: '/students/predictors' },
        },
      ],
    },
    {
      key: 'college',
      label: 'College Predictors',
      hub: '/students/college-predictor',
      panels: [
        {
          id: 'predictors',
          label: 'Tools & Predictors',
          columns: [
            [
              { label: 'College Predictor', to: '/students/college-predictor' },
              { label: 'Branch Predictor', to: '/students/branch-predictor' },
              { label: 'Exam Predictor', to: '/students/exam-predictor' },
            ],
            [
              { label: 'College Comparison', to: '/students/college-comparison' },
              { label: 'College Fit Test', to: '/students/college-fit-test' },
              { label: 'Predictors Hub', to: '/students/predictors' },
            ],
          ],
          viewAll: { label: 'View All Predictors', to: '/students/predictors' },
        },
        {
          id: 'admissions',
          label: 'College Admissions',
          columns: [
            [
              { label: 'Shortlist Colleges', to: '/students/college-predictor' },
              { label: 'Compare Colleges', to: '/students/college-comparison' },
              { label: 'Track Deadlines', to: '/students/deadline-manager' },
            ],
          ],
          viewAll: { label: 'Open College Predictor', to: '/students/college-predictor' },
        },
        {
          id: 'rank',
          label: 'From Rank',
          columns: chunkLinks(examLinks.slice(0, 8), 4),
          viewAll: { label: 'All Rank Predictors', to: '/students/rank-predictor' },
        },
      ],
    },
    {
      key: 'fit',
      label: 'Fit Tests',
      hub: '/students/tests',
      panels: [
        {
          id: 'tests',
          label: 'Assessments',
          columns: [
            [
              { label: 'Course Fit Test', to: '/students/course-fit-test' },
              { label: 'College Fit Test', to: '/students/college-fit-test' },
            ],
            [{ label: 'All Fit Tests', to: '/students/tests' }],
          ],
          viewAll: { label: 'View All Fit Tests', to: '/students/tests' },
        },
        {
          id: 'next',
          label: 'After Your Test',
          columns: [
            [
              { label: 'Rank Predictors', to: '/students/rank-predictor' },
              { label: 'College Predictor', to: '/students/college-predictor' },
              { label: 'College Comparison', to: '/students/college-comparison' },
            ],
          ],
          viewAll: { label: 'Explore Predictors', to: '/students/predictors' },
        },
      ],
    },
    {
      key: 'compare',
      label: 'Compare',
      hub: '/students/college-comparison',
      panels: [
        {
          id: 'compare',
          label: 'Compare Tools',
          columns: [
            [
              { label: 'College Comparison', to: '/students/college-comparison' },
              { label: 'College Predictor', to: '/students/college-predictor' },
              { label: 'Branch Predictor', to: '/students/branch-predictor' },
            ],
          ],
          viewAll: { label: 'Open Compare Tool', to: '/students/college-comparison' },
        },
        {
          id: 'plan',
          label: 'Planning',
          columns: [
            [
              { label: 'College Fit Test', to: '/students/college-fit-test' },
              { label: 'Deadline Manager', to: '/students/deadline-manager' },
              { label: 'Course Fit Test', to: '/students/course-fit-test' },
            ],
          ],
          viewAll: { label: 'Browse All Tools', to: '/students/predictors' },
        },
      ],
    },
    {
      key: 'deadlines',
      label: 'Deadlines',
      hub: '/students/deadline-manager',
      panels: [
        {
          id: 'manager',
          label: 'Deadline Manager',
          columns: [
            [
              { label: 'Track Exam Deadlines', to: '/students/deadline-manager' },
              { label: 'Admission Dates', to: '/students/deadline-manager' },
            ],
          ],
          viewAll: { label: 'Open Deadline Manager', to: '/students/deadline-manager' },
        },
        {
          id: 'related',
          label: 'Related',
          columns: [
            [
              { label: 'Rank Predictors', to: '/students/rank-predictor' },
              { label: 'College Predictor', to: '/students/college-predictor' },
              { label: 'Predictors Hub', to: '/students/predictors' },
            ],
          ],
          viewAll: { label: 'All Predictors', to: '/students/predictors' },
        },
      ],
    },
    {
      key: 'resources',
      label: 'Resources',
      hub: '/students/resources',
      panels: [
        {
          id: 'browse',
          label: 'Study Resources',
          columns: [
            [
              { label: 'All Resources', to: '/students/resources' },
              { label: 'Guides & PDFs', to: '/students/resources' },
            ],
          ],
          viewAll: { label: 'Browse Resources', to: '/students/resources' },
        },
        {
          id: 'related',
          label: 'Related',
          columns: [
            [
              { label: 'Education Updates', to: '/students/updates' },
              { label: 'GuideXpert Blogs', to: '/blogs' },
              { label: 'Predictors Hub', to: '/students/predictors' },
            ],
          ],
          viewAll: { label: 'View Updates', to: '/students/updates' },
        },
      ],
    },
    {
      key: 'more',
      label: 'More',
      hub: '/students/predictors',
      panels: [
        {
          id: 'hubs',
          label: 'Workspace Hubs',
          columns: [
            [
              { label: 'Predictors Hub', to: '/students/predictors' },
              { label: 'Tests Hub', to: '/students/tests' },
              { label: 'Rank Predictors', to: '/students/rank-predictor' },
            ],
            [
              { label: 'College Predictor', to: '/students/college-predictor' },
              { label: 'Deadline Manager', to: '/students/deadline-manager' },
              { label: 'College Comparison', to: '/students/college-comparison' },
            ],
          ],
          viewAll: { label: 'Go to Predictors Hub', to: '/students/predictors' },
          badge: 'NEW',
        },
        {
          id: 'guides',
          label: 'Articles & Guides',
          columns: [[{ label: 'GuideXpert Blogs', to: '/blogs' }, { label: 'Main Website', to: '/' }]],
          viewAll: { label: 'Read Blogs', to: '/blogs' },
        },
      ],
    },
  ];
}
