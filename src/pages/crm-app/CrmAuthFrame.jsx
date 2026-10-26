import { useEffect, useState } from 'react';
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiMoon, FiSun } from 'react-icons/fi';
import { readCrmTheme, revealTheme, writeCrmTheme } from '../crm-demo/crmTheme';
import RippleGrid from './RippleGrid';
import '../crm-demo/crmShell.css';
import './crmLogin.css';

function Mark() {
  return (
    <svg className="gx-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 2.2 13.7 8.6 20.2 9.2 15.2 13.2 16.8 19.6 12 16.2 7.2 19.6 8.8 13.2 3.8 9.2 10.3 8.6Z" />
    </svg>
  );
}

function BrandLockup({ compact = false, label = 'CRM' }) {
  return (
    <div className={compact ? 'gx-login-brand' : 'gx-login-lockup'}>
      <span className="gx-login-mark" aria-hidden="true"><Mark /></span>
      <div>
        <strong>GuideXpert</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

export function CrmAuthAlert({ tone = 'error', children }) {
  const Icon = tone === 'success' ? FiCheckCircle : tone === 'warning' ? FiAlertTriangle : FiAlertCircle;
  return (
    <div className={`gx-login-alert ${tone}`} role={tone === 'success' ? 'status' : 'alert'}>
      <Icon size={16} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export default function CrmAuthFrame({ title, lede, children, variant = 'staff' }) {
  const admin = variant === 'admin';
  const [theme, setTheme] = useState(readCrmTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-crm-theme', theme);
    return () => document.documentElement.removeAttribute('data-crm-theme');
  }, [theme]);

  return (
    <div className={`gx-login${admin ? ' is-admin' : ''}`} data-theme={theme}>
      <aside className="gx-login-stage" aria-label={admin ? 'GuideXpert Super Admin' : 'GuideXpert CRM'}>
        <RippleGrid
          className="gx-login-ripple"
          color="#ffffff"
          cellSize={56}
          lineWidth={1}
          glow={0.35}
          rippleStrength={0.85}
          rippleSpeed={0.75}
          rippleSize={1}
          autoRipple="center"
          rippleInterval={3.2}
          fade={0.62}
          opacity={0.55}
          mouseInteraction
          clickRipple
        />
        <BrandLockup label={admin ? 'Super Admin' : 'CRM'} />
        <div className="gx-login-stage-body">
          {admin ? <p className="gx-login-kicker">Restricted workspace</p> : null}
          <p className="gx-login-display">{admin ? 'Staff access, in one place.' : 'Admissions relationships, managed better.'}</p>
          <p className="gx-login-stage-copy">
            {admin
              ? 'Review presence, assignments, and activity for the CRM team.'
              : 'Manage consultancies, student referrals, and follow-ups in one workspace.'}
          </p>
        </div>
        <div className="gx-login-preview" aria-hidden="true">
          <div className="gx-login-preview-back" />
          <div className="gx-login-preview-card">
            <div className="gx-login-preview-head">
              <span className="gx-login-dot" />
              <span className="gx-login-bar w-md" />
            </div>
            <span className="gx-login-bar w-lg" />
            <span className="gx-login-bar w-sm" />
            <div className="gx-login-preview-chips">
              <span />
              <span />
              <span className="is-accent" />
            </div>
          </div>
        </div>
      </aside>
      <main className="gx-login-panel">
        <div className="gx-login-form">
          <div className="gx-login-top">
            <BrandLockup compact label={admin ? 'Super Admin' : 'CRM'} />
            <button
              type="button"
              className="gx-theme"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const next = theme === 'dark' ? 'light' : 'dark';
                revealTheme(next, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, (value) => {
                  setTheme(value);
                  writeCrmTheme(value);
                });
              }}
            >
              {theme === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />}
            </button>
          </div>
          <h1>{title}</h1>
          {lede ? <p className="gx-login-lede">{lede}</p> : null}
          {children}
        </div>
      </main>
    </div>
  );
}
