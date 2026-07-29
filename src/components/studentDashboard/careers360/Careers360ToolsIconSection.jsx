import { Link } from 'react-router-dom';
import {
  LuSearch,
  LuRocket,
  LuZap,
  LuScale,
  LuGraduationCap,
  LuMapPin,
  LuCalendar,
  LuChartBar,
} from 'react-icons/lu';
import { LAYOUT } from './careers360Theme';
import './studentsSectionMotion.css';

/** Main predictors + companion tools — one compact icon grid on home */
const HOME_TOOLS = [
  {
    id: 'rank',
    title: 'Rank Predictor',
    to: '/students/rank-predictor',
    Icon: LuChartBar,
    tone: 'bg-[#eef2f7] text-[#1e3a5f]',
  },
  {
    id: 'college',
    title: 'College Predictor',
    to: '/students/college-predictor',
    Icon: LuSearch,
    tone: 'bg-[#fff4ed] text-[#f27921]',
  },
  {
    id: 'branch',
    title: 'Branch Predictor',
    to: '/students/branch-predictor',
    Icon: LuRocket,
    tone: 'bg-[#f5f0fa] text-[#2d1b4e]',
  },
  {
    id: 'exam',
    title: 'Exam Predictor',
    to: '/students/exam-predictor',
    Icon: LuZap,
    tone: 'bg-[#fff8ed] text-[#c45a0c]',
  },
  {
    id: 'compare',
    title: 'College Compare',
    to: '/students/college-comparison',
    Icon: LuScale,
    tone: 'bg-[#eef2f7] text-[#1e3a5f]',
  },
  {
    id: 'fit-course',
    title: 'Course Fit Test',
    to: '/students/course-fit-test',
    Icon: LuGraduationCap,
    tone: 'bg-[#fff4ed] text-[#f27921]',
  },
  {
    id: 'fit-college',
    title: 'College Fit Test',
    to: '/students/college-fit-test',
    Icon: LuMapPin,
    tone: 'bg-[#e8f5ef] text-[#15803d]',
  },
  {
    id: 'deadline',
    title: 'Deadline Manager',
    to: '/students/deadline-manager',
    Icon: LuCalendar,
    tone: 'bg-[#f5f0fa] text-[#2d1b4e]',
  },
];

function ToolIconCard({ tool }) {
  const { Icon, title, to, tone } = tool;
  return (
    <Link
      to={to}
      className="group flex flex-col items-center gap-2.5 rounded-2xl border border-[#e8eaed] bg-white px-2.5 py-4 text-center transition hover:-translate-y-0.5 hover:border-[#f27921]/40 hover:shadow-[0_12px_28px_-18px_rgba(242,121,33,0.55)] sm:gap-3 sm:px-3 sm:py-5"
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl transition group-hover:scale-105 sm:h-12 sm:w-12 ${tone}`}
      >
        <Icon className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" aria-hidden />
      </span>
      <span className="line-clamp-2 text-[11px] font-semibold leading-snug text-[#333] transition group-hover:text-[#f27921] sm:text-xs">
        {title}
      </span>
    </Link>
  );
}

/**
 * Single compact home section: predictors + other tools as small icon tiles.
 */
export default function Careers360ToolsIconSection() {
  return (
    <section id="rank-predictors" className="border-b border-[#e8eaed] bg-[#fafbfc] py-8 sm:py-10">
      <div className={LAYOUT.container}>
        <header className="mb-5 max-w-xl sm:mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f27921]">
            Predictors & tools
          </p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-[#1a1a1a] sm:text-2xl">
            Everything you need, in one place
          </h2>
          <p className="mt-1.5 text-sm text-[#667085]">
            Rank, college, branch, compare, fit tests, and deadlines.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-4 xl:grid-cols-8">
          {HOME_TOOLS.map((tool) => (
            <ToolIconCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>
    </section>
  );
}
