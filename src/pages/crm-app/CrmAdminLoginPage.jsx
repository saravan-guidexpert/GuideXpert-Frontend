import { useEffect, useState } from 'react';
import { FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { adminAccessDecision, beginLogin, loginButtonState } from '../../utils/crmLoginFlow';
import { crmLogin, crmMe, fetchPortalDirectory, rememberCrmCsrf } from '../../utils/crmSessionApi';
import CrmAuthFrame, { CrmAuthAlert } from './CrmAuthFrame';

export default function CrmAdminLoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [denied, setDenied] = useState('');
  const [phase, setPhase] = useState('checking');
  const button = loginButtonState(phase === 'checking' ? 'idle' : phase);
  const busy = phase === 'submitting' || phase === 'success' || phase === 'checking';

  useEffect(() => {
    let cancelled = false;
    crmMe().then(async (session) => {
      if (cancelled) return;
      if (!session.success) {
        setPhase('idle');
        return;
      }
      rememberCrmCsrf(session.data?.csrfToken);
      const access = await fetchPortalDirectory({ page: 1, limit: 1 });
      if (cancelled) return;
      const decision = adminAccessDecision({ sessionResult: session, accessResult: access, next });
      if (decision.action === 'enter') {
        setPhase('success');
        navigate(decision.to, { replace: true });
        return;
      }
      if (decision.action === 'denied') setDenied(decision.message);
      setPhase('idle');
    });
    return () => {
      cancelled = true;
    };
  }, [navigate, next]);

  async function onSubmit(event) {
    event.preventDefault();
    if (phase === 'submitting' || phase === 'success') return;
    const started = beginLogin({ identifier, password });
    setErrors(started.errors);
    if (!started.ok) return;
    setPhase('submitting');
    setFormError(null);
    setDenied('');
    const result = await crmLogin({
      identifier: identifier.trim(),
      password,
      remember,
    });
    const session = result.success ? await crmMe() : null;
    if (session?.success) rememberCrmCsrf(session.data?.csrfToken);
    const access = session?.success ? await fetchPortalDirectory({ page: 1, limit: 1 }) : null;
    const decision = adminAccessDecision({
      loginResult: result,
      sessionResult: session,
      accessResult: access,
      next,
    });
    if (decision.action === 'denied') {
      setPhase('idle');
      setDenied(decision.message);
      return;
    }
    if (decision.action !== 'enter') {
      setPhase('idle');
      setFormError(decision.error);
      return;
    }
    setPhase('success');
    navigate(decision.to, { replace: true });
  }

  return (
    <CrmAuthFrame
      variant="admin"
      title="Super Admin"
      lede="Sign in with a CRM administrator account."
    >
      <form onSubmit={onSubmit} noValidate aria-busy={phase === 'submitting'}>
        {denied ? (
          <CrmAuthAlert tone="warning">
            {denied}{' '}
            <Link to="/crm/app">Continue to the CRM</Link>
          </CrmAuthAlert>
        ) : null}
        {formError ? (
          <CrmAuthAlert tone={formError.kind === 'inactive' ? 'warning' : 'error'}>
            {formError.message}
          </CrmAuthAlert>
        ) : null}
        <div className="gx-login-field">
          <label htmlFor="crm-admin-login-identifier">Email or username</label>
          <div className="gx-login-control has-icon">
            <FiMail className="gx-login-leading" aria-hidden="true" />
            <input
              id="crm-admin-login-identifier"
              type="text"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              value={identifier}
              aria-invalid={errors.identifier ? 'true' : 'false'}
              aria-describedby={errors.identifier ? 'crm-admin-login-identifier-error' : undefined}
              onChange={(event) => setIdentifier(event.target.value)}
              disabled={busy}
            />
          </div>
          {errors.identifier ? <p id="crm-admin-login-identifier-error" className="gx-login-error">{errors.identifier}</p> : null}
        </div>
        <div className="gx-login-field">
          <label htmlFor="crm-admin-login-password">Password</label>
          <div className="gx-login-control has-icon has-toggle">
            <FiLock className="gx-login-leading" aria-hidden="true" />
            <input
              id="crm-admin-login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'crm-admin-login-password-error' : undefined}
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
          {errors.password ? <p id="crm-admin-login-password-error" className="gx-login-error">{errors.password}</p> : null}
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
        <button className="gx-login-submit" type="submit" disabled={button.disabled || phase === 'checking'} aria-busy={phase === 'submitting'}>
          {phase === 'submitting' ? <span className="gx-login-spinner" aria-hidden="true" /> : null}
          {phase === 'checking' ? 'Checking session…' : button.label}
        </button>
      </form>
      <p className="gx-login-note">CRM staff use the <Link to="/crm/login">user sign-in</Link>.</p>
    </CrmAuthFrame>
  );
}
