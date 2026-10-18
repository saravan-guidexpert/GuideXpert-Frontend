import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ADMISSION_STATUSES } from '../../utils/crmDemoStore';
import {
  formatRate,
  localDayKey,
  resolveRange,
  summarizeConsultancy,
} from '../../utils/crmAnalytics';
import { loadAll } from './dashboard/dashboardModel';
import { DataTable, SearchField } from './CrmKit';
import PeriodBar from './PeriodBar';
import { activityTitle, shortDate } from './crmFormat';
import { useCrmDemo } from './useCrmDemo';
import './crmInsight.css';

function daysLabel(days) {
  if (days == null) return '—';
  if (days === 0) return 'Today';
  if (days < 0) return `In ${Math.abs(days)} days`;
  return `${days} days`;
}

function activityLabel(audit) {
  if (!audit) return 'No activity recorded';
  return `${activityTitle(audit.action)} · ${shortDate(audit.createdAt)}`;
}

export default function ConsultancyInsight({ consultancy, contacts }) {
  const navigate = useNavigate();
  const { client, refresh } = useCrmDemo();
  const [period, setPeriod] = useState('30');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [admission, setAdmission] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const now = useMemo(() => new Date(), []);
  const studentsLoad = loadAll((page) => client.listStudents({ page, limit: 100 }));
  const referralsLoad = loadAll((page) => client.listReferrals({ page, limit: 100 }));
  const auditsLoad = loadAll((page) => client.listAudits({ page, limit: 100 }));
  const error = [studentsLoad, referralsLoad, auditsLoad].find((item) => !item.ok)?.message || '';
  const range = resolveRange(period, now, { from, to });
  const summary = summarizeConsultancy({
    consultancy,
    students: studentsLoad.items,
    referrals: referralsLoad.items,
    audits: auditsLoad.items,
    range,
    now,
  });
  const primary = contacts.find((contact) => contact.status === 'active') || contacts[0] || null;
  const needle = search.trim().toLowerCase();
  const visible = summary.rows.filter((row) => {
    if (admission !== 'all' && row.status !== admission) return false;
    const key = localDayKey(row.referral.createdAt);
    if (dateFrom && (!key || key < dateFrom)) return false;
    if (dateTo && (!key || key > dateTo)) return false;
    if (!needle) return true;
    const name = row.student?.fullName || row.referral.studentName || '';
    const phone = row.student?.phone || '';
    return `${name} ${phone}`.toLowerCase().includes(needle);
  });
  const tableRows = visible.map((row) => ({
    id: row.referral.id,
    studentId: row.student?.id || row.referral.crmStudentId,
    name: row.student?.fullName || row.referral.studentName || 'Student',
    phone: row.student?.phone || '—',
    createdAt: row.referral.createdAt,
    status: row.status,
    days: daysLabel(row.days),
    activity: activityLabel(row.lastActivity),
  }));

  return (
    <div className="gx-insight">
      <dl className="gx-facts gx-co-card">
        <div><dt>Contact</dt><dd>{primary?.name || 'None recorded'}</dd></div>
        <div><dt>Phone</dt><dd>{primary?.phone || '—'}</dd></div>
        <div><dt>Email</dt><dd>{primary?.email || '—'}</dd></div>
        <div><dt>Location</dt><dd>Location not recorded</dd></div>
        <div><dt>Created</dt><dd>{shortDate(consultancy.createdAt)}</dd></div>
        <div><dt>Last referral</dt><dd>{summary.lastReferralAt ? shortDate(summary.lastReferralAt) : 'No referral recorded'}</dd></div>
      </dl>
      {error ? (
        <div className="gx-inline-error" role="alert">
          <p>{error}</p>
          <button type="button" className="gx-btn" onClick={refresh}>Retry</button>
        </div>
      ) : (
        <>
          <div className="gx-insight-metrics gx-co-kpis" aria-label="Consultancy totals">
            <article><em>Referred students</em><strong>{summary.total}</strong></article>
            <article><em>Active</em><strong>{summary.active}</strong><small>Contacted, counselling, or applied</small></article>
            <article><em>Admitted</em><strong>{summary.admitted}</strong></article>
            <article><em>Enrolled</em><strong>{summary.enrolled}</strong></article>
            <article><em>No status update</em><strong>{summary.untouched}</strong><small>Still Not started</small></article>
          </div>
          <section className="gx-co-card">
          <PeriodBar period={period} onPeriod={setPeriod} from={from} to={to} onFrom={setFrom} onTo={setTo} />
          {range.invalid ? <p className="gx-help">Enter a start date on or before the end date.</p> : (
            <>
              <p className="gx-help">
                {summary.periodReferrals === 0
                  ? `No referrals in ${range.label.toLowerCase()}.`
                  : `${summary.periodReferrals} ${summary.periodReferrals === 1 ? 'referral' : 'referrals'} in ${range.label.toLowerCase()}.`}
                {' '}Rates use the current admission status of those students. Status changes are not dated.
              </p>
              <div className="gx-insight-metrics gx-co-rates" aria-label="Conversion rates">
                <article>
                  <em>Referral to application</em>
                  <strong>{formatRate(summary.conversion.referralToApplication)}</strong>
                  <small>{summary.conversion.referralToApplication.whole ? `${summary.conversion.referralToApplication.part} of ${summary.conversion.referralToApplication.whole}` : 'No referrals in this period'}</small>
                </article>
                <article>
                  <em>Application to admission</em>
                  <strong>{formatRate(summary.conversion.applicationToAdmission)}</strong>
                  <small>{summary.conversion.applicationToAdmission.whole ? `${summary.conversion.applicationToAdmission.part} of ${summary.conversion.applicationToAdmission.whole} who applied` : 'No applications in this period'}</small>
                </article>
                <article>
                  <em>Admission to enrollment</em>
                  <strong>{formatRate(summary.conversion.admissionToEnrollment)}</strong>
                  <small>{summary.conversion.admissionToEnrollment.whole ? `${summary.conversion.admissionToEnrollment.part} of ${summary.conversion.admissionToEnrollment.whole} admitted` : 'No admissions in this period'}</small>
                </article>
              </div>
            </>
          )}
          </section>
          <section className="gx-co-card">
          <div className="gx-toolbar">
            <SearchField value={search} onChange={setSearch} label="Search linked students" />
            <select className="gx-select" aria-label="Admission status" value={admission} onChange={(event) => setAdmission(event.target.value)}>
              <option value="all">All admission statuses</option>
              {ADMISSION_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <label className="gx-date-filter">From
              <input type="date" value={dateFrom} aria-label="Referral from" onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="gx-date-filter">To
              <input type="date" value={dateTo} aria-label="Referral to" onChange={(event) => setDateTo(event.target.value)} />
            </label>
          </div>
          <DataTable
            columns={[
              { key: 'name', label: 'Student', render: (row) => <Link to={`/crm/students/${row.studentId}`} onClick={(event) => event.stopPropagation()}>{row.name}<small className="gx-sub">{row.phone}</small></Link> },
              { key: 'date', label: 'Referral date', render: (row) => shortDate(row.createdAt) },
              { key: 'status', label: 'Admission status', render: (row) => row.status },
              { key: 'days', label: 'Days since referral', render: (row) => row.days },
              { key: 'activity', label: 'Last activity', render: (row) => row.activity },
              { key: 'open', label: 'Action', render: (row) => <Link to={`/crm/students/${row.studentId}`} onClick={(event) => event.stopPropagation()}>Open</Link> },
            ]}
            rows={tableRows}
            onSelect={(rowId) => {
              const match = tableRows.find((row) => row.id === rowId);
              if (match) navigate(`/crm/students/${match.studentId}`);
            }}
            empty={summary.total === 0 ? 'No students have been referred by this consultancy.' : 'No linked students match these filters.'}
          />
          </section>
        </>
      )}
    </div>
  );
}
