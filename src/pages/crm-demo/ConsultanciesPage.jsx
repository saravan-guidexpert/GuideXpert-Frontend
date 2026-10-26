import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiCalendar, FiCheck, FiGrid, FiPhone, FiUserPlus } from 'react-icons/fi';
import { interpretCrmResult } from '../../utils/crmAccess';
import { CONSULTANCY_PIPELINE, FOLLOW_UP_STAGE_GROUPS, boardCounts, matchesBoardStage } from '../../utils/consultancyPipeline';
import { CALLING_STATUSES, CONSULTANCY_STATUSES, isFollowUpOverdue } from '../../utils/crmDemoStore';
import { Badge, DataTable, Dialog, Notice, SearchField } from './CrmKit';
import { shortDate } from './crmFormat';
import { loadAll } from './dashboard/dashboardModel';
import { useCrmDemo } from './useCrmDemo';

const EMPTY = { name: '', status: 'active', notes: '', followUpStatus: 'Fresh Lead', callingStatus: '' };
const QUIET_DAYS = 30;
const STAGE_CARDS = [
  { id: 'total', label: 'Total consultancies', hint: 'In this view', tone: 'total', icon: FiGrid },
  { id: 'fresh', label: 'Fresh leads', hint: 'Not contacted yet', tone: 'fresh', icon: FiUserPlus },
  { id: 'contacted', label: 'Contacted', hint: 'Conversation started', tone: 'contacted', icon: FiPhone },
  { id: 'meeting_done', label: 'Meetings completed', hint: 'Meeting is complete', tone: 'meeting', icon: FiCalendar },
  { id: 'onboarded', label: 'Onboarded', hint: 'Onboarding or onboarded', tone: 'onboarded', icon: FiCheck },
];

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function previewRemark(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= 84) return clean;
  return `${clean.slice(0, 84).trimEnd()}…`;
}

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
  if (status === 'Interested' || status === 'Meeting Completed' || status === 'On - Boarded') return 'on';
  if (status === 'Not Interested' || status === 'Discontinued') return 'off';
  if (status === 'Meeting Scheduled' || status === 'Follow-up Required' || status === 'Onboarding in Progress') return 'warn';
  if (status === 'On Hold') return 'hold';
  return 'pending';
}

