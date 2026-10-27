import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiEye,
  FiEyeOff,
  FiKey,
  FiMail,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiSlash,
  FiUserCheck,
  FiUserX,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { useCrmSession } from '../../../crm-app/useCrmSession';
import { permissionLabel, permissionsForRole, userListQuery, validateCrmAccountForm } from '../../../../constants/crmUserAccess';
import {
  activatePortalUser,
  createPortalUser,
  deactivatePortalUser,
  fetchPortalUserAudit,
  fetchPortalUserSummary,
  fetchPortalUsers,
  resetPortalUserPassword,
  updatePortalUser,
} from '../../../../utils/crmSessionApi';
import { Banner, Pagination } from '../crmUi';
import {
  accountActions,
  applyCrmResult,
  applyFilterPatch,
  emptyCopy,
  formatTimestamp,
  grantablePermissions,
  grantableRoles,
  PHASE_A_TIME_ZONE,
  workspaceRouteDecision,
} from '../../../../utils/crmWorkspace';
import { useCrmResource } from './useCrmResource';
import { AccessNote, SkeletonBlock } from './workspaceUi';
import './manageAccess.css';

const INITIAL = { page: 1, limit: 20, q: '', role: '', status: '' };

const ROLE_COPY = {
  crm_administrator: 'Full access, including creating accounts and changing roles.',
  crm_manager: 'Works with students, consultancies and referrals. Cannot manage accounts.',
  crm_viewer: 'Read-only access to CRM records and reports.',
};

const PERMISSION_GROUPS = [
  { label: 'Workspace', areas: ['dashboard', 'analytics', 'calendar', 'audit'] },
  { label: 'Students', areas: ['students'] },
  { label: 'Consultancies', areas: ['consultancies'] },
  { label: 'Referrals', areas: ['referrals'] },
  { label: 'Team & access', areas: ['users', 'roles'] },
];

const STATUS_LABEL = { active: 'Active', inactive: 'Inactive', invited: 'Invited' };

const AUDIT_LABEL = {
  'crm_user.created': 'Account created',
  'crm_user.invited': 'Account created with a setup code',
  'crm_user.updated': 'Account or access updated',
  'crm_user.deactivated': 'Account deactivated',
  'crm_user.reset_issued': 'Reset code issued',
  'crm_user.password_reset': 'Password reset by an administrator',
  'crm_user.reset_requested': 'Password reset requested',
  'crm_user.reset_completed': 'Password reset completed',
  'crm_user.login_succeeded': 'Signed in',
  'crm_user.login_failed': 'Failed sign-in attempt',
  'crm_user.login_inactive': 'Sign-in blocked (inactive account)',
  'crm_user.logout': 'Signed out',
  'crm_session.revoked': 'Session revoked',
  'crm_session.revoked_all': 'All sessions revoked',
};

function areaOf(key) {
  return String(key).split('.')[1] || '';
}

function groupPermissions(keys) {
  return PERMISSION_GROUPS
    .map((group) => ({ ...group, keys: keys.filter((key) => group.areas.includes(areaOf(key))) }))
    .filter((group) => group.keys.length > 0);
}

function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : String(name || '?').slice(0, 2);
  return letters.toUpperCase();
}

function relativeTime(value) {
  if (!value) return 'Never';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'Never';
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium', timeZone: PHASE_A_TIME_ZONE });
}

