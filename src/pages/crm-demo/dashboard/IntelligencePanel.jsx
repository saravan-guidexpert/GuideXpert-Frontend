import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  joinReferrals,
  parseIso,
  previousRange,
  rankConsultancies,
  resolveRange,
  statusDistribution,
  statusOf,
  within,
} from '../../../utils/crmAnalytics';
import PeriodBar from '../PeriodBar';
import StatusBars from '../StatusBars';
import { shortDate } from '../crmFormat';
import { loadAll } from './dashboardModel';
import { useCrmDemo } from '../useCrmDemo';
import '../crmInsight.css';

export default function IntelligencePanel() {
  const { client, refresh } = useCrmDemo();
  const [period, setPeriod] = useState('30');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const now = useMemo(() => new Date(), []);
  const studentsLoad = loadAll((page) => client.listStudents({ page, limit: 100 }));
  const consultanciesLoad = loadAll((page) => client.listConsultancies({ page, limit: 100 }));
  const referralsLoad = loadAll((page) => client.listReferrals({ page, limit: 100 }));
  const error = [studentsLoad, consultanciesLoad, referralsLoad].find((item) => !item.ok)?.message || '';
  const range = resolveRange(period, now, { from, to });
  const students = studentsLoad.items;
  const referrals = referralsLoad.items;
  const dated = referrals.filter((row) => parseIso(row.createdAt));
  const inPeriod = range.invalid ? [] : dated.filter((row) => within(row.createdAt, range));
  const prior = previousRange(range);
  const priorCount = prior ? dated.filter((row) => within(row.createdAt, prior)).length : null;
  const distribution = statusDistribution(students.map((student) => ({ status: statusOf(student) })));
  const ranked = range.invalid ? [] : rankConsultancies(consultanciesLoad.items, referrals, students, range).filter((row) => row.referrals > 0).slice(0, 5);
  const recent = [...dated].sort((a, b) => parseIso(b.createdAt) - parseIso(a.createdAt)).slice(0, 5);
  const joinedStudents = joinReferrals(referrals, students, [], now);

  return (
    <section className="gx-panel gx-intel" aria-labelledby="gx-intel-title">
      <div className="gx-panel-head">
        <div>
          <h3 id="gx-intel-title">Consultancy intelligence</h3>
          <p>Counts come from the student and referral records in this browser.</p>
        </div>
        <PeriodBar period={period} onPeriod={setPeriod} from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </div>
      {error ? (
        <div className="gx-inline-error" role="alert">
          <p>{error}</p>
          <button type="button" className="gx-btn" onClick={refresh}>Retry</button>
        </div>
      ) : range.invalid ? <p className="gx-help">Enter a start date on or before the end date.</p> : (
        <div className="gx-intel-grid">
          <div>
            <p className="gx-kicker">New referrals</p>
            <Link className="gx-intel-stat" to="/crm/demo/calendar">
              <strong>{inPeriod.length}</strong>
              <span>{range.label}</span>
            </Link>
            <p className="gx-help">
              {priorCount === 0 && inPeriod.length === 0
                ? 'No referrals in this period or the previous one.'
                : priorCount === 0
                  ? 'None in the previous period of the same length.'
                  : `${priorCount} in the previous period of the same length.`}
            </p>
            <p className="gx-kicker">Students by admission status</p>
            <StatusBars
              rows={distribution}
              empty={students.length === 0 ? 'No students are on file.' : 'No admission statuses are recorded.'}
            />
            <p className="gx-help">This is the current status of every student, including people with no referral. It is not a historical snapshot. {joinedStudents.length} of {students.length} students have a referral.</p>
          </div>
          <div>
            <p className="gx-kicker">Performance in this period</p>
            {ranked.length === 0 ? <p className="gx-help">No consultancy recorded a referral in this period.</p> : (
              <ol className="gx-board">
                {ranked.map((row, index) => (
                  <li key={row.id}>
                    <span className="gx-rank">{index + 1}</span>
                    <div className="gx-board-copy">
                      <Link className="gx-ellipsis" to={`/crm/demo/consultancies/${row.id}`}>{row.name}</Link>
                      <small>{row.referrals} referred · {row.admitted} admitted or enrolled · {row.enrolled} enrolled</small>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <p className="gx-help">Ranked by enrolled students in the period, then admissions, then referral count.</p>
            <p className="gx-kicker">Recent referrals</p>
            {recent.length === 0 ? <p className="gx-help">No referral dates are on record.</p> : recent.map((referral) => (
              <Link key={referral.id} className="gx-activity" to={`/crm/demo/students/${referral.crmStudentId}`}>
                <span className="gx-act-copy">
                  <strong>{referral.studentName || 'Student'}</strong>
                  <small>{referral.consultancyName || 'Consultancy'}</small>
                </span>
                <time className="gx-act-time" dateTime={referral.createdAt}>{shortDate(referral.createdAt)}</time>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
