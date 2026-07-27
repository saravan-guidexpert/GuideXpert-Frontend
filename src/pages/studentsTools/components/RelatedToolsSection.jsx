import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LuArrowRight, LuSearch, LuRocket, LuZap, LuScale, LuGraduationCap, LuMapPin, LuCalendar } from 'react-icons/lu';
import { swSectionSubtitle, swSectionTitle } from './studentWorkspaceUi';

/** Static suggestions — avoid module-init side effects from exam helpers. */
const DEFAULT_SUGGESTIONS = [
  {
    title: 'College Predictor',
    description: 'Shortlist colleges that match your rank, category, and preferences.',
    to: '/students/college-predictor',
    icon: LuSearch,
    iconClass: 'bg-[#fff4ed] text-[#f27921]',
  },
  {
    title: 'Branch Predictor',
    description: 'See which branches you can get at your target institutions.',
    to: '/students/branch-predictor',
    icon: LuRocket,
    iconClass: 'bg-[#eef2f7] text-[#041e30]',
  },
  {
    title: 'Exam Predictor',
    description: 'Suggest suitable exams based on your profile and strengths.',
    to: '/students/exam-predictor',
    icon: LuZap,
    iconClass: 'bg-[#fff8ed] text-[#c45a0c]',
  },
  {
    title: 'College Comparison',
    description: 'Compare institutions side-by-side on key admission metrics.',
    to: '/students/college-comparison',
    icon: LuScale,
    iconClass: 'bg-[#e8f1f8] text-[#0b3a5c]',
  },
  {
    title: 'Course Fit Test',
    description: 'Discover courses aligned with your interests and learning style.',
    to: '/students/course-fit-test',
    icon: LuGraduationCap,
    iconClass: 'bg-[#eef2f7] text-[#041e30]',
  },
  {
    title: 'College Fit Test',
    description: 'Find campuses that match your lifestyle, budget, and goals.',
    to: '/students/college-fit-test',
    icon: LuMapPin,
    iconClass: 'bg-[#e8f1f8] text-[#0b3a5c]',
  },
  {
    title: 'Rank Predictors',
    description: 'Estimate rank or percentile from marks for your entrance exam.',
    to: '/students/rank-predictor',
    icon: LuZap,
    iconClass: 'bg-[#fff4ed] text-[#f27921]',
  },
  {
    title: 'Deadline Manager',
    description: 'Track important exam and admission deadlines at a glance.',
    to: '/students/deadline-manager',
    icon: LuCalendar,
    iconClass: 'bg-[#eef2f7] text-[#041e30]',
  },
];

export function getRelatedTools(pathname, { limit = 4, tools } = {}) {
  const pool = Array.isArray(tools) && tools.length > 0 ? tools : DEFAULT_SUGGESTIONS;
  const normalized = String(pathname || '').replace(/\/$/, '') || '/';
  return pool
    .filter((tool) => {
      const dest = String(tool.to || '').replace(/\/$/, '');
      return dest && dest !== normalized;
    })
    .slice(0, limit);
}

export default function RelatedToolsSection({
  title = 'Explore other predictors',
  subtitle = 'Continue planning with these related GuideXpert tools.',
  tools,
  limit = 4,
}) {
  const { pathname } = useLocation();
  const items = useMemo(
    () => getRelatedTools(pathname, { limit, tools }),
    [pathname, limit, tools]
  );

  if (!items.length) return null;

  return (
    <section
      className="sw-fade-up border-t border-[#d5dde8] !py-0 pt-14 sm:pt-16"
      aria-labelledby="related-tools-heading"
    >
      <div className="mb-10 max-w-2xl sm:mb-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f27921]">
          More tools
        </p>
        <h2 id="related-tools-heading" className={`mt-3 ${swSectionTitle}`}>
          {title}
        </h2>
        <p className={`mt-2 ${swSectionSubtitle}`}>{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
        {items.map((tool, index) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.to}
              to={tool.to}
              className="group relative z-10 flex min-h-[12rem] w-full min-w-0 flex-col border border-[#d5dde8] bg-white p-6 transition duration-200 hover:border-[#041e30]/30 hover:bg-[#fbfcfe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f27921]/35 focus-visible:ring-offset-2"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                {Icon ? (
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tool.iconClass || 'bg-[#fff4ed] text-[#f27921]'}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                ) : null}
                <span className="font-sw-display text-sm font-bold tabular-nums text-[#c5ced9]">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="font-sw-display text-base font-bold tracking-tight text-[#041e30]">
                {tool.title}
              </h3>
              <p className="mt-2.5 flex-1 text-sm leading-relaxed text-[#5a6570]">
                {tool.description}
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#041e30] transition duration-200 group-hover:gap-2.5 group-hover:text-[#f27921]">
                Open tool <LuArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