function auditLabel(action) {
  if (AUDIT_LABEL[action]) return AUDIT_LABEL[action];
  const tail = String(action || '').split('.').pop() || '';
  const text = tail.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Dialog({ title, subtitle, wide, onClose, children, footer }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="gx-modal" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`gx-modal-card gx-acc-dialog${wide ? ' is-wide' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="gx-acc-dialog-head">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="gx-acc-icon-btn" aria-label="Close" onClick={onClose}><FiX size={16} /></button>
        </div>
        <div className="gx-acc-dialog-body">{children}</div>
        {footer ? <div className="gx-acc-dialog-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

function RowMenu({ items }) {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    if (!position) return undefined;
    function close(event) {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'mousedown' && (menuRef.current?.contains(event.target) || buttonRef.current?.contains(event.target))) return;
      setPosition(null);
    }
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [position]);

  function toggle() {
    if (position) {
      setPosition(null);
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const openUp = window.innerHeight - rect.bottom < 200;
    setPosition({
      right: window.innerWidth - rect.right,
      ...(openUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    });
  }

  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;
  return (
    <>
      <button ref={buttonRef} type="button" className="gx-acc-icon-btn" aria-haspopup="menu" aria-expanded={Boolean(position)} aria-label="More actions" onClick={toggle}>
        <FiMoreHorizontal size={16} />
      </button>
      {position ? (
        <div ref={menuRef} role="menu" className="gx-acc-menu" style={position}>
          {visible.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={item.danger ? 'is-danger' : ''}
              onClick={() => {
                setPosition(null);
                item.onClick();
              }}
            >
              <item.icon size={15} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

function StatusPill({ status }) {
  return <span className={`gx-acc-status is-${status}`}><i aria-hidden="true" />{STATUS_LABEL[status] || status}</span>;
}

function AccessChips({ summary }) {
  const parts = String(summary || '').split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return <span className="gx-acc-muted">No access</span>;
  const shown = parts.slice(0, 3);
  const extra = parts.length - shown.length;
  return (
    <span className="gx-acc-chips" title={parts.join(', ')}>
      {shown.map((part) => <span key={part} className="gx-acc-chip">{part}</span>)}
      {extra > 0 ? <span className="gx-acc-chip is-more">+{extra}</span> : null}
    </span>
  );
}

function Stat({ icon, label, value, hint }) {
  const Icon = icon;
  return (
    <article className="gx-acc-stat">
      <span className="gx-acc-stat-icon"><Icon size={16} aria-hidden="true" /></span>
      <div>
        <p>{label}</p>
        <strong>{value ?? '—'}</strong>
        <small>{hint}</small>
      </div>
    </article>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <label className="gx-acc-field">
      <span>{label}</span>
      {children}
      {error ? <em className="is-error">{error}</em> : hint ? <em>{hint}</em> : null}
    </label>
  );
}

export default function ManageAccessPage() {
  const { user } = useCrmSession();
  const decision = workspaceRouteDecision(user, 'access');
  const actions = accountActions(user);
  const roles = grantableRoles(user);
  const defaultRole = roles[roles.length - 1]?.id || 'crm_viewer';
  const [filters, setFilters] = useState(INITIAL);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState(null);
  const [editor, setEditor] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [secret, setSecret] = useState(null);
  const [copied, setCopied] = useState(false);
  const [audit, setAudit] = useState(null);
  const allowed = decision.state === 'allowed';
  const query = useMemo(() => userListQuery(filters), [filters]);
  const summary = useCrmResource(allowed, `summary:${reloadKey}`, () => fetchPortalUserSummary());
  const list = useCrmResource(allowed, `${reloadKey}:${JSON.stringify(query)}`, () => fetchPortalUsers(query), true);

  useEffect(() => {
    if (!notice || notice.tone !== 'success') return undefined;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function reload() {
    setReloadKey((current) => current + 1);
  }

  function update(patch) {
    setFilters((current) => applyFilterPatch(current, patch));
  }

  function openCreate() {
    setErrors({});
    setShowPassword(false);
    setEditor({
      mode: 'create',
      fullName: '',
      email: '',
      username: '',
      password: '',
      invite: false,
      role: defaultRole,
      permissions: grantablePermissions(user, defaultRole),
    });
  }

  function openEdit(account) {
    setErrors({});
    setEditor({
      mode: 'edit',
      id: account.id,
      fullName: account.fullName,
      email: account.email,
      username: account.username,
      password: '',
      invite: false,
      role: account.role,
      permissions: [...(account.permissions || [])],
    });
  }

  function changeRole(role) {
    setEditor((current) => ({ ...current, role, permissions: grantablePermissions(user, role) }));
  }

  function togglePermission(key) {
    setEditor((current) => ({
      ...current,
      permissions: current.permissions.includes(key)
        ? current.permissions.filter((item) => item !== key)
        : [...current.permissions, key],
    }));
  }

  async function saveEditor(event) {
    event?.preventDefault();
    if (!editor || busy) return;
    const fieldErrors = validateCrmAccountForm(editor, editor.mode);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setBusy(true);
    const payload = {
      fullName: editor.fullName.trim(),
      email: editor.email.trim(),
      username: editor.username.trim() || undefined,
      role: editor.role,
      permissions: editor.permissions,
    };
    const result = editor.mode === 'create'
      ? await createPortalUser({
        ...payload,
        invite: editor.invite,
        password: editor.invite ? undefined : editor.password,
        status: editor.invite ? undefined : 'active',
      })
      : await updatePortalUser(editor.id, payload);
    setBusy(false);
    const applied = applyCrmResult(result);
    if (!applied.ok) {
      setErrors({ form: applied.notice.message });
      return;
    }
    const created = editor.mode === 'create';
    setEditor(null);
    setNotice({ tone: 'success', message: result.message || (created ? 'Account created.' : 'Access updated.') });
    if (result.data?.setupToken) {
      setCopied(false);
      setSecret({
        title: 'Share the setup code',
        text: 'Send this one-time code to the user. They enter it on the CRM password reset page to choose their password. It is shown only once.',
        token: result.data.setupToken,
      });
    }
    reload();
  }

  async function runConfirm() {
    if (!confirm || busy) return;
    setBusy(true);
    let result;
    if (confirm.kind === 'reset') {
      const body = confirm.mode === 'password' ? { password: confirm.password } : { issueToken: true };
      result = await resetPortalUserPassword(confirm.account.id, body);
    } else if (confirm.kind === 'deactivate') {
      result = await deactivatePortalUser(confirm.account.id, confirm.reason);
    } else {
      result = await activatePortalUser(confirm.account.id, confirm.reason);
    }
    setBusy(false);
    const applied = applyCrmResult(result);
    if (!applied.ok) {
      setConfirm({ ...confirm, error: applied.notice.message });
      return;
    }
    setConfirm(null);
    if (result.data?.resetToken) {
      setCopied(false);
      setSecret({
        title: 'Share the reset code',
        text: 'Send this one-time code to the user. It expires in 30 minutes and can be used once.',
        token: result.data.resetToken,
      });
    } else {
      setNotice({ tone: 'success', message: result.message || 'Account updated.' });
    }
    reload();
  }

  async function openAudit(account) {
    setAudit({ account, items: null });
    const result = await fetchPortalUserAudit(account.id, { page: 1, limit: 20 });
    const applied = applyCrmResult(result);
    if (!applied.ok) {
      setAudit(null);
      setNotice(applied.notice);
      return;
    }
    setAudit({ account, items: result.data?.items || [] });
  }

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret.token);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (decision.state !== 'allowed') return <AccessNote>{decision.message}</AccessNote>;

  const isSelf = (account) => String(account.id) === String(user?.id);
  const editorGrantable = editor ? new Set(grantablePermissions(user, editor.role)) : new Set();
  const hasFilters = Boolean(filters.q || filters.role || filters.status);
  const items = list.data?.items || [];
  const stats = summary.data;

  return (
    <div className="gx-admin-page gx-access">
      <header className="gx-page-head">
        <div>
          <h2 className="gx-title">Manage Access</h2>
          <p className="gx-subtitle">Create CRM accounts and control what each team member can see and change.</p>
        </div>
        {actions.createAccount ? (
          <button type="button" className="gx-lime gx-acc-primary" onClick={openCreate}>
            <FiPlus size={16} aria-hidden="true" />
            New account
          </button>
        ) : null}
      </header>

      <section className="gx-acc-stats" aria-label="Account summary">
        <Stat icon={FiUsers} label="Total accounts" value={stats?.total} hint="All CRM logins" />
        <Stat icon={FiUserCheck} label="Active" value={stats?.active} hint="Can sign in now" />
        <Stat icon={FiUserX} label="Inactive" value={stats?.inactive} hint="Access removed" />
        <Stat icon={FiMail} label="Invited" value={stats?.invited} hint="Awaiting password setup" />
      </section>

      {notice ? <Banner tone={notice.tone}>{notice.message}</Banner> : null}

      <section className="gx-acc-panel">
        <div className="gx-acc-toolbar">
          <label className="gx-search gx-acc-search">
            <FiSearch size={15} aria-hidden="true" />
            <input value={filters.q} onChange={(event) => update({ q: event.target.value })} aria-label="Search accounts" placeholder="Search by name, email or username" />
          </label>
          <select className="gx-select" aria-label="Filter by role" value={filters.role} onChange={(event) => update({ role: event.target.value })}>
            <option value="">All roles</option>
            <option value="crm_administrator">CRM Administrator</option>
            <option value="crm_manager">CRM Manager</option>
            <option value="crm_viewer">CRM Viewer</option>
          </select>
          <select className="gx-select" aria-label="Filter by status" value={filters.status} onChange={(event) => update({ status: event.target.value })}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="invited">Invited</option>
          </select>
          {hasFilters ? <button type="button" className="gx-acc-link" onClick={() => setFilters(INITIAL)}>Clear filters</button> : null}
          {list.data ? <span className="gx-acc-count">{list.data.total} {list.data.total === 1 ? 'account' : 'accounts'}</span> : null}
        </div>

        {list.notice ? <div className="gx-acc-pad"><Banner tone={list.notice.tone}>{list.notice.message}</Banner></div> : null}
        {list.loading ? <div className="gx-acc-pad"><SkeletonBlock className="h-40" /></div> : null}
        {list.data && items.length === 0 ? (
          <div className="gx-acc-empty">
            <FiUsers size={22} aria-hidden="true" />
            <p>{hasFilters ? emptyCopy('users') : 'No CRM accounts yet.'}</p>
            {!hasFilters && actions.createAccount ? <button type="button" className="gx-btn" onClick={openCreate}>Create the first account</button> : null}
          </div>
        ) : null}
        {list.data && items.length > 0 ? (
          <div className="gx-acc-table-wrap">
            <table className="gx-acc-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Access</th>
                  <th>Status</th>
                  <th>Last sign-in</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="gx-acc-member">
                        <span className="gx-acc-avatar" aria-hidden="true">{initialsOf(row.fullName)}</span>
                        <span className="gx-acc-member-text">
                          <strong>
                            {row.fullName}
                            {isSelf(row) ? <span className="gx-acc-you">You</span> : null}
                          </strong>
                          <small>{row.email}</small>
                        </span>
                      </div>
                    </td>
                    <td><span className={`gx-acc-role is-${row.role}`}>{row.roleLabel || row.role}</span></td>
                    <td><AccessChips summary={row.permissionSummary} /></td>
                    <td><StatusPill status={row.status} /></td>
                    <td>
                      <span className="gx-acc-when" title={formatTimestamp(row.lastLoginAt, PHASE_A_TIME_ZONE)}>{relativeTime(row.lastLoginAt)}</span>
                    </td>
                    <td>
                      <div className="gx-acc-row-actions">
                        {actions.updateAccount ? <button type="button" className="gx-btn" onClick={() => openEdit(row)}>Edit</button> : null}
                        <RowMenu
                          items={[
                            actions.updateAccount && {
                              label: 'Reset password',
                              icon: FiKey,
                              onClick: () => setConfirm({ kind: 'reset', account: row, mode: 'token', password: '' }),
                            },
                            { label: 'View history', icon: FiClock, onClick: () => openAudit(row) },
                            row.status === 'inactive' && actions.updateAccount && {
                              label: 'Activate account',
                              icon: FiCheckCircle,
                              onClick: () => setConfirm({ kind: 'activate', account: row, reason: '' }),
                            },
                            row.status === 'active' && actions.deactivateAccount && !isSelf(row) && {
                              label: 'Deactivate account',
                              icon: FiSlash,
                              danger: true,
                              onClick: () => setConfirm({ kind: 'deactivate', account: row, reason: '' }),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {list.data && list.data.total > filters.limit ? (
          <div className="gx-acc-pad">
            <Pagination page={list.data.page || filters.page} limit={list.data.limit || filters.limit} total={list.data.total} onPage={(page) => update({ page })} />
          </div>
        ) : null}
      </section>

      {editor ? (
        <Dialog
          wide
          title={editor.mode === 'create' ? 'New CRM account' : 'Edit access'}
          subtitle={editor.mode === 'create' ? 'The person signs in at the CRM login page with these details.' : `${editor.fullName} · ${editor.email}`}
          onClose={() => { if (!busy) setEditor(null); }}
          footer={(
            <>
              <button type="button" className="gx-btn" disabled={busy} onClick={() => setEditor(null)}>Cancel</button>
              <button type="submit" form="gx-acc-editor" className="gx-lime" disabled={busy}>
                {busy ? 'Saving…' : editor.mode === 'create' ? 'Create account' : 'Save changes'}
              </button>
            </>
          )}
        >
          <form id="gx-acc-editor" onSubmit={saveEditor} noValidate>
            <section className="gx-acc-section">
              <h4>Profile</h4>
              <div className="gx-acc-grid">
                <Field label="Full name" error={errors.fullName}>
                  <input value={editor.fullName} aria-invalid={Boolean(errors.fullName)} placeholder="e.g. Priya Sharma" onChange={(event) => setEditor({ ...editor, fullName: event.target.value })} />
                </Field>
                <Field label="Work email" error={errors.email}>
                  <input type="email" value={editor.email} aria-invalid={Boolean(errors.email)} placeholder="name@company.com" onChange={(event) => setEditor({ ...editor, email: event.target.value })} />
                </Field>
                <Field label="Username" hint="Optional. Defaults to the email." error={errors.username}>
                  <input value={editor.username} onChange={(event) => setEditor({ ...editor, username: event.target.value })} />
                </Field>
              </div>
            </section>

            <section className="gx-acc-section">
              <h4>Role</h4>
              <div className="gx-acc-roles" role="radiogroup" aria-label="Role">
                {roles.map((option) => (
                  <label key={option.id} className={`gx-acc-role-card${editor.role === option.id ? ' is-on' : ''}`}>
                    <input type="radio" name="role" checked={editor.role === option.id} onChange={() => changeRole(option.id)} />
                    <strong>{option.label}</strong>
                    <small>{ROLE_COPY[option.id]}</small>
                  </label>
                ))}
              </div>
            </section>

            <section className="gx-acc-section">
              <div className="gx-acc-section-head">
                <h4>Permissions</h4>
                <span>{editor.permissions.length} of {permissionsForRole(editor.role).length} selected</span>
              </div>
              <div className="gx-acc-perm-groups">
                {groupPermissions(permissionsForRole(editor.role)).map((group) => (
                  <div key={group.label} className="gx-acc-perm-group">
                    <p>{group.label}</p>
                    {group.keys.map((key) => (
                      <label key={key} className={`gx-acc-check${editorGrantable.has(key) ? '' : ' is-locked'}`} title={editorGrantable.has(key) ? undefined : 'Your account does not hold this permission'}>
                        <input
                          type="checkbox"
                          checked={editor.permissions.includes(key)}
                          disabled={!editorGrantable.has(key)}
                          onChange={() => togglePermission(key)}
                        />
                        {permissionLabel(key)}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
              {errors.permissions ? <p className="gx-acc-error">{errors.permissions}</p> : null}
            </section>

            {editor.mode === 'create' ? (
              <section className="gx-acc-section">
                <h4>Sign-in</h4>
                <div className="gx-acc-segment" role="radiogroup" aria-label="How the user signs in">
                  <label className={editor.invite ? '' : 'is-on'}>
                    <input type="radio" checked={!editor.invite} onChange={() => setEditor({ ...editor, invite: false })} />
                    Set a password
                  </label>
                  <label className={editor.invite ? 'is-on' : ''}>
                    <input type="radio" checked={editor.invite} onChange={() => setEditor({ ...editor, invite: true, password: '' })} />
                    Send a setup code
                  </label>
                </div>
                {editor.invite ? (
                  <p className="gx-acc-muted">A one-time code is shown after you create the account. The user enters it to choose their own password.</p>
                ) : (
                  <Field label="Initial password" hint="At least 10 characters, including a letter and a number." error={errors.password}>
                    <span className="gx-acc-password">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={editor.password}
                        aria-invalid={Boolean(errors.password)}
                        onChange={(event) => setEditor({ ...editor, password: event.target.value })}
                      />
                      <button type="button" className="gx-acc-icon-btn" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
                        {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                      </button>
                    </span>
                  </Field>
                )}
              </section>
            ) : null}
            {errors.form ? <Banner tone="error">{errors.form}</Banner> : null}
          </form>
        </Dialog>
      ) : null}

      {confirm ? (
        <Dialog
          title={confirm.kind === 'reset' ? 'Reset password' : confirm.kind === 'deactivate' ? 'Deactivate account' : 'Activate account'}
          subtitle={`${confirm.account.fullName} · ${confirm.account.email}`}
          onClose={() => { if (!busy) setConfirm(null); }}
          footer={(
            <>
              <button type="button" className="gx-btn" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button>
              <button type="button" className={confirm.kind === 'deactivate' ? 'gx-btn gx-acc-danger' : 'gx-lime'} disabled={busy} onClick={runConfirm}>
                {busy ? 'Working…' : confirm.kind === 'reset' ? 'Reset password' : confirm.kind === 'deactivate' ? 'Deactivate' : 'Activate'}
              </button>
            </>
          )}
        >
          {confirm.kind === 'reset' ? (
            <>
              <div className="gx-acc-segment" role="radiogroup" aria-label="Reset method">
                <label className={confirm.mode === 'token' ? 'is-on' : ''}>
                  <input type="radio" checked={confirm.mode === 'token'} onChange={() => setConfirm({ ...confirm, mode: 'token' })} />
                  Issue a reset code
                </label>
                <label className={confirm.mode === 'password' ? 'is-on' : ''}>
                  <input type="radio" checked={confirm.mode === 'password'} onChange={() => setConfirm({ ...confirm, mode: 'password' })} />
                  Set a new password
                </label>
              </div>
              {confirm.mode === 'password' ? (
                <Field label="New password" hint="At least 10 characters, including a letter and a number.">
                  <input type="password" autoComplete="new-password" value={confirm.password} onChange={(event) => setConfirm({ ...confirm, password: event.target.value })} />
                </Field>
              ) : null}
              <p className="gx-acc-muted">The user is signed out of every device.</p>
            </>
          ) : (
            <>
              <p className="gx-acc-muted">
                {confirm.kind === 'deactivate'
                  ? 'They lose CRM access immediately and are signed out everywhere. You can reactivate the account later.'
                  : 'They can sign in again with their existing password.'}
              </p>
              <Field label="Reason" hint="Recorded in the account history.">
                <input value={confirm.reason} onChange={(event) => setConfirm({ ...confirm, reason: event.target.value })} />
              </Field>
            </>
          )}
          {confirm.error ? <Banner tone="error">{confirm.error}</Banner> : null}
        </Dialog>
      ) : null}

      {secret ? (
        <Dialog
          title={secret.title}
          onClose={() => setSecret(null)}
          footer={<button type="button" className="gx-lime" onClick={() => setSecret(null)}>Done</button>}
        >
          <p className="gx-acc-muted">{secret.text}</p>
          <div className="gx-acc-secret">
            <code>{secret.token}</code>
            <button type="button" className="gx-btn" onClick={copySecret}>
              {copied ? <FiCheckCircle size={14} aria-hidden="true" /> : <FiCopy size={14} aria-hidden="true" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </Dialog>
      ) : null}

      {audit ? (
        <Dialog title="Account history" subtitle={`${audit.account.fullName} · ${audit.account.email}`} onClose={() => setAudit(null)}>
          {audit.items === null ? <SkeletonBlock className="h-24" /> : null}
          {audit.items && audit.items.length === 0 ? <p className="gx-acc-muted">No changes recorded yet.</p> : null}
          {audit.items && audit.items.length > 0 ? (
            <ol className="gx-acc-timeline">
              {audit.items.map((row) => (
                <li key={row.id}>
                  <strong>{auditLabel(row.action)}</strong>
                  <small>{formatTimestamp(row.createdAt, PHASE_A_TIME_ZONE)}{row.reason ? ` · ${row.reason}` : ''}</small>
                </li>
              ))}
            </ol>
          ) : null}
        </Dialog>
      ) : null}
    </div>
  );
}
