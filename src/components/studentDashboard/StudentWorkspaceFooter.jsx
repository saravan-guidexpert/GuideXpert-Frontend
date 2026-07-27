import { Link } from 'react-router-dom';
import { FiMail } from 'react-icons/fi';

const LOGO_URL =
  'https://res.cloudinary.com/dfqdb1xws/image/upload/v1773394627/GuideXpert_Logo_2_icepsv.png';

const workspaceLinks = [
  { label: 'Dashboard', to: '/' },
  { label: 'Predictors', to: '/students/predictors' },
  { label: 'Fit Tests', to: '/students/tests' },
  { label: 'Compare Colleges', to: '/students/college-comparison' },
];

const siteLinks = [
  { label: 'Become a counsellor', to: '/become-counsellor' },
  { label: 'Blogs', to: '/blogs' },
];

const linkClass =
  'text-sm text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded';

export default function StudentWorkspaceFooter() {
  return (
    <footer role="contentinfo" className="border-t border-slate-800 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          <div className="md:max-w-sm">
            <Link
              to="/"
              className="mb-4 inline-flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
              aria-label="Student workspace home"
            >
              <img src={LOGO_URL} alt="" className="h-7 object-contain brightness-0 invert md:h-8" />
            </Link>
            <p className="text-sm leading-relaxed text-slate-400">
              Predictors and fit tools to plan admissions with clarity. Results are indicative — always confirm with
              official notices and cutoffs.
            </p>
          </div>

          <div>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-slate-500">Workspace</h2>
            <ul className="space-y-2.5" role="list">
              {workspaceLinks.map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className={linkClass}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-slate-500">More</h2>
            <ul className="mb-6 space-y-2.5" role="list">
              {siteLinks.map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className={linkClass}>
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/counsellor/login" className={linkClass}>
                  Counselor login
                </Link>
              </li>
            </ul>
            <div className="rounded-xl bg-slate-800/60 p-4 ring-1 ring-white/5">
              <p className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                <FiMail className="h-3.5 w-3.5" aria-hidden />
                Support
              </p>
              <a
                href="mailto:support@guidexpert.co.in"
                className="text-sm text-white transition hover:text-emerald-300"
              >
                support@guidexpert.co.in
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-slate-800 pt-8 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} GuideXpert. All rights reserved.</p>
          <p className="md:text-right">For planning guidance only — not a substitute for official communications.</p>
        </div>
      </div>
    </footer>
  );
}
