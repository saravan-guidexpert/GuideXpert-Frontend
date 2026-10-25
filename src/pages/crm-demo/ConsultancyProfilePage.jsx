import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FiAlertCircle, FiCalendar, FiCheckCircle, FiPhone, FiUsers } from 'react-icons/fi';
import { interpretCrmResult } from '../../utils/crmAccess';
import {
  compareCounts,
  completionRate,
  countCreated,
  cumulativeSeries,
  followUpBuckets,
  formatRate,
  insightRange,
  monthlySeries,
  pipelineCounts,
  previousCount,
  referralTrendSeries,
} from '../../utils/crmConsultancyInsight';
import { localDayKey } from '../../utils/crmAnalytics';
import { ADMISSION_STATUSES, CALLING_STATUSES, CONSULTANCY_STATUSES, DEMO_ACTOR, DEMO_SEED_ACTOR, isFollowUpOverdue } from '../../utils/crmDemoStore';
import { DataTable, Dialog, Notice, SearchField } from './CrmKit';
import { shortDate } from './crmFormat';
import { loadAll } from './dashboard/dashboardModel';
import { useCrmDemo } from './useCrmDemo';
import RemarksActivity, { RemarkDialog } from './consultancy/RemarksActivity';
import { REMARK_LIMIT } from './consultancy/remarksModel';
import ConsultancyContacts from './consultancy/ConsultancyContacts';
import ConsultancyHeader from './consultancy/ConsultancyHeader';
import ConsultancyOverview from './consultancy/ConsultancyOverview';
import ConsultancyTabs from './consultancy/ConsultancyTabs';
import { attentionItems, referralPeriodHint, selectNextAction } from './consultancy/overviewModel';
import FollowUpCalendar from './consultancy/FollowUpCalendar';
import { followUpInputValue, scheduleInputValue } from './consultancy/followUpCalendarModel';
import useMatchMedia from './consultancy/useMatchMedia';
import './consultancy/consultancyOverview.css';

const TABS = [
  ['overview', 'Overview'],
  ['students', 'Referred students'],
  ['analytics', 'Analytics'],
  ['calendar', 'Calendar and follow-ups'],
  ['contacts', 'Contacts'],
  ['remarks', 'Remarks and activity'],
  ['settings', 'Settings and ownership'],
];
const RANGES = [
  ['7', 'Last 7 days'],
  ['30', 'Last 30 days'],
  ['90', 'Last 90 days'],
  ['month', 'This month'],
  ['year', 'This year'],
  ['12', 'Last 12 months'],
  ['all', 'All time'],
  ['custom', 'Custom'],
];
const EMPTY_STATUS = { followUpStatus: 'Fresh Lead', callingStatus: '', scheduledAt: '', outcome: '', notes: '', nextAction: '', reason: '' };

function messageOf(result) {
  const view = interpretCrmResult(result);
  return { tone: view.state === 'ok' ? 'success' : view.state === 'conflict' ? 'warning' : 'error', message: view.message, state: view.state };
}

function ChartFrame({ data, children, caption }) {
  return (
    <div className="gx-plot">
      <div className="gx-chart">{children}</div>
      <table className="gx-sr">
        <caption>{caption}</caption>
        <tbody>
          {data.map((point) => <tr key={point.key}><td>{point.label}</td><td>{point.referrals ?? point.count ?? point.cumulative ?? 0}</td></tr>)}
        </tbody>
      </table>
    </div>
  );
}

