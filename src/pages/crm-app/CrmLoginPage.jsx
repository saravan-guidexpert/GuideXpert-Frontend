import { useState } from 'react';
import { FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { beginLogin, loginButtonState, loginFailure, safeCrmNext } from '../../utils/crmLoginFlow';
import { crmLogin, crmMe, rememberCrmCsrf } from '../../utils/crmSessionApi';
import CrmAuthFrame, { CrmAuthAlert } from './CrmAuthFrame';

export default function CrmLoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [phase, setPhase] = useState('idle');
  const button = loginButtonState(phase);
  const busy = phase === 'submitting' || phase === 'success';

  async function onSubmit(event) {
    event.preventDefault();
    if (phase === 'submitting' || phase === 'success') return;
    const started = beginLogin({ identifier, password });
    setErrors(started.errors);
    if (!started.ok) return;
    setPhase('submitting');
    setFormError(null);
    const result = await crmLogin({
      identifier: identifier.trim(),
      password,
      remember,
    });
    if (!result.success) {
      setPhase('idle');
      setFormError(loginFailure(result));
      return;
    }
    rememberCrmCsrf(result.data?.csrfToken);
    const session = await crmMe();
    if (!session.success) {
      setPhase('idle');
      setFormError({
        kind: 'network',
        message: 'Sign-in could not start a session. Please try again.',
      });
      return;
    }
    rememberCrmCsrf(session.data?.csrfToken);
    setPhase('success');
    navigate(safeCrmNext(params.get('next')), { replace: true });
  }

  return (
    <CrmAuthFrame title="Welcome back" lede="Sign in to continue to your CRM workspace.">
      <form onSubmit={onSubmit} noValidate aria-busy={phase === 'submitting'}>
        {formError ? (
          <CrmAuthAlert tone={formError.kind === 'inactive' ? 'warning' : 'error'}>
            {formError.message}
          </CrmAuthAlert>
        ) : null}
        <div className="gx-login-field">
          <label htmlFor="crm-login-identifier">Email or username</label>
          <div className="gx-login-control has-icon">
            <FiMail className="gx-login-leading" aria-hidden="true" />
            <input
              id="crm-login-identifier"
              type="text"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              value={identifier}
              aria-invalid={errors.identifier ? 'true' : 'false'}
              aria-describedby={errors.identifier ? 'crm-login-identifier-error' : undefined}
              onChange={(event) => setIdentifier(event.target.value)}
              disabled={busy}
            />
          </div>
          {errors.identifier ? <p id="crm-login-identifier-error" className="gx-login-error">{errors.identifier}</p> : null}
        </div>
        <div className="gx-login-field">
          <label htmlFor="crm-login-password">Password</label>
          <div className="gx-login-control has-icon has-toggle">
            <FiLock className="gx-login-leading" aria-hidden="true" />
            <input
              id="crm-login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'crm-login-password-error' : undefined}
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
          {errors.password ? <p id="crm-login-password-error" className="gx-login-error">{errors.password}</p> : null}
        </div>
        <div className="gx-login-row">
          <label className="gx-login-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              disabled={busy}
            />
            <span className="gx-login-box" aria-hidden="true" />
            Remember this browser
          </label>
          <Link className="gx-login-recover" to="/crm/reset">Forgot password?</Link>
        </div>
        <button className="gx-login-submit" type="submit" disabled={button.disabled} aria-busy={phase === 'submitting'}>
          {phase === 'submitting' ? <span className="gx-login-spinner" aria-hidden="true" /> : null}
          {button.label}
        </button>
      </form>
    </CrmAuthFrame>
  );
}
