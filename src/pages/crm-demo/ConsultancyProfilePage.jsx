import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FiAlertCircle, FiCalendar, FiCheckCircle, FiClock, FiPhone, FiUsers } from 'react-icons/fi';
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
} from '../../utils/crmConsultancyInsight';
import { localDayKey, monthCells } from '../../utils/crmAnalytics';
import { ADMISSION_STATUSES, DEMO_ACTOR, DEMO_SEED_ACTOR, FOLLOW_UP_STATUSES, isFollowUpOverdue } from '../../utils/crmDemoStore';
import { Badge, DataTable, Dialog, Notice, SearchField } from './CrmKit';
import { activityTitle, shortDate } from './crmFormat';
import { loadAll } from './dashboard/dashboardModel';
import { useCrmDemo } from './useCrmDemo';

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
  ['30', 'Last 30 days'],
  ['90', 'Last 90 days'],
  ['month', 'This month'],
  ['year', 'This year'],
  ['12', 'Last 12 months'],
  ['all', 'All time'],
  ['custom', 'Custom'],
];
const EMPTY_CONTACT = { name: '', phone: '', email: '', role: '' };
const EMPTY_STATUS = { followUpStatus: 'Pending', scheduledAt: '', outcome: '', notes: '', nextAction: '', reason: '' };

function messageOf(result) {
  const view = interpretCrmResult(result);
  return { tone: view.state === 'ok' ? 'success' : view.state === 'conflict' ? 'warning' : 'error', message: view.message, state: view.state };
}

