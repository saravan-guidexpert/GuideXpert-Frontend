import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  conversionFor,
  formatRate,
  joinReferrals,
  parseIso,
  previousRange,
  rankConsultancies,
  resolveRange,
  statusDistribution,
  statusOf,
  volumeSeries,
  within,
  calendarQueryForBucket,
} from '../../utils/crmAnalytics';
import { loadAll } from './dashboard/dashboardModel';
import { PageHeader } from './CrmKit';
import PeriodBar from './PeriodBar';
import StatusBars from './StatusBars';
import { chartPalette } from './crmTheme';
import { useCrmDemo } from './useCrmDemo';
import './crmInsight.css';

function axisMax(points) {
  const peak = points.reduce((max, point) => Math.max(max, point.count), 0);
  if (peak <= 4) return Math.max(peak, 1);
  return Math.ceil(peak * 1.15);
}

function comparisonText(current, prior) {
  if (prior == null) return '';
  if (current === 0 && prior === 0) return 'No referrals in this period or the previous period of the same length.';
  if (prior === 0) return `${current} ${current === 1 ? 'referral' : 'referrals'} in this period. None in the previous period, so there is no earlier baseline.`;
  return `${current} in this period and ${prior} in the previous period of the same length.`;
}

function VolumeTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="gx-tip" role="tooltip">
      <strong>{point.count}</strong>
      <span>{point.label}</span>
    </div>
  );
}