export default function ConsultanciesPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { client, demoRole, refresh, basePath, mode } = useCrmDemo();
  const superAdmin = demoRole === 'super_admin';
  const search = params.get('q') || '';
  const relationship = params.get('status') === 'active' || params.get('status') === 'inactive' ? params.get('status') : 'all';
  const follow = CONSULTANCY_STATUSES.includes(params.get('follow') || '') ? params.get('follow') : 'all';
  const stage = CONSULTANCY_PIPELINE.some((item) => item.id === params.get('stage')) ? params.get('stage') : '';
  const calling = CALLING_STATUSES.includes(params.get('calling') || '') ? params.get('calling') : 'all';
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
  const [statusForm, setStatusForm] = useState({ followUpStatus: 'Fresh Lead', callingStatus: '', scheduledAt: '', outcome: '', notes: '', nextAction: '', reason: '' });
  const [filtersOpen, setFiltersOpen] = useState(false);

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
  const scoped = visible.filter((row) => {
    if (relationship !== 'all' && row.status !== relationship) return false;
    if (calling !== 'all' && (row.callingStatus || '') !== calling) return false;
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
  });
  const counts = boardCounts(scoped);
  const rows = scoped.filter((row) => matchesBoardStage(row, stage) && (follow === 'all' || row.followUpStatus === follow)).sort((a, b) => {
    if (sort === 'created') return String(b.createdAt).localeCompare(String(a.createdAt));
    if (sort === 'last') return String(b.lastContactAt || '').localeCompare(String(a.lastContactAt || ''));
    if (sort === 'next') return String(a.nextFollowUpAt || '9999').localeCompare(String(b.nextFollowUpAt || '9999'));
    if (sort === 'students') return (b.originalStudentCount || 0) - (a.originalStudentCount || 0) || String(a.name).localeCompare(String(b.name));
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  const metrics = STAGE_CARDS.map((card) => {
    const value = card.id === 'total' ? counts.total : counts[card.id];
    const share = card.id !== 'total' && counts.total > 0 ? ` · ${Math.round((value / counts.total) * 100)}%` : '';
    return { ...card, value, hint: `${card.hint}${share}` };
  });

  const filtersActive = Boolean(
    search || stage || follow !== 'all' || calling !== 'all' || relationship !== 'all' || dueToday || overdueOnly || quietOnly || referralFilter !== 'all' || sort !== 'name' || (superAdmin && (owner !== 'all' || creator !== 'all')),
  );
  const owners = [...new Map(visible.map((row) => [row.ownerId, row.ownerName])).entries()];
  const creators = [...new Map(visible.map((row) => [row.createdById, row.createdByName])).entries()];

  function applyStage(value) {
    replaceParams((copy) => {
      if (!value || value === 'all' || value === 'total') copy.delete('stage');
      else copy.set('stage', value);
      const currentFollow = copy.get('follow');
      const group = FOLLOW_UP_STAGE_GROUPS.find((item) => item.statuses.includes(currentFollow));
      if (currentFollow && (!value || value === 'all' || value === 'total' || (group && group.id !== value))) copy.delete('follow');
    });
  }

  function applyFollow(value) {
    replaceParams((copy) => {
      if (value === 'all') copy.delete('follow');
      else {
        copy.set('follow', value);
        const group = FOLLOW_UP_STAGE_GROUPS.find((item) => item.statuses.includes(value));
        if (group) copy.set('stage', group.id);
      }
    });
  }

  function resetFilters() {
    replaceParams((copy) => {
      ['q', 'status', 'stage', 'follow', 'calling', 'owner', 'creator', 'due', 'overdue', 'quiet', 'referrals', 'sort'].forEach((key) => copy.delete(key));
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
      navigate({ pathname: `${basePath}/consultancies/${result.data.consultancy.id}`, search: directoryQuery() });
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
      callingStatus: statusForm.callingStatus,
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
      width: '18%',
      render: (row) => (
        <span className="gx-firm">
          <button type="button" className="gx-firm-name" onClick={(event) => { event.stopPropagation(); navigate({ pathname: `${basePath}/consultancies/${row.id}`, search: directoryQuery() }); }}>{row.name}</button>
          <span className="gx-sub">{row.primaryContact?.name || 'No primary contact'}</span>
        </span>
      ),
    },
    {
      key: 'owner',
      label: 'Owner',
      width: '12%',
      render: (row) => (
        <span className="gx-owner">
          <span className="gx-avatar" aria-hidden="true">{initials(row.ownerName)}</span>
          <span className="gx-owner-copy">
            <span className="gx-owner-name">{row.ownerName || (row.pipelineStored === false ? 'Not assigned' : '—')}</span>
            {superAdmin ? <span className="gx-sub">{row.createdByName}</span> : null}
          </span>
        </span>
      ),
    },
    {
      key: 'follow',
      label: 'Stage / status',
      width: '14%',
      render: (row) => (
        <span className="gx-status-stack">
          <Badge tone={followTone(row.followUpStatus)}>{row.pipelineStored === false ? 'Not stored' : row.followUpStatus}</Badge>
          {isFollowUpOverdue(row, now) ? <Badge tone="late">Overdue</Badge> : null}
        </span>
      ),
    },
    {
      key: 'calling',
      label: 'Calling status',
      width: '10%',
      render: (row) => (row.callingStatus ? <span className="gx-call">{row.callingStatus}</span> : <span className="gx-dash">—</span>),
    },
    { key: 'last', label: 'Last contact', width: '10%', render: (row) => (row.lastContactAt ? <span className="gx-date">{shortDate(row.lastContactAt)}</span> : <span className="gx-dash">—</span>) },
    {
      key: 'next',
      label: 'Next follow-up',
      width: '11%',
      render: (row) => (row.nextFollowUpAt ? <span className={`gx-date${isFollowUpOverdue(row, now) ? ' is-overdue' : ''}`}>{shortDate(row.nextFollowUpAt)}</span> : <span className="gx-dash">—</span>),
    },
    { key: 'students', label: 'Referrals', width: '6%', render: (row) => <span className="gx-count-pill">{row.originalStudentCount || 0}</span> },
    {
      key: 'remark',
      label: 'Latest remark',
      width: '14%',
      render: (row) => (row.latestRemark ? (
        <span className="gx-remark" title={row.latestRemark.text}>
          <span className="gx-remark-preview">{previewRemark(row.latestRemark.text)}</span>
          <span className="gx-sub">{row.latestRemark.authorName} · {shortDate(row.latestRemark.createdAt)}</span>
        </span>
      ) : <span className="gx-dash">—</span>),
    },
    {
      key: 'open',
      label: 'Actions',
      width: '15%',
      render: (row) => (
        <span className="gx-row-actions">
          <button type="button" className="gx-row-btn" onClick={(event) => { event.stopPropagation(); navigate({ pathname: `${basePath}/consultancies/${row.id}`, search: directoryQuery() }); }}>Open</button>
          <button type="button" className="gx-row-btn" onClick={(event) => { event.stopPropagation(); setStatusFor(row); setStatusForm({ followUpStatus: row.followUpStatus || 'Fresh Lead', callingStatus: row.callingStatus || '', scheduledAt: '', outcome: '', notes: '', nextAction: '', reason: '' }); }}>Status</button>
          <button type="button" className="gx-row-btn" onClick={(event) => { event.stopPropagation(); setRemarkFor(row); setRemarkText(''); }}>Remark</button>
        </span>
      ),
    },
  ];

  return (
    <div className={`gx-dir${filtersOpen ? ' is-filters' : ''}`}>
      <header className="gx-dir-head">
        <div>
          <p className="gx-dir-crumb">CRM / Consultancies</p>
          <h2 className="gx-title gx-dir-title">Consultancies</h2>
          <p className="gx-dir-lede">Manage relationships, track admissions partners, and stay on top of follow-ups.</p>
        </div>
        <div className="gx-dir-head-side">
          <span className="gx-env-pill">{mode === 'api' ? 'Signed-in CRM' : (superAdmin ? 'Browser demo · all owners' : 'Browser demo')}</span>
          <button type="button" className="gx-lime" onClick={() => replaceParams((copy) => copy.set('new', '1'))}>+ Add consultancy</button>
        </div>
      </header>
      {directoryError ? (
        <div className="gx-notice error" role="alert">
          <p>{directoryError}</p>
          <button type="button" className="gx-btn" onClick={refresh}>Retry</button>
        </div>
      ) : (
        <>
          <section className="gx-stage-board" aria-label="Consultancy stages">
            {metrics.map((card) => {
              const selected = stage === card.id;
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`gx-stage-kpi is-${card.tone}${selected ? ' is-on' : ''}`}
                  aria-pressed={selected}
                  onClick={() => applyStage(selected || card.id === 'total' ? 'all' : card.id)}
                >
                  <span className="gx-stage-ico" aria-hidden="true"><Icon size={14} strokeWidth={1.75} /></span>
                  <span className="gx-stage-k">{card.label}</span>
                  <span className="gx-stage-v">{card.value}</span>
                  <span className="gx-stage-h">{card.hint}</span>
                </button>
              );
            })}
          </section>
          <section className="gx-dir-panel">
          <div className="gx-dir-filters">
            <div className="gx-dir-toolbar">
              <SearchField value={search} onChange={(value) => replaceParams((copy) => { if (value) copy.set('q', value); else copy.delete('q'); })} label="Search consultancy, contact or phone..." />
              <button type="button" className="gx-btn gx-dir-filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
                {filtersOpen ? 'Hide filters' : 'Filters'}
              </button>
              <span className="gx-dir-count">{rows.length} {rows.length === 1 ? 'consultancy' : 'consultancies'}</span>
            </div>
            <div className="gx-dir-toolbar gx-dir-toolbar-filters">
              <select className="gx-select" aria-label="Pipeline stage" value={stage || 'all'} onChange={(event) => applyStage(event.target.value)}>
                <option value="all">All stages</option>
                {CONSULTANCY_PIPELINE.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <select className="gx-select" aria-label="Consultancy status" value={follow} onChange={(event) => applyFollow(event.target.value)}>
                <option value="all">All statuses in stage</option>
                {FOLLOW_UP_STAGE_GROUPS.map((group) => (
                  <optgroup key={group.id} label={STAGE_CARDS.find((card) => card.id === group.id)?.label || group.id}>
                    {group.statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                  </optgroup>
                ))}
              </select>
              <select className="gx-select" aria-label="Calling status" value={calling} onChange={(event) => replaceParams((copy) => { if (event.target.value === 'all') copy.delete('calling'); else copy.set('calling', event.target.value); })}>
                <option value="all">All calling statuses</option>
                {CALLING_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
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
            </div>
            <div className="gx-filter-pills" aria-label="Quick filters">
              <button type="button" className={`gx-chip${dueToday ? ' is-on' : ''}`} aria-pressed={dueToday} onClick={() => replaceParams((copy) => { if (dueToday) copy.delete('due'); else copy.set('due', 'today'); })}>Due today</button>
              <button type="button" className={`gx-chip${overdueOnly ? ' is-on' : ''}`} aria-pressed={overdueOnly} onClick={() => replaceParams((copy) => { if (overdueOnly) copy.delete('overdue'); else copy.set('overdue', '1'); })}>Overdue</button>
              <button type="button" className={`gx-chip${quietOnly ? ' is-on' : ''}`} aria-pressed={quietOnly} onClick={() => replaceParams((copy) => { if (quietOnly) copy.delete('quiet'); else copy.set('quiet', '1'); })}>No recent contact</button>
              <button type="button" className={`gx-chip${referralFilter === 'has' ? ' is-on' : ''}`} aria-pressed={referralFilter === 'has'} onClick={() => replaceParams((copy) => { if (referralFilter === 'has') copy.delete('referrals'); else copy.set('referrals', 'has'); })}>Has referrals</button>
              <button type="button" className={`gx-chip${referralFilter === 'none' ? ' is-on' : ''}`} aria-pressed={referralFilter === 'none'} onClick={() => replaceParams((copy) => { if (referralFilter === 'none') copy.delete('referrals'); else copy.set('referrals', 'none'); })}>No referrals</button>
              {filtersActive ? <button type="button" className="gx-dir-clear" onClick={resetFilters}>Clear filters</button> : null}
            </div>
          </div>
          <Notice notice={notice} />
          {visible.length === 0 ? (
            <div className="gx-dir-empty">
              <p>No consultancies yet.</p>
              <button type="button" className="gx-lime" onClick={() => replaceParams((copy) => copy.set('new', '1'))}>+ Add consultancy</button>
            </div>
          ) : rows.length === 0 ? (
            <div className="gx-dir-empty">
              <p>No consultancies match these filters.</p>
              <button type="button" className="gx-btn" onClick={resetFilters}>Clear filters</button>
            </div>
          ) : (
            <DataTable wrapClass="gx-dir-table" columns={columns} rows={rows} onSelect={(id) => navigate({ pathname: `${basePath}/consultancies/${id}`, search: directoryQuery() })} empty="No consultancies match these filters." />
          )}
          </section>
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
            <label>Consultancy status
              <select value={form.followUpStatus} onChange={(event) => setForm({ ...form, followUpStatus: event.target.value })}>
                {CONSULTANCY_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>Calling status
              <select value={form.callingStatus} onChange={(event) => setForm({ ...form, callingStatus: event.target.value })}>
                <option value="">No calling status</option>
                {CALLING_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
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
        <Dialog title={`Status for ${statusFor.name}`} onClose={() => setStatusFor(null)}>
          <form className="gx-form" onSubmit={onStatus}>
            <label>Consultancy status
              <select value={statusForm.followUpStatus} onChange={(event) => setStatusForm({ ...statusForm, followUpStatus: event.target.value })}>
                {CONSULTANCY_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>Calling status
              <select value={statusForm.callingStatus} onChange={(event) => setStatusForm({ ...statusForm, callingStatus: event.target.value })}>
                <option value="">No calling status</option>
                {CALLING_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            {statusForm.followUpStatus === 'Meeting Scheduled' || statusForm.followUpStatus === 'Follow-up Required' || statusForm.followUpStatus === 'Interested' || statusForm.followUpStatus === 'On Hold' || statusForm.followUpStatus === 'Onboarding in Progress' ? (
              <label>{statusForm.followUpStatus === 'Meeting Scheduled' ? 'Meeting date and time' : 'Date'}
                <input type="datetime-local" value={statusForm.scheduledAt} onChange={(event) => setStatusForm({ ...statusForm, scheduledAt: event.target.value })} />
              </label>
            ) : null}
            {statusForm.followUpStatus === 'Meeting Completed' ? (
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
            <p className="gx-help">A future meeting does not change the last contact time. Overdue is shown when a meeting or required follow-up is already past.</p>
            <button className="gx-lime" type="submit" disabled={saving}>Save status</button>
          </form>
        </Dialog>
      ) : null}
    </div>
  );
}