function followTone(status) {
  if (status === 'Interested' || status === 'Call Completed') return 'on';
  if (status === 'Not Interested') return 'off';
  if (status === 'Call Scheduled' || status === 'Follow-up Required') return 'warn';
  if (status === 'On Hold' || status === 'Not Lifted') return 'hold';
  return 'pending';
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
  const { client, demoRole, refresh } = useCrmDemo();
  const superAdmin = demoRole === 'super_admin';
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', status: 'active', notes: '' });
  const [scheduling, setScheduling] = useState(false);
  const [when, setWhen] = useState('');
  const [remarking, setRemarking] = useState(false);
  const [remarkText, setRemarkText] = useState('');
  const [editingRemark, setEditingRemark] = useState(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusForm, setStatusForm] = useState(EMPTY_STATUS);
  const [addingContact, setAddingContact] = useState(false);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);
  const [ownerId, setOwnerId] = useState('');
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [studentStatus, setStudentStatus] = useState('all');
  const [remarkQuery, setRemarkQuery] = useState('');

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
        <p className="gx-crumb"><Link to="/crm/consultancies">Consultancies</Link></p>
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
  const cumulative = cumulativeSeries(points);
  const buckets = followUpBuckets(followLoad.items, now);
  const completedInRange = followLoad.items.filter((row) => row.completedAt && !row.cancelledAt && new Date(row.completedAt) >= (range.start || new Date(0)) && (!range.end || new Date(row.completedAt) <= range.end));
  const priorReferrals = previousCount(original, range);
  const comparison = priorReferrals == null ? null : compareCounts(countCreated(original, range), priorReferrals);
  const rate = completionRate(followLoad.items, range);
  const related = new Set([id, ...original.flatMap((row) => [row.id, row.crmStudentId])]);
  const activity = auditsLoad.items.filter((row) => related.has(row.entityId)).slice(0, 8);
  const unreferred = studentsLoad.items.filter((row) => !referralsLoad.items.some((item) => item.crmStudentId === row.id));
  const year = monthCursor.getFullYear();
  const monthIndex = monthCursor.getMonth();
  const todayKey = localDayKey(now.toISOString());
  const cells = monthCells(year, monthIndex).map((day) => {
    if (!day) return { day: null, key: '', items: [] };
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const items = followLoad.items.filter((row) => localDayKey(row.scheduledAt || row.completedAt) === key && !row.cancelledAt);
    return { day, key, items };
  });
  const chosen = selectedDay ? cells.find((cell) => cell.key === selectedDay) : null;
  const needle = studentQuery.trim().toLowerCase();
  const referredRows = original.filter((row) => {
    const student = studentsById.get(row.crmStudentId);
    const status = student?.admissionStatus || 'Not started';
    if (studentStatus !== 'all' && status !== studentStatus) return false;
    if (!needle) return true;
    const phone = String(student?.phone || '');
    return `${row.studentName} ${phone}`.toLowerCase().includes(needle) || phone.includes(needle.replace(/\D/g, ''));
  });
  const remarkNeedle = remarkQuery.trim().toLowerCase();
  const visibleRemarks = remarkLoad.items.filter((row) => !remarkNeedle || row.text.toLowerCase().includes(remarkNeedle));

  async function run(action, after) {
    setSaving(true);
    const result = await Promise.resolve(action());
    setSaving(false);
    const view = messageOf(result);
    setNotice(view);
    if (view.state === 'ok') {
      refresh();
      if (after) after();
    }
  }

  function openStudents(status) {
    setStudentStatus(status || 'all');
    setTab('students');
  }

  const kpis = [
    { label: 'Original referrals', value: original.length, hint: 'First source is this consultancy', icon: FiUsers, onClick: () => openStudents('all') },
    { label: 'Linked students', value: linkedStudents.length, hint: 'Profiles behind those referrals', icon: FiUsers, onClick: () => openStudents('all') },
    { label: 'Follow-ups due', value: buckets.dueToday.length, hint: 'Scheduled for today', icon: FiCalendar, onClick: () => setTab('calendar') },
    { label: 'Overdue', value: buckets.overdue.length, hint: 'Open and already past', icon: FiAlertCircle, onClick: () => setTab('calendar') },
    { label: 'Completed in range', value: completedInRange.length, hint: range.label, icon: FiCheckCircle, onClick: () => setTab('calendar') },
    { label: 'Last contact', value: shortDate(consultancy.lastContactAt), hint: consultancy.followUpStatus, icon: FiPhone, text: true, onClick: () => setTab('calendar') },
    { label: 'Relationship', value: consultancy.followUpStatus, hint: consultancy.status === 'active' ? 'Active consultancy' : 'Inactive consultancy', icon: FiClock, text: true, onClick: () => setTab('settings') },
  ];

  return (
    <div className="gx-co">
      <header className="gx-co-head">
        <div className="gx-co-id">
          <p className="gx-crumb"><Link to="/crm/consultancies">Consultancies</Link> <span>/</span> {consultancy.name}</p>
          <h2 className="gx-title">{consultancy.name}</h2>
          <p className="gx-subtitle">{consultancy.primaryContact ? `${consultancy.primaryContact.name}${consultancy.primaryContact.phone ? ` · ${consultancy.primaryContact.phone}` : ''}${consultancy.primaryContact.email ? ` · ${consultancy.primaryContact.email}` : ''}` : 'No primary contact'}</p>
          <div className="gx-co-meta">
            <Badge tone={consultancy.status === 'active' ? 'on' : 'off'}>{consultancy.status}</Badge>
            <Badge tone={followTone(consultancy.followUpStatus)}>{consultancy.followUpStatus}</Badge>
            {isFollowUpOverdue(consultancy, now) ? <Badge tone="off">Overdue</Badge> : null}
            <span className="gx-co-facts">Owner {consultancy.ownerName} · Last contact {shortDate(consultancy.lastContactAt)} · Next {shortDate(consultancy.nextFollowUpAt)} · {original.length} original referrals</span>
          </div>
        </div>
        <div className="gx-co-actions">
          <Link className="gx-btn" to="/crm/consultancies">Back</Link>
          <button type="button" className="gx-btn" onClick={() => { setEditForm({ name: consultancy.name, status: consultancy.status, notes: consultancy.notes || '' }); setEditing(true); }}>Edit</button>
          <button type="button" className="gx-btn" onClick={() => { setStatusForm({ ...EMPTY_STATUS, followUpStatus: consultancy.followUpStatus }); setStatusOpen(true); }}>Update status</button>
          <button type="button" className="gx-btn" onClick={() => { setRemarkText(''); setRemarking(true); }}>Add remark</button>
          <button type="button" className="gx-btn" onClick={() => { setWhen(''); setScheduling(true); }}>Schedule call</button>
          <button type="button" className="gx-lime" onClick={() => openStudents('all')}>View referred students</button>
        </div>
      </header>
      <p className="gx-co-note">Browser storage is not access control.</p>
      {loadError ? <div className="gx-notice error" role="alert"><p>{loadError}</p><button type="button" className="gx-btn" onClick={refresh}>Retry</button></div> : null}
      <Notice notice={notice} />
      <div className="gx-tabs" role="tablist" aria-label="Consultancy sections">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={`gx-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="gx-co-body">
          <section className="gx-co-kpis" aria-label="Consultancy metrics">
            {kpis.map((card) => {
              const Icon = card.icon;
              return (
                <button key={card.label} type="button" className="gx-stat" onClick={card.onClick}>
                  <span className="gx-stat-k"><span className="gx-stat-ico"><Icon size={14} aria-hidden="true" /></span>{card.label}</span>
                  <span className={`gx-stat-v${card.text ? ' is-text' : ''}`}>{card.value}</span>
                  <span className="gx-stat-h">{card.hint}</span>
                </button>
              );
            })}
          </section>
          <div className="gx-co-grid">
            <div className="gx-co-main">
              <section className="gx-card">
                <div className="gx-card-head">
                  <h3>Referral trends</h3>
                  <RangeSelect period={period} setPeriod={setPeriod} customFrom={customFrom} customTo={customTo} setCustomFrom={setCustomFrom} setCustomTo={setCustomTo} />
                </div>
                {range.invalid ? <p className="gx-note">Choose a start date that is on or before the end date.</p> : points.length === 0 ? <p className="gx-note">No referral or registration dates in this range.</p> : (
                  <ChartFrame data={points} caption="Monthly original referrals and student registrations">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={points}>
                        <CartesianGrid vertical={false} stroke="var(--line)" />
                        <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: 'Plus Jakarta Sans, Satoshi, sans-serif', fill: '#6d6f73' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis allowDecimals={false} width={28} tick={{ fontSize: 12, fontFamily: 'Plus Jakarta Sans, Satoshi, sans-serif', fill: '#6d6f73' }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="referrals" name="Original referrals" fill="#1c1c1a" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="registrations" name="Student registrations" fill="#c6f000" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartFrame>
                )}
              </section>
              <section className="gx-card">
                <h3>Student pipeline</h3>
                <div className="gx-pipe">
                  {pipeline.map((row) => (
                    <button key={row.status} type="button" onClick={() => openStudents(row.status)}>
                      <span>{row.status}</span>
                      <i><b style={{ width: `${pipeline.reduce((max, item) => Math.max(max, item.count), 0) ? (row.count / Math.max(...pipeline.map((item) => item.count), 1)) * 100 : 0}%` }} /></i>
                      <strong>{row.count}</strong>
                    </button>
                  ))}
                </div>
              </section>
            </div>
            <aside className="gx-co-side">
              <section className="gx-card">
                <div className="gx-card-head"><h3>Recent activity</h3><button type="button" className="gx-text" onClick={() => setTab('remarks')}>View all</button></div>
                {activity.length === 0 ? <p className="gx-note">No recorded events for this consultancy.</p> : (
                  <ul className="gx-feed">
                    {activity.map((row) => <li key={row.id}><strong>{activityTitle(row.action)}</strong><span className="gx-sub">{row.actorLabel || 'Demo'} · {shortDate(row.createdAt)}</span></li>)}
                  </ul>
                )}
              </section>
              <section className="gx-card">
                <h3>Needs attention</h3>
                <div className="gx-attn">
                  <button type="button" onClick={() => setTab('calendar')}>{buckets.overdue.length} overdue follow-ups</button>
                  <button type="button" onClick={() => setTab('calendar')}>{buckets.dueSoon.length} follow-ups due within 7 days</button>
                  {!consultancy.lastContactAt ? <button type="button" onClick={() => setTab('calendar')}>No recorded contact yet</button> : null}
                  {!consultancy.primaryContact ? <button type="button" onClick={() => setTab('contacts')}>Missing primary contact</button> : null}
                  {unreferred.length ? <Link to="/crm/students?tab=open">{unreferred.length} students have no referral</Link> : null}
                </div>
              </section>
            </aside>
          </div>
        </div>
      ) : null}

      {tab === 'students' ? (
        <section className="gx-card">
          <div className="gx-toolbar">
            <SearchField value={studentQuery} onChange={setStudentQuery} label="Search name or phone" />
            <select className="gx-select" aria-label="Admission status" value={studentStatus} onChange={(event) => setStudentStatus(event.target.value)}>
              <option value="all">All admission statuses</option>
              {ADMISSION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            {consultancy.status === 'active' ? <Link className="gx-lime" to={`/crm/students?new=1&consultancy=${id}`}>Add student</Link> : <p className="gx-note">Inactive consultancies cannot start a new referral.</p>}
          </div>
          <DataTable
            columns={[
              { key: 'name', label: 'Student', render: (row) => <Link to={`/crm/students/${row.crmStudentId}`}>{row.studentName}</Link> },
              { key: 'phone', label: 'Phone', render: (row) => studentsById.get(row.crmStudentId)?.phone || '—' },
              { key: 'original', label: 'Original consultancy', render: () => consultancy.name },
              { key: 'referred', label: 'Referral date', render: (row) => shortDate(row.createdAt) },
              { key: 'status', label: 'Admission status', render: (row) => studentsById.get(row.crmStudentId)?.admissionStatus || 'Not started' },
              { key: 'created', label: 'Created', render: (row) => shortDate(studentsById.get(row.crmStudentId)?.createdAt) },
              { key: 'open', label: 'Actions', render: (row) => <Link to={`/crm/students/${row.crmStudentId}`}>Open</Link> },
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
        <div className="gx-dash">
          <section className="gx-card">
            <div className="gx-cal-nav">
              <button type="button" className="gx-btn" onClick={() => setMonthCursor(new Date(year, monthIndex - 1, 1))}>Previous</button>
              <strong>{monthCursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</strong>
              <button type="button" className="gx-btn" onClick={() => setMonthCursor(new Date(year, monthIndex + 1, 1))}>Next</button>
            </div>
            <div className="gx-cal">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => <span key={label} className="gx-cal-dow">{label}</span>)}
              {cells.map((cell, index) => (
                <button key={cell.key || `empty-${index}`} type="button" className={`gx-cal-day${cell.key === selectedDay ? ' is-on' : ''}${cell.key === todayKey ? ' is-today' : ''}`} disabled={!cell.day} onClick={() => setSelectedDay(cell.key)}>
                  <span>{cell.day || ''}</span>
                  {cell.items.length ? <small>{cell.items.length}</small> : null}
                </button>
              ))}
            </div>
            {chosen ? (chosen.items.length ? <ul className="gx-list">{chosen.items.map((row) => <li key={row.id}>{row.status} · {shortDate(row.scheduledAt)}{row.notes ? ` · ${row.notes}` : ''}</li>)}</ul> : <p className="gx-note">Nothing scheduled on {chosen.key}.</p>) : <p className="gx-note">Choose a day to see its follow-ups.</p>}
          </section>
          <section className="gx-card">
            <h3>Follow-ups</h3>
            {['dueToday', 'upcoming', 'overdue', 'completed'].map((key) => (
              <div key={key}>
                <h4>{key === 'dueToday' ? 'Due today' : key[0].toUpperCase() + key.slice(1)} ({buckets[key].length})</h4>
                {buckets[key].length === 0 ? <p className="gx-note">None</p> : (
                  <ul className="gx-list">
                    {buckets[key].map((row) => (
                      <li key={row.id}>
                        <strong>{row.status}</strong>
                        <span className="gx-sub">{row.actorName} · {shortDate(row.scheduledAt || row.completedAt)}{row.notes ? ` · ${row.notes}` : ''}</span>
                        {!row.completedAt && !row.cancelledAt ? (
                          <span className="gx-row-actions">
                            <button type="button" className="gx-text" onClick={() => run(() => client.setFollowUp(id, { followUpStatus: 'Call Completed', outcome: 'Completed from calendar', notes: row.notes || 'Completed in the demo.' }))}>Complete</button>
                            <button type="button" className="gx-text" onClick={() => run(() => client.cancelFollowUp(id, row.id))}>Cancel</button>
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        </div>
      ) : null}

      {tab === 'contacts' ? (
        <section className="gx-card">
          <button type="button" className="gx-btn" onClick={() => setAddingContact(true)}>Add contact</button>
          {contactsLoad.items.length === 0 ? <p className="gx-note">No contacts yet.</p> : (
            <ul className="gx-list">
              {contactsLoad.items.map((row) => (
                <li key={row.id}>
                  <strong>{row.name}</strong> {row.id === consultancy.primaryContact?.id ? <Badge tone="on">Primary</Badge> : null} <Badge tone={row.status === 'active' ? 'on' : 'off'}>{row.status}</Badge>
                  <span className="gx-sub">{[row.role, row.phone, row.email].filter(Boolean).join(' · ') || 'No phone or email'}</span>
                  {row.status === 'active' ? <button type="button" className="gx-text" onClick={() => run(() => client.deactivateContact(id, row.id))}>Deactivate</button> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === 'remarks' ? (
        <section className="gx-card">
          <SearchField value={remarkQuery} onChange={setRemarkQuery} label="Search remarks" />
          {visibleRemarks.length === 0 ? <p className="gx-note">No remarks match.</p> : (
            <ul className="gx-list">
              {visibleRemarks.map((row) => (
                <li key={row.id}>
                  <p>{row.text}</p>
                  <span className="gx-sub">{row.authorName} · {shortDate(row.createdAt)}{row.updatedAt !== row.createdAt ? ` · edited ${shortDate(row.updatedAt)}` : ''}</span>
                  {row.previousText ? <span className="gx-sub">Previous text kept</span> : null}
                  {row.authorId === DEMO_ACTOR.id ? <button type="button" className="gx-text" onClick={() => { setRemarkText(row.text); setEditingRemark(row); }}>Edit</button> : null}
                </li>
              ))}
            </ul>
          )}
          <h3>Activity</h3>
          <p className="gx-note">This history is stored in the browser. It is not tamper-proof and it is not a server audit log.</p>
          {auditsLoad.items.filter((row) => related.has(row.entityId)).length === 0 ? <p className="gx-note">No activity for this consultancy.</p> : (
            <ul className="gx-list">
              {auditsLoad.items.filter((row) => related.has(row.entityId)).map((row) => (
                <li key={row.id}>{activityTitle(row.action)} <span className="gx-sub">{row.actorLabel || 'Demo'} · {shortDate(row.createdAt)}</span></li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === 'settings' ? (
        <section className="gx-card">
          <dl className="gx-facts">
            <div><dt>Created</dt><dd>{shortDate(consultancy.createdAt)}</dd></div>
            <div><dt>Updated</dt><dd>{shortDate(consultancy.updatedAt)}</dd></div>
            <div><dt>Created by</dt><dd>{consultancy.createdByName}</dd></div>
            <div><dt>Owner</dt><dd>{consultancy.ownerName}</dd></div>
          </dl>
          <form className="gx-form" onSubmit={(event) => { event.preventDefault(); run(() => client.updateConsultancy(id, editForm.name ? editForm : { name: consultancy.name, status: consultancy.status, notes: consultancy.notes || '' })); }}>
            <label>Name<input defaultValue={consultancy.name} required minLength={2} onChange={(event) => setEditForm({ name: event.target.value, status: editForm.status || consultancy.status, notes: editForm.notes ?? consultancy.notes })} /></label>
            <label>Relationship flag
              <select defaultValue={consultancy.status} onChange={(event) => setEditForm({ name: editForm.name || consultancy.name, status: event.target.value, notes: editForm.notes ?? consultancy.notes })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label>Notes<textarea defaultValue={consultancy.notes || ''} onChange={(event) => setEditForm({ name: editForm.name || consultancy.name, status: editForm.status || consultancy.status, notes: event.target.value })} /></label>
            <button className="gx-lime" type="submit" disabled={saving}>Save profile</button>
          </form>
          <p className="gx-note">Relationship status is {consultancy.followUpStatus}. Use Update status to change it. Demo staff and Demo seed are preview labels, not sign-in accounts.</p>
          {superAdmin ? (
            <form className="gx-inline" onSubmit={(event) => { event.preventDefault(); run(() => client.reassignOwner(id, { ownerId: ownerId || consultancy.ownerId })); }}>
              <label>Owner
                <select aria-label="Owner" value={ownerId || consultancy.ownerId} onChange={(event) => setOwnerId(event.target.value)}>
                  <option value={DEMO_ACTOR.id}>{DEMO_ACTOR.name}</option>
                  <option value={DEMO_SEED_ACTOR.id}>{DEMO_SEED_ACTOR.name}</option>
                </select>
              </label>
              <button className="gx-btn" type="submit" disabled={saving}>Save owner</button>
            </form>
          ) : null}
        </section>
      ) : null}

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
            <label>Notes<textarea value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} /></label>
            <button className="gx-lime" type="submit" disabled={saving}>Save</button>
          </form>
        </Dialog>
      ) : null}
      {statusOpen ? (
        <Dialog title="Update relationship status" onClose={() => setStatusOpen(false)}>
          <form className="gx-form" onSubmit={(event) => {
            event.preventDefault();
            run(() => client.setFollowUp(id, {
              followUpStatus: statusForm.followUpStatus,
              notes: statusForm.notes,
              outcome: statusForm.outcome,
              nextAction: statusForm.nextAction,
              reason: statusForm.reason,
              scheduledAt: statusForm.scheduledAt ? new Date(statusForm.scheduledAt).toISOString() : undefined,
            }), () => setStatusOpen(false));
          }}
          >
            <label>Status
              <select value={statusForm.followUpStatus} onChange={(event) => setStatusForm({ ...statusForm, followUpStatus: event.target.value })}>
                {FOLLOW_UP_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            {statusForm.followUpStatus === 'Call Scheduled' || statusForm.followUpStatus === 'Follow-up Required' ? <label>Date and time<input type="datetime-local" value={statusForm.scheduledAt} onChange={(event) => setStatusForm({ ...statusForm, scheduledAt: event.target.value })} /></label> : null}
            {statusForm.followUpStatus === 'Call Completed' ? <label>Outcome<input value={statusForm.outcome} onChange={(event) => setStatusForm({ ...statusForm, outcome: event.target.value })} /></label> : null}
            {statusForm.followUpStatus === 'Follow-up Required' ? <label>Next action<input value={statusForm.nextAction} onChange={(event) => setStatusForm({ ...statusForm, nextAction: event.target.value })} /></label> : null}
            {statusForm.followUpStatus === 'Not Interested' ? <label>Reason<input value={statusForm.reason} onChange={(event) => setStatusForm({ ...statusForm, reason: event.target.value })} /></label> : null}
            <label>Remark<textarea value={statusForm.notes} onChange={(event) => setStatusForm({ ...statusForm, notes: event.target.value })} /></label>
            <button className="gx-lime" type="submit" disabled={saving}>Save status</button>
          </form>
        </Dialog>
      ) : null}
      {scheduling ? (
        <Dialog title="Schedule call" onClose={() => setScheduling(false)}>
          <form className="gx-form" onSubmit={(event) => { event.preventDefault(); run(() => client.setFollowUp(id, { followUpStatus: 'Call Scheduled', scheduledAt: new Date(when).toISOString() }), () => setScheduling(false)); }}>
            <label>Future date and time<input type="datetime-local" required value={when} onChange={(event) => setWhen(event.target.value)} /></label>
            <button className="gx-lime" type="submit" disabled={saving}>Schedule</button>
          </form>
        </Dialog>
      ) : null}
      {remarking ? (
        <Dialog title="Add remark" onClose={() => setRemarking(false)}>
          <form className="gx-form" onSubmit={(event) => { event.preventDefault(); run(() => client.addRemark(id, { text: remarkText }), () => setRemarking(false)); }}>
            <label>Remark<textarea required maxLength={500} value={remarkText} onChange={(event) => setRemarkText(event.target.value)} /></label>
            <button className="gx-lime" type="submit" disabled={saving || !remarkText.trim()}>Save remark</button>
          </form>
        </Dialog>
      ) : null}
      {editingRemark ? (
        <Dialog title="Edit remark" onClose={() => setEditingRemark(null)}>
          <form className="gx-form" onSubmit={(event) => { event.preventDefault(); run(() => client.editRemark(id, editingRemark.id, { text: remarkText }), () => setEditingRemark(null)); }}>
            <label>Remark<textarea required maxLength={500} value={remarkText} onChange={(event) => setRemarkText(event.target.value)} /></label>
            <p className="gx-help">The previous wording stays on the remark.</p>
            <button className="gx-lime" type="submit" disabled={saving}>Update remark</button>
          </form>
        </Dialog>
      ) : null}
      {addingContact ? (
        <Dialog title="Add contact" onClose={() => setAddingContact(false)}>
          <form className="gx-form" onSubmit={(event) => { event.preventDefault(); run(() => client.createContact(id, contactForm), () => { setAddingContact(false); setContactForm(EMPTY_CONTACT); }); }}>
            <label>Name<input required value={contactForm.name} onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })} /></label>
            <label>Phone<input value={contactForm.phone} onChange={(event) => setContactForm({ ...contactForm, phone: event.target.value })} /></label>
            <label>Email<input value={contactForm.email} onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })} /></label>
            <label>Designation<input value={contactForm.role} onChange={(event) => setContactForm({ ...contactForm, role: event.target.value })} /></label>
            <button className="gx-lime" type="submit" disabled={saving}>Save contact</button>
          </form>
        </Dialog>
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
