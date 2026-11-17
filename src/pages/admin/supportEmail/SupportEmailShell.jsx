import { NavLink, Outlet } from 'react-router-dom';
import { SUPPORT_EMAIL_LAYOUT } from './supportEmailFormat';

const LINKS = [
  ['/admin/support-email', 'Overview', true],
  ['/admin/support-email/tickets', 'Tickets', false],
  ['/admin/support-email/review', 'Review', false],
  ['/admin/support-email/processing', 'Processing', false],
  ['/admin/support-email/health', 'Health', false],
];

export default function SupportEmailShell() {
  return (
    <div className={SUPPORT_EMAIL_LAYOUT.page}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Support email</h1>
          <p className="text-sm text-slate-600">Mailbox processing, tickets, and review. Replies are not sent from this screen.</p>
        </div>
      </header>
      <nav className="flex gap-2 overflow-x-auto" aria-label="Support email sections">
        {LINKS.map(([to, label, end]) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `shrink-0 rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}

export function PanelMessage({ children, tone = 'neutral' }) {
  const toneClass = tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-slate-50 text-slate-600';
  return <p className={`rounded-lg border px-3 py-6 text-center text-sm ${toneClass}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</p>;
}
