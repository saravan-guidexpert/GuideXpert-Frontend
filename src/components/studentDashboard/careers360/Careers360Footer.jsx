import { Link } from 'react-router-dom';
import { FOOTER_COLUMNS, LAYOUT } from './careers360Theme';

/** White logo used on GuideXpert sidebars (Admin / Webinar / Counsellor). */
const LOGO_URL =
  'https://res.cloudinary.com/dfqdb1xws/image/upload/v1773394005/GuideXpert_Logo_inbaz5.png';

export default function Careers360Footer() {
  return (
    <footer className="border-t border-white/10 bg-sidebar-blue text-white" role="contentinfo">
      <div className={`${LAYOUT.container} py-12 sm:py-14`}>
        <div className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-10 sm:flex-row sm:items-start sm:justify-between">
          <Link to="/" aria-label="GuideXpert student home">
            <img src={LOGO_URL} alt="GuideXpert" className="h-7 object-contain" />
          </Link>
          <p className="max-w-md text-sm leading-relaxed text-white/75">
            GuideXpert helps students plan admissions with predictors, comparisons, and fit assessments. Predictions are
            indicative — always confirm with official exam and college notices.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 text-sm font-bold text-white">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-sm text-white/70 transition hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-8 text-xs text-white/55 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} GuideXpert. All rights reserved.</p>
          <div className="flex gap-5">
            <span>Terms</span>
            <span>Privacy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
