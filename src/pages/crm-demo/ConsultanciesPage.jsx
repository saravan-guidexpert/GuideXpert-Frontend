import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { interpretCrmResult } from '../../utils/crmAccess';
import { FOLLOW_UP_STATUSES, isFollowUpOverdue } from '../../utils/crmDemoStore';
import { Badge, DataTable, Dialog, Notice, PageHeader, SearchField } from './CrmKit';
import { shortDate } from './crmFormat';
import { loadAll } from './dashboard/dashboardModel';
import { useCrmDemo } from './useCrmDemo';

const EMPTY = { name: '', status: 'active', notes: '' };
const QUIET_DAYS = 30;

function messageOf(result) {
  const view = interpretCrmResult(result);
  return { tone: view.state === 'ok' ? 'success' : view.state === 'conflict' ? 'warning' : 'error', message: view.message, state: view.state };
}

function dayKey(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function followTone(status) {
  if (status === 'Interested' || status === 'Call Completed') return 'on';
  if (status === 'Not Interested') return 'off';
  if (status === 'Call Scheduled' || status === 'Follow-up Required') return 'warn';
  if (status === 'On Hold' || status === 'Not Lifted') return 'hold';
  return 'pending';
}

export default function ConsultanciesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { client, demoRole, refresh } = useCrmDemo();
  const superAdmin = demoRole === 'super_admin';
  const search = params.get('q') || '';
  const relationship = params.get('status') === 'active' || params.get('status') === 'inactive' ? params.get('status') : 'all';
  const follow = FOLLOW_UP_STATUSES.includes(params.get('follow') || '') ? params.get('follow') : 'all';
  const owner = params.get('owner') || 'all';
  const creator = params.get('creator') || 'all';
  const dueToday = params.get('due') === 'today';
  const overdueOnly = params.get('overdue') === '1';
  const quietOnly = params.get('quiet') === '1';
  const referralFilter = params.get('referrals') === 'has' || params.get('referrals') === 'none' ? params.get('referrals') : 'all';
  const sort = ['name', 'created', 'last', 'next', 'students'].includes(params.get('sort') || '') ? params.get('sort') : 'name';
  const creating = params.get('new') === '1';
  const [notice, setNotice] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [remarkFor, setRemarkFor] = useState(null);
  const [remarkText, setRemarkText] = useState('');
  const [statusFor, setStatusFor] = useState(null);
  const [statusForm, setStatusForm] = useState({ followUpStatus: 'Pending', scheduledAt: '', outcome: '', notes: '', nextAction: '', reason: '' });

  const consultanciesLoad = loadAll((page) => client.listConsultancies({ page, limit: 100 }));
  const directoryError = consultanciesLoad.ok ? '' : consultanciesLoad.message;
  const visible = consultanciesLoad.items;
  const now = new Date();
  const today = dayKey(now.toISOString());
  const quietCutoff = now.getTime() - QUIET_DAYS * 86400000;

  function replaceParams(mutate) {
    const copy = new URLSearchParams(params);
    mutate(copy);
    setParams(copy, { replace: true });
  }

  function directoryQuery() {
    const copy = new URLSearchParams(params);
    copy.delete('new');
    const searchText = copy.toString();
    return searchText ? `?${searchText}` : '';
  }

  const needle = search.trim().toLowerCase();
  const digits = needle.replace(/\D/g, '');
  const rows = visible.filter((row) => {
    if (relationship !== 'all' && row.status !== relationship) return false;
    if (follow !== 'all' && row.followUpStatus !== follow) return false;
    if (superAdmin && owner !== 'all' && row.ownerId !== owner) return false;
    if (superAdmin && creator !== 'all' && row.createdById !== creator) return false;
    if (dueToday && dayKey(row.nextFollowUpAt) !== today) return false;
    if (overdueOnly && !isFollowUpOverdue(row, now)) return false;
    if (quietOnly) {
      const last = row.lastContactAt ? new Date(row.lastContactAt).getTime() : 0;
      if (last && last >= quietCutoff) return false;
    }
    if (referralFilter === 'has' && !(row.originalStudentCount > 0)) return false;
    if (referralFilter === 'none' && row.originalStudentCount > 0) return false;
    if (!needle) return true;
    const contact = row.primaryContact || {};
    const hay = `${row.name || ''} ${contact.name || ''} ${contact.email || ''}`.toLowerCase();
    if (hay.includes(needle)) return true;
    return Boolean(digits) && String(contact.phone || '').includes(digits);
  }).sort((a, b) => {
    if (sort === 'created') return String(b.createdAt).localeCompare(String(a.createdAt));
    if (sort === 'last') return String(b.lastContactAt || '').localeCompare(String(a.lastContactAt || ''));
    if (sort === 'next') return String(a.nextFollowUpAt || '9999').localeCompare(String(b.nextFollowUpAt || '9999'));
    if (sort === 'students') return (b.originalStudentCount || 0) - (a.originalStudentCount || 0) || String(a.name).localeCompare(String(b.name));
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const metrics = [
    { label: 'Visible consultancies', value: rows.length, hint: superAdmin ? 'Matching the current filters' : 'Owned by Demo staff, matching the current filters' },
    { label: 'Active', value: rows.filter((row) => row.status === 'active').length, hint: 'Relationship is active' },
    { label: 'Due today', value: rows.filter((row) => dayKey(row.nextFollowUpAt) === today).length, hint: 'Next follow-up is today' },
    { label: 'Overdue', value: rows.filter((row) => isFollowUpOverdue(row, now)).length, hint: 'Scheduled or required, and past' },
    { label: 'Students referred', value: rows.reduce((sum, row) => sum + (row.originalStudentCount || 0), 0), hint: 'Original referral source' },
  ];

  const owners = [...new Map(visible.map((row) => [row.ownerId, row.ownerName])).entries()];
  const creators = [...new Map(visible.map((row) => [row.createdById, row.createdByName])).entries()];
  const chips = [
    relationship !== 'all' ? ['status', relationship === 'active' ? 'Active' : 'Inactive'] : null,
    follow !== 'all' ? ['follow', follow] : null,
    superAdmin && owner !== 'all' ? ['owner', `Owner ${owners.find(([id]) => id === owner)?.[1] || owner}`] : null,
    superAdmin && creator !== 'all' ? ['creator', `Creator ${creators.find(([id]) => id === creator)?.[1] || creator}`] : null,
    dueToday ? ['due', 'Due today'] : null,
    overdueOnly ? ['overdue', 'Overdue'] : null,
    quietOnly ? ['quiet', 'No recent contact'] : null,
    referralFilter !== 'all' ? ['referrals', referralFilter === 'has' ? 'Has referrals' : 'No referrals'] : null,
    search ? ['q', `Search “${search}”`] : null,
  ].filter(Boolean);

  function clearChip(key) {
    replaceParams((copy) => {
      if (key === 'status' || key === 'follow' || key === 'owner' || key === 'creator' || key === 'due' || key === 'overdue' || key === 'quiet' || key === 'referrals' || key === 'q') copy.delete(key);
    });
  }

  function resetFilters() {
    replaceParams((copy) => {
      ['q', 'status', 'follow', 'owner', 'creator', 'due', 'overdue', 'quiet', 'referrals', 'sort'].forEach((key) => copy.delete(key));
    });
  }

  async function onCreate(event) {
    event.preventDefault();
    setSaving(true);
    const result = await Promise.resolve(client.createConsultancy(form));
    setSaving(false);
    const view = messageOf(result);
    setNotice(view);
    if (view.state === 'ok') {
      setForm(EMPTY);
      replaceParams((copy) => copy.delete('new'));
      refresh();
      navigate({ pathname: `/crm/consultancies/${result.data.consultancy.id}`, search: directoryQuery() });
    }
  }

  async function onRemark(event) {
    event.preventDefault();
    setSaving(true);
    const result = await Promise.resolve(client.addRemark(remarkFor.id, { text: remarkText }));
    setSaving(false);
    const view = messageOf(result);
    setNotice(view);
    if (view.state === 'ok') {
      setRemarkFor(null);
      setRemarkText('');
      refresh();
    }
  }

  async function onStatus(event) {
    event.preventDefault();
    setSaving(true);
    const body = {
      followUpStatus: statusForm.followUpStatus,
      notes: statusForm.notes,
      outcome: statusForm.outcome,
      nextAction: statusForm.nextAction,
      reason: statusForm.reason,
      scheduledAt: statusForm.scheduledAt ? new Date(statusForm.scheduledAt).toISOString() : undefined,
    };
    const result = await Promise.resolve(client.setFollowUp(statusFor.id, body));
    setSaving(false);
    const view = messageOf(result);
    setNotice(view);
    if (view.state === 'ok') {
      setStatusFor(null);
      refresh();
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'Consultancy',
      render: (row) => (
        <span>
          <span className="gx-strong">{row.name}</span>
          <span className="gx-sub">{row.primaryContact?.name || 'No primary contact'}</span>
        </span>
      ),
    },
    {
      key: 'owner',
      label: superAdmin ? 'Creator / owner' : 'Owner',
      render: (row) => (superAdmin ? `${row.createdByName} / ${row.ownerName}` : row.ownerName),
    },
    {
      key: 'follow',
      label: 'Follow-up',
      render: (row) => (
        <span className="gx-status-stack">
          <Badge tone={followTone(row.followUpStatus)}>{row.followUpStatus}</Badge>
          {isFollowUpOverdue(row, now) ? <Badge tone="off">Overdue</Badge> : null}
          <Badge tone={row.status === 'active' ? 'on' : 'off'}>{row.status}</Badge>
        </span>
      ),
    },
    { key: 'last', label: 'Last contact', render: (row) => shortDate(row.lastContactAt) },
    { key: 'next', label: 'Next follow-up', render: (row) => shortDate(row.nextFollowUpAt) },
    { key: 'students', label: 'Referred', render: (row) => row.originalStudentCount || 0 },
    {
      key: 'remark',
      label: 'Remark',
      render: (row) => (row.latestRemark ? (
        <span title={row.latestRemark.text}>
          <span className="gx-remark-preview">{row.latestRemark.text}</span>
          <span className="gx-sub">{row.latestRemark.authorName} · {shortDate(row.latestRemark.createdAt)}</span>
        </span>
      ) : '—'),
    },
    {
      key: 'open',
      label: 'Actions',
      render: (row) => (
        <span className="gx-row-actions">
          <button type="button" className="gx-text" onClick={(event) => { event.stopPropagation(); navigate({ pathname: `/crm/consultancies/${row.id}`, search: directoryQuery() }); }}>Open</button>
          <button type="button" className="gx-text" onClick={(event) => { event.stopPropagation(); setStatusFor(row); setStatusForm({ followUpStatus: row.followUpStatus || 'Pending', scheduledAt: '', outcome: '', notes: '', nextAction: '', reason: '' }); }}>Status</button>
          <button type="button" className="gx-text" onClick={(event) => { event.stopPropagation(); setRemarkFor(row); setRemarkText(''); }}>Remark</button>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Consultancies" subtitle={superAdmin ? 'Super Admin preview. Browser storage is not access control.' : 'Staff preview shows consultancies owned by Demo staff. Browser storage is not access control.'}>
        <button type="button" className="gx-lime" onClick={() => replaceParams((copy) => copy.set('new', '1'))}>Add consultancy</button>
      </PageHeader>
      {directoryError ? (
        <div className="gx-notice error" role="alert">
          <p>{directoryError}</p>
          <button type="button" className="gx-btn" onClick={refresh}>Retry</button>
        </div>
      ) : (
        <>
          <section className="gx-metrics is-five" aria-label="Consultancy totals">
            {metrics.map((card) => (
              <article key={card.label} className="gx-metric">
                <p className="k">{card.label}</p>
                <p className="v">{card.value}</p>
                <p className="h">{card.hint}</p>
              </article>
            ))}
          </section>
          <div className="gx-toolbar">
            <SearchField value={search} onChange={(value) => replaceParams((copy) => { if (value) copy.set('q', value); else copy.delete('q'); })} label="Search name, contact, phone, or email" />
            <select className="gx-select" aria-label="Follow-up status" value={follow} onChange={(event) => replaceParams((copy) => { if (event.target.value === 'all') copy.delete('follow'); else copy.set('follow', event.target.value); })}>
              <option value="all">All follow-ups</option>
              {FOLLOW_UP_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="gx-select" aria-label="Relationship" value={relationship} onChange={(event) => replaceParams((copy) => { if (event.target.value === 'all') copy.delete('status'); else copy.set('status', event.target.value); })}>
              <option value="all">Active and inactive</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {superAdmin ? (
              <select className="gx-select" aria-label="Owner" value={owner} onChange={(event) => replaceParams((copy) => { if (event.target.value === 'all') copy.delete('owner'); else copy.set('owner', event.target.value); })}>
                <option value="all">All owners</option>
                {owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            ) : null}
            {superAdmin ? (
              <select className="gx-select" aria-label="Creator" value={creator} onChange={(event) => replaceParams((copy) => { if (event.target.value === 'all') copy.delete('creator'); else copy.set('creator', event.target.value); })}>
                <option value="all">All creators</option>
                {creators.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            ) : null}
            <select className="gx-select" aria-label="Sort" value={sort} onChange={(event) => replaceParams((copy) => { if (event.target.value === 'name') copy.delete('sort'); else copy.set('sort', event.target.value); })}>
              <option value="name">Name</option>
              <option value="created">Created</option>
              <option value="last">Last contact</option>
              <option value="next">Next follow-up</option>
              <option value="students">Students referred</option>
            </select>
            <span className="gx-count">{rows.length} of {visible.length}</span>
            <button type="button" className="gx-text" onClick={resetFilters}>Reset</button>
          </div>
          <div className="gx-toolbar">
            <button type="button" className={`gx-chip${dueToday ? ' is-on' : ''}`} onClick={() => replaceParams((copy) => { if (dueToday) copy.delete('due'); else copy.set('due', 'today'); })}>Due today</button>
            <button type="button" className={`gx-chip${overdueOnly ? ' is-on' : ''}`} onClick={() => replaceParams((copy) => { if (overdueOnly) copy.delete('overdue'); else copy.set('overdue', '1'); })}>Overdue</button>
            <button type="button" className={`gx-chip${quietOnly ? ' is-on' : ''}`} onClick={() => replaceParams((copy) => { if (quietOnly) copy.delete('quiet'); else copy.set('quiet', '1'); })}>No recent contact</button>
            <button type="button" className={`gx-chip${referralFilter === 'has' ? ' is-on' : ''}`} onClick={() => replaceParams((copy) => { if (referralFilter === 'has') copy.delete('referrals'); else copy.set('referrals', 'has'); })}>Has referrals</button>
            <button type="button" className={`gx-chip${referralFilter === 'none' ? ' is-on' : ''}`} onClick={() => replaceParams((copy) => { if (referralFilter === 'none') copy.delete('referrals'); else copy.set('referrals', 'none'); })}>No referrals</button>
          </div>
          {chips.length ? (
            <div className="gx-chips" aria-label="Active filters">
              {chips.map(([key, label]) => (
                <button key={key} type="button" className="gx-chip is-on" onClick={() => clearChip(key)}>{label} ×</button>
              ))}
            </div>
          ) : null}
          <Notice notice={notice} />
          <DataTable columns={columns} rows={rows} onSelect={(id) => navigate({ pathname: `/crm/consultancies/${id}`, search: directoryQuery() })} empty="No consultancies match these filters." />
        </>
      )}
      {creating ? (
        <Dialog title="Add consultancy" onClose={() => replaceParams((copy) => copy.delete('new'))}>
          <form className="gx-form" onSubmit={onCreate}>
            <label>Name
              <input value={form.name} required minLength={2} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>Relationship
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label>Notes
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </label>
            <p className="gx-help">Created by and owned by Demo staff in this browser preview.</p>
            <button className="gx-lime" type="submit" disabled={saving}>Save consultancy</button>
          </form>
        </Dialog>
      ) : null}
      {remarkFor ? (
        <Dialog title={`Remark for ${remarkFor.name}`} onClose={() => setRemarkFor(null)}>
          <form className="gx-form" onSubmit={onRemark}>
            <label>Remark
              <textarea value={remarkText} required maxLength={500} onChange={(event) => setRemarkText(event.target.value)} />
            </label>
            <p className="gx-help">Saved as Demo staff with the time it was added. Editing later keeps the previous text.</p>
            <button className="gx-lime" type="submit" disabled={saving || !remarkText.trim()}>Save remark</button>
          </form>
        </Dialog>
      ) : null}
      {statusFor ? (
        <Dialog title={`Follow-up for ${statusFor.name}`} onClose={() => setStatusFor(null)}>
          <form className="gx-form" onSubmit={onStatus}>
            <label>Follow-up status
              <select value={statusForm.followUpStatus} onChange={(event) => setStatusForm({ ...statusForm, followUpStatus: event.target.value })}>
                {FOLLOW_UP_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            {statusForm.followUpStatus === 'Call Scheduled' || statusForm.followUpStatus === 'Follow-up Required' || statusForm.followUpStatus === 'Interested' || statusForm.followUpStatus === 'On Hold' ? (
              <label>{statusForm.followUpStatus === 'Call Scheduled' ? 'Call date and time' : 'Date'}
                <input type="datetime-local" value={statusForm.scheduledAt} onChange={(event) => setStatusForm({ ...statusForm, scheduledAt: event.target.value })} />
              </label>
            ) : null}
            {statusForm.followUpStatus === 'Call Completed' ? (
              <label>Outcome
                <input value={statusForm.outcome} onChange={(event) => setStatusForm({ ...statusForm, outcome: event.target.value })} />
              </label>
            ) : null}
            {statusForm.followUpStatus === 'Follow-up Required' || statusForm.followUpStatus === 'Interested' ? (
              <label>Next action
                <input value={statusForm.nextAction} onChange={(event) => setStatusForm({ ...statusForm, nextAction: event.target.value })} />
              </label>
            ) : null}
            {statusForm.followUpStatus === 'Not Interested' || statusForm.followUpStatus === 'On Hold' ? (
              <label>Reason
                <input value={statusForm.reason} onChange={(event) => setStatusForm({ ...statusForm, reason: event.target.value })} />
              </label>
            ) : null}
            <label>Remark
              <textarea value={statusForm.notes} maxLength={500} onChange={(event) => setStatusForm({ ...statusForm, notes: event.target.value })} />
            </label>
            <p className="gx-help">Scheduling a future call does not change the last contact time. Overdue is shown when a scheduled or required follow-up is already past.</p>
            <button className="gx-lime" type="submit" disabled={saving}>Save follow-up</button>
          </form>
        </Dialog>
      ) : null}
    </>
  );
}