export default function ConsultancyProfilePage() {
  const { id } = useParams();
  const { client, demoRole, refresh, basePath, mode } = useCrmDemo();
  const superAdmin = demoRole === 'super_admin';
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', status: 'active', notes: '', followUpStatus: 'Fresh Lead', callingStatus: '' });
  const [scheduling, setScheduling] = useState(false);
  const [when, setWhen] = useState('');
  const [remarking, setRemarking] = useState(false);
  const [remarkText, setRemarkText] = useState('');
  const [remarkError, setRemarkError] = useState('');
  const [editingRemark, setEditingRemark] = useState(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusForm, setStatusForm] = useState(EMPTY_STATUS);
  const [ownerId, setOwnerId] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [studentStatus, setStudentStatus] = useState('all');
  const [calendarFocus, setCalendarFocus] = useState('');
  const stacked = useMatchMedia('(max-width: 960px)');

  useEffect(() => {
    if (tab !== 'calendar' || !calendarFocus) return;
    document.getElementById(`gx-follow-${calendarFocus}`)?.scrollIntoView({ block: 'nearest' });
  }, [tab, calendarFocus]);

  const loaded = client.getConsultancy(id);
  const consultancy = loaded.success ? loaded.data.consultancy : null;
  const contactsLoad = consultancy ? loadAll((page) => client.listContacts(id, { page, limit: 100 })) : { ok: true, items: [] };
  const followLoad = consultancy ? loadAll((page) => client.listFollowUps(id, { page, limit: 100 })) : { ok: true, items: [] };
  const remarkLoad = consultancy ? loadAll((page) => client.listRemarks(id, { page, limit: 100 })) : { ok: true, items: [] };
  const studentsLoad = loadAll((page) => client.listStudents({ page, limit: 100 }));
  const referralsLoad = loadAll((page) => client.listReferrals({ page, limit: 100 }));
  const auditsLoad = loadAll((page) => client.listAudits({ page, limit: 100 }));
  const loadError = [contactsLoad, followLoad, remarkLoad, studentsLoad, referralsLoad, auditsLoad].find((item) => item && item.ok === false)?.message || '';

  if (!loaded.success) {
    return (
      <>
        <p className="gx-crumb"><Link to={`${basePath}/consultancies`}>Consultancies</Link></p>
        <h2 className="gx-title">Consultancy</h2>
        <div className="gx-notice error" role="alert"><p>{loaded.message || 'Consultancy not found.'}</p></div>
      </>
    );
  }

  const now = new Date();
  const range = insightRange(period, now, { from: customFrom, to: customTo });
  const original = referralsLoad.items.filter((row) => row.originalConsultancyId === id);
  const studentsById = new Map(studentsLoad.items.map((row) => [row.id, row]));
  const linkedStudents = original.map((row) => studentsById.get(row.crmStudentId)).filter(Boolean);
  const pipeline = pipelineCounts(linkedStudents);
  const points = monthlySeries(original, linkedStudents, range);
  const trendPoints = referralTrendSeries(original, linkedStudents, range);
  const cumulative = cumulativeSeries(points);
  const buckets = followUpBuckets(followLoad.items, now);
  const completedInRange = followLoad.items.filter((row) => row.completedAt && !row.cancelledAt && new Date(row.completedAt) >= (range.start || new Date(0)) && (!range.end || new Date(row.completedAt) <= range.end));
  const priorReferrals = previousCount(original, range);
  const comparison = priorReferrals == null ? null : compareCounts(countCreated(original, range), priorReferrals);
  const rate = completionRate(followLoad.items, range);
  const related = new Set([id, ...original.flatMap((row) => [row.id, row.crmStudentId])]);
  const relatedActivity = auditsLoad.items.filter((row) => related.has(row.entityId));
  const activity = relatedActivity.slice(0, 8);
  const unreferred = studentsLoad.items.filter((row) => !referralsLoad.items.some((item) => item.crmStudentId === row.id));
  const needle = studentQuery.trim().toLowerCase();
  const referredRows = original.filter((row) => {
    const student = studentsById.get(row.crmStudentId);
    const status = student?.admissionStatus || 'Not started';
    if (studentStatus !== 'all' && status !== studentStatus) return false;
    if (!needle) return true;
    const phone = String(student?.phone || '');
    return `${row.studentName} ${phone}`.toLowerCase().includes(needle) || phone.includes(needle.replace(/\D/g, ''));
  });
  async function run(action, after) {
    setSaving(true);
    try {
      const result = await Promise.resolve(action());
      const view = messageOf(result);
      setNotice(view);
      if (view.state === 'ok') {
        refresh();
        if (after) after();
      }
      return view;
    } finally {
      setSaving(false);
    }
  }

  function selectTab(key) {
    setCalendarFocus('');
    setTab(key);
  }

  function openStudents(status) {
    setStudentStatus(status || 'all');
    selectTab('students');
  }

  function openCalendar(bucket) {
    setCalendarFocus(bucket || '');
    setTab('calendar');
  }

  function openStatus() {
    setStatusForm({ ...EMPTY_STATUS, followUpStatus: consultancy.followUpStatus, callingStatus: consultancy.callingStatus || '' });
    setStatusOpen(true);
  }

  function openEdit() {
    setEditForm({ name: consultancy.name, status: consultancy.status, notes: consultancy.notes || '', followUpStatus: consultancy.followUpStatus || 'Fresh Lead', callingStatus: consultancy.callingStatus || '' });
    setEditing(true);
  }

  function openRemark() {
    setRemarkError('');
    setEditingRemark(null);
    setRemarkText('');
    setRemarking(true);
  }

  function openRemarkEdit(row) {
    setRemarkError('');
    setRemarking(false);
    setRemarkText(row.text || '');
    setEditingRemark(row);
  }

  async function submitRemark(event) {
    event.preventDefault();
    const text = remarkText.trim();
    if (!text || text.length > REMARK_LIMIT) {
      setRemarkError(`A remark needs 1–${REMARK_LIMIT} characters.`);
      return;
    }
    setRemarkError('');
    const editing = editingRemark;
    const view = await run(
      () => (editing ? client.editRemark(id, editing.id, { text }) : client.addRemark(id, { text })),
      () => {
        setRemarking(false);
        setEditingRemark(null);
      },
    );
    if (view?.state !== 'ok') setRemarkError(view?.message || 'The remark could not be saved.');
  }

  function completeFollowUp(row) {
    run(() => client.setFollowUp(id, {
      followUpStatus: 'Meeting Completed',
      outcome: 'Completed from calendar',
      notes: row?.notes || 'Completed in the demo.',
    }));
  }

  const referralsReady = referralsLoad.ok;
  const studentsReady = studentsLoad.ok;
  const followReady = followLoad.ok;
  const nextAction = selectNextAction(followReady ? followLoad.items : [], consultancy, now);
  const urgent = Boolean(nextAction && (nextAction.state === 'overdue' || nextAction.state === 'due'));
  const seriesError = referralsReady && studentsReady ? '' : (referralsLoad.message || studentsLoad.message || 'Could not load referral trends.');
  const kpis = [
    { label: 'Original referrals', value: referralsReady ? original.length : '—', hint: referralsReady ? referralPeriodHint(comparison, range) : 'Could not load referrals', icon: FiUsers, onClick: referralsReady ? () => openStudents('all') : refresh },
    { label: 'Linked students', value: referralsReady && studentsReady ? linkedStudents.length : '—', hint: referralsReady && studentsReady ? 'Profiles behind those referrals' : 'Could not load students', icon: FiUsers, onClick: referralsReady && studentsReady ? () => openStudents('all') : refresh },
    { label: 'Follow-ups due', value: followReady ? buckets.dueToday.length : '—', hint: followReady ? 'Scheduled for today' : 'Could not load follow-ups', icon: FiCalendar, tone: followReady && buckets.dueToday.length ? 'warn' : '', onClick: followReady ? () => openCalendar('dueToday') : refresh },
    { label: 'Overdue', value: followReady ? buckets.overdue.length : '—', hint: followReady ? 'Open and already past' : 'Could not load follow-ups', icon: FiAlertCircle, tone: followReady && buckets.overdue.length ? 'danger' : '', onClick: followReady ? () => openCalendar('overdue') : refresh },
    { label: 'Completed in range', value: !followReady || range.invalid ? '—' : completedInRange.length, hint: range.invalid ? 'Choose a valid date range' : followReady ? range.label : 'Could not load follow-ups', icon: FiCheckCircle, onClick: followReady && !range.invalid ? () => openCalendar('completed') : refresh },
    { label: 'Last contact', value: shortDate(consultancy.lastContactAt), hint: consultancy.callingStatus || 'No calling status', icon: FiPhone, onClick: () => openCalendar('') },
  ];

  return (
    <div className="gx-co">
      {mode === 'api' ? <div className="gx-notice warning" role="status"><p>Remarks, follow-ups, calling status, consultancy pipeline, and owner are not stored on the server. Those saves are rejected. Name, notes, contacts, and linked students are saved.</p></div> : null}
      <ConsultancyHeader
        consultancy={consultancy}
        originalCount={referralsReady ? original.length : null}
        overdue={isFollowUpOverdue(consultancy, now)}
        urgent={urgent}
        saving={saving}
        onSchedule={() => { setWhen(''); setScheduling(true); }}
        onOpenFollowUp={() => openCalendar(nextAction?.bucket || '')}
        onRemark={openRemark}
        onStatus={openStatus}
        onEdit={openEdit}
        onStudents={() => openStudents('all')}
      />
      {loadError ? <div className="gx-notice error" role="alert"><p>{loadError}</p><button type="button" className="gx-btn" onClick={refresh}>Retry</button></div> : null}
      <Notice notice={notice} />
      <ConsultancyTabs tabs={TABS} active={tab} onChange={selectTab} />
      <div role="tabpanel" id={`gx-panel-${tab}`} aria-labelledby={`gx-tab-${tab}`}>
      {tab === 'overview' ? (
        <ConsultancyOverview
          stacked={stacked}
          nextAction={nextAction}
          saving={saving}
          onSchedule={() => { setWhen(''); setScheduling(true); }}
          onOpenFollowUp={() => openCalendar(nextAction?.bucket || '')}
          onComplete={() => completeFollowUp(nextAction?.followUp)}
          kpis={kpis}
          points={trendPoints}
          rangeLabel={range.label}
          rangeInvalid={range.invalid}
          seriesError={seriesError}
          onRetry={refresh}
          rangeControl={<RangeSelect period={period} setPeriod={setPeriod} customFrom={customFrom} customTo={customTo} setCustomFrom={setCustomFrom} setCustomTo={setCustomTo} />}
          pipeline={pipeline}
          linkedTotal={linkedStudents.length}
          onOpenStatus={openStudents}
          attention={attentionItems({ buckets, consultancy, unreferredCount: unreferred.length, followUpsAvailable: followReady })}
          attentionError={followReady ? '' : followLoad.message}
          onOpenAttention={(item) => {
            if (item.action === 'schedule') {
              setWhen('');
              setScheduling(true);
              return;
            }
            if (item.action === 'contacts') {
              selectTab('contacts');
              return;
            }
            if (item.action === 'calendar') openCalendar(item.bucket);
          }}
          activity={auditsLoad.ok ? activity : []}
          activityTotal={auditsLoad.ok ? relatedActivity.length : 0}
          activityError={auditsLoad.ok ? '' : auditsLoad.message}
          now={now}
          onViewActivity={() => selectTab('remarks')}
        />
      ) : null}

      {tab === 'students' ? (
        <section className="gx-card">
          <div className="gx-toolbar">
            <SearchField value={studentQuery} onChange={setStudentQuery} label="Search name or phone" />
            <select className="gx-select" aria-label="Admission status" value={studentStatus} onChange={(event) => setStudentStatus(event.target.value)}>
              <option value="all">All admission statuses</option>
              {ADMISSION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            {consultancy.status === 'active' ? <Link className="gx-lime" to={`${basePath}/students?new=1&consultancy=${id}`}>Add student</Link> : <p className="gx-note">Inactive consultancies cannot start a new referral.</p>}
          </div>
          <DataTable
            columns={[
              { key: 'name', label: 'Student', render: (row) => <Link to={`${basePath}/students/${row.crmStudentId}`}>{row.studentName}</Link> },
              { key: 'phone', label: 'Phone', render: (row) => studentsById.get(row.crmStudentId)?.phone || '—' },
              { key: 'original', label: 'Original consultancy', render: () => consultancy.name },
              { key: 'referred', label: 'Referral date', render: (row) => shortDate(row.createdAt) },
              { key: 'status', label: 'Admission status', render: (row) => studentsById.get(row.crmStudentId)?.admissionStatus || 'Not started' },
              { key: 'created', label: 'Created', render: (row) => shortDate(studentsById.get(row.crmStudentId)?.createdAt) },
              { key: 'open', label: 'Actions', render: (row) => <Link to={`${basePath}/students/${row.crmStudentId}`}>Open</Link> },
            ]}
            rows={referredRows}
            empty="No original referrals match these filters."
          />
        </section>
      ) : null}

      {tab === 'analytics' ? (
        <section className="gx-stack">
          <RangeSelect period={period} setPeriod={setPeriod} customFrom={customFrom} customTo={customTo} setCustomFrom={setCustomFrom} setCustomTo={setCustomTo} />
          {range.invalid ? <p className="gx-note">Choose a start date that is on or before the end date.</p> : (
            <>
              {comparison ? <p className="gx-note">{comparison.message || `${comparison.current} original referrals in ${range.label}. ${comparison.previous} in the previous period. Change ${comparison.absolute > 0 ? '+' : ''}${comparison.absolute}${comparison.percent == null ? '' : ` (${comparison.percent}%)`}.`}</p> : <p className="gx-note">All time has no previous period to compare.</p>}
              <div className="gx-dash">
                <section className="gx-card">
                  <h3>Monthly referral volume</h3>
                  {points.length === 0 ? <p className="gx-note">No referral records in this range.</p> : (
                    <ChartFrame data={points} caption="Monthly original referrals">
                      <ResponsiveContainer width="100%" height="100%"><BarChart data={points}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} width={28} /><Tooltip /><Bar dataKey="referrals" name="Referrals" fill="#c6f000" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
                    </ChartFrame>
                  )}
                </section>
                <section className="gx-card">
                  <h3>Student registrations</h3>
                  {points.length === 0 ? <p className="gx-note">No student creation dates in this range.</p> : (
                    <ChartFrame data={points} caption="Monthly student registrations">
                      <ResponsiveContainer width="100%" height="100%"><BarChart data={points}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} width={28} /><Tooltip /><Bar dataKey="registrations" name="Registrations" fill="#1c1c1a" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
                    </ChartFrame>
                  )}
                </section>
              </div>
              <section className="gx-card">
                <h3>Cumulative referrals</h3>
                {cumulative.length === 0 ? <p className="gx-note">No referral records to accumulate.</p> : (
                  <ChartFrame data={cumulative} caption="Cumulative original referrals">
                    <ResponsiveContainer width="100%" height="100%"><LineChart data={cumulative}><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} width={28} /><Tooltip /><Line type="monotone" dataKey="cumulative" name="Cumulative referrals" stroke="#1c1c1a" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
                  </ChartFrame>
                )}
              </section>
              <section className="gx-card">
                <h3>Admission pipeline</h3>
                <p className="gx-note">These are current admission statuses. A referral count is not an admission.</p>
                <ul className="gx-list">{pipeline.map((row) => <li key={row.status}>{row.status}: {row.count}</li>)}</ul>
              </section>
              <section className="gx-card">
                <h3>Follow-up performance</h3>
                <dl className="gx-facts">
                  <div><dt>Scheduled in view</dt><dd>{buckets.upcoming.length + buckets.dueToday.length + buckets.overdue.length}</dd></div>
                  <div><dt>Completed</dt><dd>{buckets.completed.length}</dd></div>
                  <div><dt>Overdue</dt><dd>{buckets.overdue.length}</dd></div>
                  <div><dt>Completion rate</dt><dd>{formatRate(rate)}</dd></div>
                </dl>
                <p className="gx-note">Completion rate is completed follow-ups divided by follow-ups in {range.label}. A cancelled follow-up is left out. A zero denominator is “No base”.</p>
              </section>
            </>
          )}
        </section>
      ) : null}

      {tab === 'calendar' ? (
        <FollowUpCalendar
          items={followReady ? followLoad.items : []}
          error={followReady ? '' : (followLoad.message || 'Could not load follow-ups.')}
          consultancyName={consultancy.name}
          saving={saving}
          focusBucket={calendarFocus}
          now={now}
          onRetry={refresh}
          onComplete={completeFollowUp}
          onCancel={(row) => run(() => client.cancelFollowUp(id, row.id))}
          onScheduleCall={(dateKey) => { setWhen(scheduleInputValue(dateKey, new Date())); setScheduling(true); }}
          onCreateFollowUp={(dateKey) => {
            setStatusForm({ ...EMPTY_STATUS, followUpStatus: 'Follow-up Required', scheduledAt: followUpInputValue(dateKey) });
            setStatusOpen(true);
          }}
          onReschedule={(row) => {
            const key = localDayKey(row.scheduledAt) || '';
            const call = row.type === 'call' || row.status === 'Meeting Scheduled';
            if (call) {
              setWhen(scheduleInputValue(key, new Date()));
              setScheduling(true);
              return;
            }
            setStatusForm({
              ...EMPTY_STATUS,
              followUpStatus: 'Follow-up Required',
              nextAction: row.nextAction || '',
              scheduledAt: followUpInputValue(key),
            });
            setStatusOpen(true);
          }}
          onOpenConsultancy={() => selectTab('overview')}
        />
      ) : null}

      {tab === 'contacts' ? (
        <ConsultancyContacts
          consultancyId={id}
          contactsLoad={contactsLoad}
          primaryContactId={consultancy.primaryContact?.id || ''}
          saving={saving}
          run={run}
          onRetry={refresh}
        />
      ) : null}

      {tab === 'remarks' ? (
        <RemarksActivity
          remarks={remarkLoad.items}
          audits={relatedActivity}
          remarksError={remarkLoad.ok ? '' : remarkLoad.message}
          auditsError={auditsLoad.ok ? '' : auditsLoad.message}
          now={now}
          onAdd={openRemark}
          onEdit={openRemarkEdit}
          onRetry={refresh}
        />
      ) : null}

      {tab === 'settings' ? (
        <div className="gx-set">
          <section className="gx-set-card" aria-labelledby="gx-set-profile">
            <header className="gx-set-head">
              <div>
                <h3 id="gx-set-profile">Profile</h3>
                <p>The name shown in the directory, and whether this consultancy can receive new referrals.</p>
              </div>
            </header>
            <form
              className="gx-set-form"
              key={`${consultancy.id}:${consultancy.updatedAt}`}
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                run(() => client.updateConsultancy(id, {
                  name: String(data.get('name') || '').trim(),
                  status: String(data.get('status') || consultancy.status),
                  notes: String(data.get('notes') || ''),
                }));
              }}
            >
              <div className="gx-set-grid">
                <label>Consultancy name
                  <input name="name" defaultValue={consultancy.name} required minLength={2} autoComplete="organization" />
                </label>
                <label>Account status
                  <select name="status" defaultValue={consultancy.status}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <span className="gx-set-hint">Inactive accounts stay on file. New referrals need an active account.</span>
                </label>
              </div>
              <label>Internal notes
                <textarea name="notes" rows={4} defaultValue={consultancy.notes || ''} placeholder="Context for the team working this account." />
              </label>
              <div className="gx-set-actions">
                <button className="gx-lime" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          </section>

          <section className="gx-set-card" aria-labelledby="gx-set-record">
            <header className="gx-set-head">
              <div>
                <h3 id="gx-set-record">Record</h3>
                <p>Creation and ownership for this consultancy.</p>
              </div>
            </header>
            <dl className="gx-set-facts">
              <div><dt>Created</dt><dd>{shortDate(consultancy.createdAt)}</dd></div>
              <div><dt>Last updated</dt><dd>{shortDate(consultancy.updatedAt)}</dd></div>
              <div><dt>Created by</dt><dd>{consultancy.createdByName || '—'}</dd></div>
              <div><dt>Owner</dt><dd>{consultancy.ownerName || '—'}</dd></div>
            </dl>
            {superAdmin ? (
              <form className="gx-set-owner" onSubmit={(event) => { event.preventDefault(); run(() => client.reassignOwner(id, { ownerId: ownerId || consultancy.ownerId })); }}>
                <label>Reassign owner
                  <select aria-label="Owner" value={ownerId || consultancy.ownerId} onChange={(event) => setOwnerId(event.target.value)}>
                    <option value={DEMO_ACTOR.id}>{DEMO_ACTOR.name}</option>
                    <option value={DEMO_SEED_ACTOR.id}>{DEMO_SEED_ACTOR.name}</option>
                  </select>
                </label>
                <button className="gx-btn" type="submit" disabled={saving}>Save owner</button>
              </form>
            ) : null}
          </section>

          <section className="gx-set-card" aria-labelledby="gx-set-pipeline">
            <header className="gx-set-head">
              <div>
                <h3 id="gx-set-pipeline">Pipeline</h3>
                <p>Consultancy status and calling status are updated from Update status.</p>
              </div>
              <button type="button" className="gx-btn" onClick={openStatus}>Update status</button>
            </header>
            <dl className="gx-set-facts gx-set-facts-2">
              <div><dt>Consultancy status</dt><dd>{consultancy.followUpStatus || '—'}</dd></div>
              <div><dt>Calling status</dt><dd>{consultancy.callingStatus || 'Not set'}</dd></div>
            </dl>
          </section>
        </div>
      ) : null}
      </div>

      {editing ? (
        <Dialog title="Edit consultancy" onClose={() => setEditing(false)}>
          <form className="gx-form" onSubmit={(event) => { event.preventDefault(); run(() => client.updateConsultancy(id, editForm), () => setEditing(false)); }}>
            <label>Name<input value={editForm.name} required minLength={2} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></label>
            <label>Active or inactive
              <select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label>Consultancy status
              <select value={editForm.followUpStatus} onChange={(event) => setEditForm({ ...editForm, followUpStatus: event.target.value })}>
                {CONSULTANCY_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>Calling status
              <select value={editForm.callingStatus} onChange={(event) => setEditForm({ ...editForm, callingStatus: event.target.value })}>
                <option value="">No calling status</option>
                {CALLING_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>Notes<textarea value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} /></label>
            <button className="gx-lime" type="submit" disabled={saving}>Save</button>
          </form>
        </Dialog>
      ) : null}
      {statusOpen ? (
        <Dialog title="Update status" onClose={() => setStatusOpen(false)}>
          <form className="gx-form" onSubmit={(event) => {
            event.preventDefault();
            run(() => client.setFollowUp(id, {
              followUpStatus: statusForm.followUpStatus,
              callingStatus: statusForm.callingStatus,
              notes: statusForm.notes,
              outcome: statusForm.outcome,
              nextAction: statusForm.nextAction,
              reason: statusForm.reason,
              scheduledAt: statusForm.scheduledAt ? new Date(statusForm.scheduledAt).toISOString() : undefined,
            }), () => setStatusOpen(false));
          }}
          >
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
            {statusForm.followUpStatus === 'Meeting Scheduled' || statusForm.followUpStatus === 'Follow-up Required' ? <label>Date and time<input type="datetime-local" value={statusForm.scheduledAt} onChange={(event) => setStatusForm({ ...statusForm, scheduledAt: event.target.value })} /></label> : null}
            {statusForm.followUpStatus === 'Meeting Completed' ? <label>Outcome<input value={statusForm.outcome} onChange={(event) => setStatusForm({ ...statusForm, outcome: event.target.value })} /></label> : null}
            {statusForm.followUpStatus === 'Follow-up Required' ? <label>Next action<input value={statusForm.nextAction} onChange={(event) => setStatusForm({ ...statusForm, nextAction: event.target.value })} /></label> : null}
            {statusForm.followUpStatus === 'Not Interested' ? <label>Reason<input value={statusForm.reason} onChange={(event) => setStatusForm({ ...statusForm, reason: event.target.value })} /></label> : null}
            <label>Remark<textarea value={statusForm.notes} onChange={(event) => setStatusForm({ ...statusForm, notes: event.target.value })} /></label>
            <button className="gx-lime" type="submit" disabled={saving}>Save status</button>
          </form>
        </Dialog>
      ) : null}
      {scheduling ? (
        <Dialog title="Schedule call" onClose={() => setScheduling(false)}>
          <form className="gx-form" onSubmit={(event) => { event.preventDefault(); run(() => client.setFollowUp(id, { followUpStatus: 'Meeting Scheduled', scheduledAt: new Date(when).toISOString() }), () => setScheduling(false)); }}>
            <label>Future date and time<input type="datetime-local" required value={when} onChange={(event) => setWhen(event.target.value)} /></label>
            <button className="gx-lime" type="submit" disabled={saving}>Schedule</button>
          </form>
        </Dialog>
      ) : null}
      {remarking || editingRemark ? (
        <RemarkDialog
          mode={editingRemark ? 'edit' : 'add'}
          text={remarkText}
          onChange={(value) => { setRemarkText(value); setRemarkError(''); }}
          saving={saving}
          error={remarkError}
          onClose={() => {
            if (saving) return;
            setRemarking(false);
            setEditingRemark(null);
            setRemarkError('');
          }}
          onSubmit={submitRemark}
        />
      ) : null}
    </div>
  );
}

function RangeSelect({ period, setPeriod, customFrom, customTo, setCustomFrom, setCustomTo }) {
  return (
    <div className="gx-toolbar">
      <select className="gx-select" aria-label="Date range" value={period} onChange={(event) => setPeriod(event.target.value)}>
        {RANGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      {period === 'custom' ? (
        <>
          <input className="gx-select" aria-label="From date" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
          <input className="gx-select" aria-label="To date" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
        </>
      ) : null}
    </div>
  );
}