function VolumeChart({ points, onSelect, caption }) {
  const { theme } = useCrmDemo();
  const palette = chartPalette(theme);
  const yMax = axisMax(points);
  const dense = points.length > 16;
  const peak = points.reduce((best, point) => (point.count > (best?.count || 0) ? point : best), null);
  const hot = peak && peak.count > 0 ? peak.key : '';
  return (
    <div className="gx-volume">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} barCategoryGap={dense ? '28%' : '42%'} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gx-volume-hot" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d6ff4a" />
              <stop offset="100%" stopColor="#8adf2a" />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={palette.grid} />
          <XAxis dataKey="label" interval={dense ? 4 : 0} tick={{ fill: palette.tick, fontSize: 11, fontFamily: 'Satoshi, Source Sans 3, Inter, sans-serif' }} axisLine={false} tickLine={false} dy={8} />
          <YAxis domain={[0, yMax]} allowDecimals={false} width={28} tick={{ fill: palette.tick, fontSize: 11, fontFamily: 'Satoshi, Source Sans 3, Inter, sans-serif' }} axisLine={false} tickLine={false} />
          <Tooltip cursor={false} content={<VolumeTip />} wrapperStyle={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }} isAnimationActive={false} />
          <Bar dataKey="count" name="Referrals" radius={[10, 10, 10, 10]} maxBarSize={dense ? 10 : 18} isAnimationActive={false} onClick={(entry) => onSelect(entry?.payload?.key || entry?.key)}>
            {points.map((point) => (
              <Cell key={point.key} fill={point.key === hot ? 'url(#gx-volume-hot)' : palette.bar} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <table className="gx-sr">
        <caption>{caption}</caption>
        <thead>
          <tr><th>Period</th><th>Referrals</th></tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}><td>{point.label}</td><td>{point.count}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { client, refresh, basePath } = useCrmDemo();
  const [period, setPeriod] = useState('30');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const now = useMemo(() => new Date(), []);
  const studentsLoad = loadAll((page) => client.listStudents({ page, limit: 100 }));
  const consultanciesLoad = loadAll((page) => client.listConsultancies({ page, limit: 100 }));
  const referralsLoad = loadAll((page) => client.listReferrals({ page, limit: 100 }));
  const error = [studentsLoad, consultanciesLoad, referralsLoad].find((item) => !item.ok)?.message || '';
  const students = studentsLoad.items;
  const consultancies = consultanciesLoad.items;
  const referrals = referralsLoad.items;
  const range = resolveRange(period, now, { from, to });
  const undated = referrals.filter((row) => !parseIso(row.createdAt)).length;
  const dated = referrals.filter((row) => parseIso(row.createdAt));
  const inPeriod = range.invalid ? [] : dated.filter((row) => within(row.createdAt, range));
  const joined = joinReferrals(inPeriod, students, [], now);
  const rates = range.invalid ? null : conversionFor(joined);
  const series = volumeSeries(referrals, range);
  const ranked = range.invalid ? [] : rankConsultancies(consultancies, referrals, students, range);
  const prior = previousRange(range);
  const priorCount = prior ? dated.filter((row) => within(row.createdAt, prior)).length : null;
  const active = consultancies.filter((row) => row.status === 'active').length;
  const hasVolume = series.some((point) => point.count > 0);
  const daily = Boolean(range.start && range.end && range.end.getTime() - range.start.getTime() <= 31 * 86400000);

  function openBucket(key) {
    const query = calendarQueryForBucket(key);
    if (!query) return;
    navigate(`${basePath}/calendar?${new URLSearchParams(query).toString()}`);
  }

  return (
    <>
      <PageHeader title="Analytics" subtitle="Referral volume, conversion, and consultancy performance from the records in this browser.">
        <PeriodBar period={period} onPeriod={setPeriod} from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </PageHeader>
      <p className="gx-demo-note">Local demo records. These are not production analytics, and sample entries are not verified consultancy activity.</p>
      {error ? (
        <div className="gx-notice error" role="alert">
          <p>{error}</p>
          <button type="button" className="gx-btn" onClick={refresh}>Retry</button>
        </div>
      ) : range.invalid ? <p className="gx-help">Enter a start date on or before the end date. Nothing is counted until the range is valid.</p> : (
        <div className="gx-analytics">
          <section className="gx-analytics-kpis" aria-label="Period totals">
            <article>
              <em>Referrals in period</em>
              <strong>{inPeriod.length}</strong>
              <small>{range.label}</small>
            </article>
            <article>
              <em>Active consultancies</em>
              <strong>{active}</strong>
              <small>On file now, not limited to this period</small>
            </article>
            <article>
              <em>Students in these referrals</em>
              <strong>{joined.length}</strong>
              <small>{joined.filter((row) => statusOf(row.student) === 'Enrolled').length} enrolled</small>
            </article>
          </section>
          <p className="gx-help">{comparisonText(inPeriod.length, priorCount)}</p>
          {undated > 0 ? <p className="gx-help">{undated} {undated === 1 ? 'referral has' : 'referrals have'} no usable date and {undated === 1 ? 'is' : 'are'} left out of these charts.</p> : null}
          <section className="gx-panel">
            <div className="gx-panel-head">
              <div>
                <h3>Referral volume</h3>
                <p>{hasVolume ? `${daily ? 'Each bar is one local day' : 'Each bar is one month'}. The busiest ${daily ? 'day' : 'month'} is highlighted.` : 'Nothing was recorded in this range.'}</p>
              </div>
            </div>
            {series.length === 0 || !hasVolume ? (
              <p className="gx-analytics-empty">{series.length === 0 ? 'No referral dates are on record, so there is no history to chart.' : 'No referrals were recorded in this period. The count is a real zero, not missing history.'}</p>
            ) : (
              <VolumeChart points={series} onSelect={openBucket} caption={daily ? 'Referral volume by local day' : 'Referral volume by month'} />
            )}
          </section>
          <div className="gx-analytics-split">
            <section className="gx-panel">
              <div className="gx-panel-head">
                <div>
                  <h3>Admission status</h3>
                  <p>Current status of students referred in this period. Earlier statuses are not stored.</p>
                </div>
              </div>
              <StatusBars rows={statusDistribution(joined)} empty="No students were referred in this period, so there is no status distribution." />
            </section>
            <section className="gx-panel">
              <div className="gx-panel-head">
                <div>
                  <h3>Conversion</h3>
                  <p>Applied, admitted, or enrolled counts as an application. Admitted or enrolled counts as an admission.</p>
                </div>
              </div>
              <div className="gx-insight-metrics gx-rates">
                <article>
                  <em>Referral to application</em>
                  <strong>{formatRate(rates.referralToApplication)}</strong>
                  <small>{rates.referralToApplication.whole ? `${rates.referralToApplication.part} of ${rates.referralToApplication.whole} referrals` : 'No referrals in this period'}</small>
                </article>
                <article>
                  <em>Application to admission</em>
                  <strong>{formatRate(rates.applicationToAdmission)}</strong>
                  <small>{rates.applicationToAdmission.whole ? `${rates.applicationToAdmission.part} of ${rates.applicationToAdmission.whole} who reached application` : 'No one in this period has reached application'}</small>
                </article>
                <article>
                  <em>Admission to enrollment</em>
                  <strong>{formatRate(rates.admissionToEnrollment)}</strong>
                  <small>{rates.admissionToEnrollment.whole ? `${rates.admissionToEnrollment.part} of ${rates.admissionToEnrollment.whole} who reached admission` : 'No one in this period has reached admission'}</small>
                </article>
              </div>
            </section>
          </div>
          <section className="gx-panel">
            <div className="gx-panel-head">
              <div>
                <h3>Consultancy performance</h3>
                <p>Ordered by enrolled students referred in the period, then admitted or enrolled, then referral count, then name.</p>
              </div>
            </div>
            {ranked.every((row) => row.referrals === 0) ? <p className="gx-help">No consultancy recorded a referral in this period.</p> : (
              <div className="gx-table-wrap">
                <table className="gx-table">
                  <thead>
                    <tr>
                      <th>Consultancy</th>
                      <th>Referrals</th>
                      <th>Admitted or enrolled</th>
                      <th>Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((row) => (
                      <tr key={row.id}>
                        <td><Link to={`${basePath}/consultancies/${row.id}`}>{row.name}</Link></td>
                        <td>{row.referrals}</td>
                        <td>{row.admitted}</td>
                        <td>{row.enrolled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
