import { useState } from 'react';
import { FiEye, FiEyeOff, FiLock } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { resetFailure } from '../../utils/crmLoginFlow';
import { crmResetPassword } from '../../utils/crmSessionApi';
import CrmAuthFrame, { CrmAuthAlert } from './CrmAuthFrame';

export default function CrmResetPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState('idle');
  const [message, setMessage] = useState(null);
  const busy = phase === 'submitting' || phase === 'success';

  async function onSubmit(event) {
    event.preventDefault();
    if (phase === 'submitting' || phase === 'success') return;
    if (!token.trim() || password.length < 10) {
      setMessage({ tone: 'error', text: 'Enter the reset code and a password of at least 10 characters with a letter and a number.' });
      return;
    }
    setPhase('submitting');
    setMessage(null);
    const result = await crmResetPassword({ token: token.trim(), password });
    if (!result.success) {
      setPhase('idle');
      setMessage({ tone: 'error', text: resetFailure(result) });
      return;
    }
    setPhase('success');
    setMessage({ tone: 'success', text: 'Password updated. You can sign in.' });
  }

  return (
    <CrmAuthFrame title="Reset password" lede="Enter the one-time code from your administrator.">
      <form onSubmit={onSubmit} noValidate aria-busy={phase === 'submitting'}>
        <p className="gx-login-hint">
          <strong>Email delivery is not configured.</strong>
          Ask an administrator for a reset code. It is shown once, expires quickly, and works a single time.
        </p>
        {message ? (
          <CrmAuthAlert tone={message.tone === 'success' ? 'success' : 'error'}>
            {message.text}
          </CrmAuthAlert>
        ) : null}
        <div className="gx-login-field">
          <label htmlFor="crm-reset-code">Reset code</label>
          <div className="gx-login-control">
            <input
              id="crm-reset-code"
              type="text"
              name="token"
              autoComplete="one-time-code"
              autoCapitalize="none"
              spellCheck="false"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              disabled={busy}
            />
          </div>
        </div>
        <div className="gx-login-field">
          <label htmlFor="crm-reset-password">New password</label>
          <div className="gx-login-control has-icon has-toggle">
            <FiLock className="gx-login-leading" aria-hidden="true" />
            <input
              id="crm-reset-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              aria-describedby="crm-reset-password-help"
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
            />
            <button
              type="button"
              className="gx-login-show"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
            </button>
          </div>
          <p id="crm-reset-password-help" className="gx-login-help">At least 10 characters, with a letter and a number.</p>
        </div>
        <button className="gx-login-submit" type="submit" disabled={busy} aria-busy={phase === 'submitting'}>
          {phase === 'submitting' ? <span className="gx-login-spinner" aria-hidden="true" /> : null}
          {phase === 'submitting' ? 'Updating…' : phase === 'success' ? 'Password updated' : 'Update password'}
        </button>
        <p className="gx-login-note">
          <Link to="/crm/login">Back to sign in</Link>
        </p>
      </form>
    </CrmAuthFrame>
  );
}
