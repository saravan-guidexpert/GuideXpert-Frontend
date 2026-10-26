import { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import {
  CRM_ROLE_OPTIONS,
  adminCanManageCrmUsers,
  permissionLabel,
  permissionsForRole,
  userListQuery,
  validateCrmAccountForm,
} from '../../../constants/crmUserAccess';
import {
  activateCrmUser,
  createCrmUser,
  deactivateCrmUser,
  fetchCrmUserAudit,
  fetchCrmUserSummary,
  fetchCrmUsers,
  resetCrmUserPassword,
  updateCrmUser,
} from '../../../utils/crmUserAdminApi';
import { Banner, Pagination, inputClass } from './crmUi';

const LIMIT = 20;
const EMPTY_FORM = {
  fullName: '',
  email: '',
  username: '',
  password: '',
  invite: false,
  role: 'crm_viewer',
  permissions: permissionsForRole('crm_viewer'),
};

function formatWhen(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full max-w-xl overflow-auto rounded-xl bg-white p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[#003366]">{title}</h3>
          <button type="button" className="text-sm text-gray-500" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CrmAccessPage() {
  const { user } = useAuth();
  const allowed = adminCanManageCrmUsers(user);
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [applied, setApplied] = useState(userListQuery({ limit: LIMIT }));
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [editor, setEditor] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [secret, setSecret] = useState(null);
  const [audit, setAudit] = useState(null);

  function load(next = applied) {
    setLoading(true);
    Promise.all([
      fetchCrmUserSummary(),
      fetchCrmUsers(userListQuery({ ...next, limit: LIMIT })),
    ]).then(([summaryResult, listResult]) => {
      setLoading(false);
      if (!summaryResult.success || !listResult.success) {
        setNotice({ tone: 'error', message: listResult.message || summaryResult.message || 'CRM accounts could not be loaded.' });
        return;
      }
      setSummary(summaryResult.data);
      setItems(listResult.data?.items || []);
      setTotal(listResult.data?.total || 0);
      setNotice((current) => (current && current.tone === 'success' ? current : null));
    });
  }

  useEffect(() => {
    if (!allowed) return undefined;
    let cancelled = false;
    Promise.all([
      fetchCrmUserSummary(),
      fetchCrmUsers(userListQuery({ ...applied, limit: LIMIT })),
    ]).then(([summaryResult, listResult]) => {
      if (cancelled) return;
      setLoading(false);
      if (!summaryResult.success || !listResult.success) {
        setNotice({ tone: 'error', message: listResult.message || summaryResult.message || 'CRM accounts could not be loaded.' });
        return;
      }
      setSummary(summaryResult.data);
      setItems(listResult.data?.items || []);
      setTotal(listResult.data?.total || 0);
      setNotice((current) => (current && current.tone === 'success' ? current : null));
    });
    return () => {
      cancelled = true;
    };
  }, [allowed, applied]);

  function openCreate() {
    setErrors({});
    setEditor({ mode: 'create', ...EMPTY_FORM });
  }

  function openEdit(account) {
    setErrors({});
    setEditor({
      mode: 'edit',
      id: account.id,
      fullName: account.fullName,
      email: account.email,
      username: account.username,
      role: account.role,
      permissions: [...account.permissions],
      invite: false,
      password: '',
    });
  }

  function changeRole(nextRole) {
    setEditor((current) => ({ ...current, role: nextRole, permissions: permissionsForRole(nextRole) }));
  }

  function togglePermission(key) {
    setEditor((current) => {
      const has = current.permissions.includes(key);
      return {
        ...current,
        permissions: has ? current.permissions.filter((item) => item !== key) : [...current.permissions, key],
      };
    });
  }

  async function saveEditor(event) {
    event.preventDefault();
    if (!editor || saving) return;
    const fieldErrors = validateCrmAccountForm(editor, editor.mode);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSaving(true);
    const payload = {
      fullName: editor.fullName.trim(),
      email: editor.email.trim(),
      username: editor.username.trim(),
      role: editor.role,
      permissions: editor.permissions,
    };
    const result = editor.mode === 'create'
      ? await createCrmUser({
        ...payload,
        invite: editor.invite,
        password: editor.invite ? undefined : editor.password,
        status: editor.invite ? undefined : 'active',
      })
      : await updateCrmUser(editor.id, payload);
    setSaving(false);
    if (!result.success) {
      setNotice({ tone: 'error', message: result.message });
      return;
    }
    setEditor(null);
    setNotice({ tone: 'success', message: result.message || 'CRM account saved.' });
    if (result.data?.setupToken) {
      setSecret({
        title: 'Setup code',
        text: 'Email delivery is not configured. Copy this one-time code now. It will not be shown again.',
        token: result.data.setupToken,
      });
    }
    setPage(1);
    setApplied((current) => ({ ...current, page: 1 }));
  }

  async function runConfirm() {
    if (!confirm || saving) return;
    setSaving(true);
    const result = confirm.kind === 'deactivate'
      ? await deactivateCrmUser(confirm.account.id, confirm.reason)
      : await activateCrmUser(confirm.account.id, confirm.reason);
    setSaving(false);
    if (!result.success) {
      setNotice({ tone: 'error', message: result.message });
      return;
    }
    setConfirm(null);
    setNotice({ tone: 'success', message: result.message });
    load(applied);
  }

  async function issueReset() {
    if (!confirm || saving) return;
    setSaving(true);
    const body = confirm.mode === 'password' ? { password: confirm.password } : { issueToken: true };
    const result = await resetCrmUserPassword(confirm.account.id, body);
    setSaving(false);
    if (!result.success) {
      setNotice({ tone: 'error', message: result.message });
      return;
    }
    setConfirm(null);
    if (result.data?.resetToken) {
      setSecret({
        title: 'Reset code',
        text: 'Email delivery is not configured. Copy this one-time code now. It expires in 30 minutes and works once.',
        token: result.data.resetToken,
      });
    } else {
      setNotice({ tone: 'success', message: result.message || 'Password updated.' });
    }
  }

  async function openAudit(account) {
    const result = await fetchCrmUserAudit(account.id, { page: 1, limit: 20 });
    if (!result.success) {
      setNotice({ tone: 'error', message: result.message });
      return;
    }
    setAudit({ account, items: result.data?.items || [] });
  }

  if (!allowed) {
    return <Banner tone="warning">CRM access management is limited to super admins and administrators granted that section.</Banner>;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#003366]">CRM Access Management</h2>
          <p className="mt-1 text-sm text-gray-500">Accounts for the production CRM login. These users are not admin-panel users.</p>
        </div>
        <button type="button" className="rounded-lg bg-[#003366] px-4 py-2 text-sm font-medium text-white" onClick={openCreate}>
          Create account
        </button>
      </div>

      {summary ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Total', summary.total],
            ['Active', summary.active],
            ['Inactive', summary.inactive],
            ['Invited', summary.invited],
          ].map(([label, value]) => (
            <article key={label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-[#003366]">{value}</p>
            </article>
          ))}
        </div>
      ) : null}

      {summary ? (
        <div className="mb-5 grid gap-3 lg:grid-cols-2">
          <article className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800">By role</h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {summary.byRole.map((row) => <li key={row.role} className="flex justify-between"><span>{row.label}</span><span>{row.count}</span></li>)}
            </ul>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-800">Recently created</h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {summary.recent.length === 0 ? <li>No accounts yet.</li> : summary.recent.map((row) => (
                <li key={row.id} className="flex justify-between gap-3"><span className="truncate">{row.fullName}</span><span>{formatWhen(row.createdAt)}</span></li>
              ))}
            </ul>
          </article>
        </div>
      ) : null}

      <form
        className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_160px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const next = userListQuery({ q, role, status, page: 1, limit: LIMIT });
          setPage(1);
          setLoading(true);
          setApplied(next);
        }}
      >
        <input className={inputClass} aria-label="Search CRM accounts" placeholder="Search name or email" value={q} onChange={(event) => setQ(event.target.value)} />
        <select className={inputClass} aria-label="Filter by role" value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="">All roles</option>
          {CRM_ROLE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <select className={inputClass} aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="invited">Invited</option>
        </select>
        <button type="submit" className="rounded-lg border border-gray-300 px-4 py-2 text-sm">Search</button>
      </form>

      {notice ? <div className="mb-3"><Banner tone={notice.tone === 'success' ? 'success' : 'error'}>{notice.message} {notice.tone === 'error' ? <button type="button" className="ml-2 underline" onClick={() => load(applied)}>Retry</button> : null}</Banner></div> : null}
      {loading ? <p className="text-sm text-gray-500">Loading accounts…</p> : null}
      {!loading && items.length === 0 ? <p className="text-sm text-gray-500">No CRM accounts match this view.</p> : null}

      {!loading && items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                {['Name', 'Email', 'Role', 'Permissions', 'Status', 'Created', 'Last login', 'Actions'].map((label) => (
                  <th key={label} className="px-3 py-2 font-medium">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((account) => (
                <tr key={account.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-900">{account.fullName}</td>
                  <td className="px-3 py-2">{account.email}</td>
                  <td className="px-3 py-2">{account.roleLabel}</td>
                  <td className="px-3 py-2">{account.permissionSummary}</td>
                  <td className="px-3 py-2 capitalize">{account.status}</td>
                  <td className="px-3 py-2">{formatWhen(account.createdAt)}</td>
                  <td className="px-3 py-2">{formatWhen(account.lastLoginAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="text-[#003366] underline" onClick={() => openEdit(account)}>Edit</button>
                      <button type="button" className="text-[#003366] underline" onClick={() => openAudit(account)}>Activity</button>
                      {account.status === 'active' ? (
                        <button type="button" className="text-red-700 underline" onClick={() => setConfirm({ kind: 'deactivate', account, reason: '' })}>Deactivate</button>
                      ) : (
                        <button type="button" className="text-[#003366] underline" onClick={() => setConfirm({ kind: 'activate', account, reason: '' })}>Activate</button>
                      )}
                      <button type="button" className="text-[#003366] underline" onClick={() => setConfirm({ kind: 'reset', account, mode: 'token', password: '', reason: '' })}>Reset</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {!loading || total > 0 ? (
        <Pagination page={page} limit={LIMIT} total={total} onPage={(next) => { setPage(next); setLoading(true); setApplied((current) => ({ ...current, page: next })); }} />
      ) : null}

      {editor ? (
        <Modal title={editor.mode === 'create' ? 'Create CRM account' : 'Edit CRM account'} onClose={() => setEditor(null)}>
          <form className="space-y-3" onSubmit={saveEditor}>
            <label className="block text-sm"><span className="mb-1 block font-medium">Full name</span><input className={inputClass} value={editor.fullName} aria-invalid={Boolean(errors.fullName)} onChange={(event) => setEditor({ ...editor, fullName: event.target.value })} /></label>
            {errors.fullName ? <p className="text-sm text-red-700">{errors.fullName}</p> : null}
            <label className="block text-sm"><span className="mb-1 block font-medium">Email</span><input className={inputClass} value={editor.email} aria-invalid={Boolean(errors.email)} onChange={(event) => setEditor({ ...editor, email: event.target.value })} /></label>
            {errors.email ? <p className="text-sm text-red-700">{errors.email}</p> : null}
            <label className="block text-sm"><span className="mb-1 block font-medium">Username</span><input className={inputClass} value={editor.username} placeholder="Defaults to the email" onChange={(event) => setEditor({ ...editor, username: event.target.value })} /></label>
            {errors.username ? <p className="text-sm text-red-700">{errors.username}</p> : null}
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Role</span>
              <select className={inputClass} value={editor.role} onChange={(event) => changeRole(event.target.value)}>
                {CRM_ROLE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">Permissions</legend>
              <div className="grid gap-1 sm:grid-cols-2">
                {permissionsForRole(editor.role).map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editor.permissions.includes(key)} onChange={() => togglePermission(key)} />
                    {permissionLabel(key)}
                  </label>
                ))}
              </div>
              {errors.permissions ? <p className="mt-1 text-sm text-red-700">{errors.permissions}</p> : null}
            </fieldset>
            {editor.mode === 'create' ? (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editor.invite} onChange={(event) => setEditor({ ...editor, invite: event.target.checked })} />
                  Issue a one-time setup code instead of a password
                </label>
                {editor.invite ? null : (
                  <label className="block text-sm"><span className="mb-1 block font-medium">Initial password</span><input className={inputClass} type="password" autoComplete="new-password" value={editor.password} onChange={(event) => setEditor({ ...editor, password: event.target.value })} /></label>
                )}
                {errors.password ? <p className="text-sm text-red-700">{errors.password}</p> : null}
              </>
            ) : null}
            <button type="submit" className="rounded-lg bg-[#003366] px-4 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={saving}>
              {saving ? 'Saving…' : editor.mode === 'create' ? 'Create account' : 'Save changes'}
            </button>
          </form>
        </Modal>
      ) : null}

      {confirm ? (
        <Modal title={confirm.kind === 'reset' ? 'Reset password' : confirm.kind === 'deactivate' ? 'Deactivate account' : 'Activate account'} onClose={() => setConfirm(null)}>
          <p className="mb-3 text-sm text-gray-600">{confirm.account.fullName} · {confirm.account.email}</p>
          {confirm.kind === 'reset' ? (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm"><input type="radio" checked={confirm.mode === 'token'} onChange={() => setConfirm({ ...confirm, mode: 'token' })} />Issue a one-time code</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" checked={confirm.mode === 'password'} onChange={() => setConfirm({ ...confirm, mode: 'password' })} />Set a new password</label>
              {confirm.mode === 'password' ? <input className={inputClass} type="password" aria-label="New password" value={confirm.password} onChange={(event) => setConfirm({ ...confirm, password: event.target.value })} /> : null}
              <button type="button" className="rounded-lg bg-[#003366] px-4 py-2 text-sm font-medium text-white" disabled={saving} onClick={issueReset}>
                {saving ? 'Working…' : 'Confirm reset'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm"><span className="mb-1 block font-medium">Reason</span><input className={inputClass} value={confirm.reason} onChange={(event) => setConfirm({ ...confirm, reason: event.target.value })} /></label>
              <button type="button" className="rounded-lg bg-[#003366] px-4 py-2 text-sm font-medium text-white" disabled={saving} onClick={runConfirm}>
                {saving ? 'Working…' : 'Confirm'}
              </button>
            </div>
          )}
        </Modal>
      ) : null}

      {secret ? (
        <Modal title={secret.title} onClose={() => setSecret(null)}>
          <p className="text-sm text-gray-600">{secret.text}</p>
          <p className="mt-3 break-all rounded-lg bg-gray-50 p-3 font-mono text-sm">{secret.token}</p>
        </Modal>
      ) : null}

      {audit ? (
        <Modal title={`Activity · ${audit.account.fullName}`} onClose={() => setAudit(null)}>
          {audit.items.length === 0 ? <p className="text-sm text-gray-500">No activity yet.</p> : (
            <ul className="space-y-2 text-sm">
              {audit.items.map((row) => (
                <li key={row.id} className="rounded-lg border border-gray-100 px-3 py-2">
                  <p className="font-medium">{row.action}</p>
                  <p className="text-gray-500">{formatWhen(row.createdAt)}{row.reason ? ` · ${row.reason}` : ''}</p>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      ) : null}
    </div>
  );
}
