import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCrmAnalytics } from '../../../utils/crmApi';
import { interpretCrmResult } from '../../../utils/crmAccess';
import { analyticsParams, browserTimeZone } from './crmProductionQuery';
import { Banner, inputClass } from './crmUi';

const PERIODS = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'custom', label: 'Custom' },
];

function Rate({ title, result, empty }) {
  return (
    <article className="rounded-lg border border-gray-200 p-3">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-[#003366]">{result?.label || 'No base'}</p>
      <p className="mt-1 text-xs text-gray-500">{result?.whole ? `${result.part} of ${result.whole}` : empty}</p>
    </article>
  );
}

export default function AnalyticsPage() {
  const timeZone = useMemo(() => browserTimeZone(), []);
  const [period, setPeriod] = useState('30');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [seenKey, setSeenKey] = useState('');
  const built = useMemo(() => analyticsParams({ period, from, to, timeZone }), [period, from, to, timeZone]);
  const requestKey = `${reloadKey}:${built.error || JSON.stringify(built.query)}`;
  if (seenKey !== requestKey) {
    setSeenKey(requestKey);
    if (built.error) {
      setLoading(false);
      setData(null);
      setNotice({ tone: 'warning', message: built.error });
    } else {
      setLoading(true);
    }
  }

  useEffect(() => {
    if (built.error) return undefined;
    let cancelled = false;
    getCrmAnalytics(built.query).then((result) => {
      if (cancelled) return;
      const interpreted = interpretCrmResult(result);
      if (interpreted.state === 'ok') {
        setData(interpreted.data);
        setNotice(null);
      } else {
        setData(null);
        setNotice({
          tone: interpreted.state === 'forbidden' ? 'warning' : 'error',
          message: interpreted.message,
        });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [built, requestKey]);

  const peak = data?.volume?.points?.reduce((best, point) => (point.count > best ? point.count : best), 0) || 0;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#003366]">CRM analytics</h2>
        <p className="mt-1 text-sm text-gray-500">Referral volume uses referredAt in {timeZone}. Admission figures are the student’s current status.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-lg border px-3 py-1.5 text-sm ${period === item.id ? 'border-[#003366] bg-[#003366] text-white' : 'border-gray-300 bg-white'}`}
            onClick={() => setPeriod(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {period === 'custom' ? (
        <div className="flex flex-wrap gap-3">
          <label className="text-sm text-gray-600">From
            <input className={`${inputClass} mt-1`} type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label className="text-sm text-gray-600">To
            <input className={`${inputClass} mt-1`} type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
      ) : null}
      {notice ? <Banner tone={notice.tone}>{notice.message} {notice.tone === 'error' ? <button type="button" className="ml-2 underline" onClick={() => setReloadKey((current) => current + 1)}>Retry</button> : null}</Banner> : null}
      {loading ? <p className="text-sm text-gray-500">Loading analytics…</p> : null}
      {!loading && data ? (
        <>
          <p className="text-sm text-gray-600">{data.basisLabel}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Referrals in period</p>
              <p className="text-2xl font-semibold text-[#003366]">{data.referralsInPeriod}</p>
              <p className="text-xs text-gray-500">{data.range?.label}</p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Active consultancies</p>
              <p className="text-2xl font-semibold text-[#003366]">{data.activeConsultancies}</p>
              <p className="text-xs text-gray-500">On file now, not limited to this period</p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-500">Previous period</p>
              <p className="text-2xl font-semibold text-[#003366]">{data.previousPeriodReferrals == null ? '—' : data.previousPeriodReferrals}</p>
              <p className="text-xs text-gray-500">{data.previousPeriodReferrals == null ? 'All time has no previous window' : 'Same length, immediately before'}</p>
            </article>
          </div>
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="font-semibold text-[#003366]">Referral volume</h3>
            <p className="mb-3 text-sm text-gray-500">{data.volume?.grain === 'day' ? 'Each row is one calendar day in the selected timezone.' : 'Each row is one month.'}</p>
            {data.volume?.truncated ? <div className="mb-3"><Banner tone="warning">Older months were omitted because the span exceeds 120 months. This list shows the latest 120 months.</Banner></div> : null}
            {data.referralsInPeriod === 0 ? (
              <p className="text-sm text-gray-500">{data.volume?.points?.length ? 'No referrals were recorded in this period. The count is a real zero, not missing history.' : 'No referral dates are on record, so there is no history to chart.'}</p>
            ) : (
              <ul className="space-y-2">
                {data.volume.points.map((point) => (
                  <li key={point.key} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2 text-sm">
                    <span>{point.label}</span>
                    <span className="h-2 rounded bg-[#003366]" style={{ width: `${peak ? Math.max(4, Math.round((point.count / peak) * 100)) : 0}%` }} />
                    <span>{point.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div className="grid gap-3 lg:grid-cols-2">
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-[#003366]">Admission status</h3>
              <p className="mb-3 text-sm text-gray-500">Current status of students referred in this period. Earlier statuses are not stored.</p>
              {data.referralsInPeriod === 0 ? <p className="text-sm text-gray-500">No students were referred in this period, so there is no status distribution.</p> : (
                <ul className="space-y-1 text-sm">
                  {data.statusDistribution.map((row) => (
                    <li key={row.status} className="flex justify-between border-b border-gray-100 py-1">
                      <span>{row.status}</span>
                      <span>{row.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-[#003366]">Conversion</h3>
              <p className="mb-3 text-sm text-gray-500">Applied, admitted, or enrolled counts as an application. Admitted or enrolled counts as an admission. These use the current status only.</p>
              <div className="grid gap-2">
                <Rate title="Referral to application" result={data.conversion.referralToApplication} empty="No referrals in this period" />
                <Rate title="Application to admission" result={data.conversion.applicationToAdmission} empty="No one in this period has reached application" />
                <Rate title="Admission to enrollment" result={data.conversion.admissionToEnrollment} empty="No one in this period has reached admission" />
              </div>
            </section>
          </div>
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="font-semibold text-[#003366]">Consultancy performance</h3>
            <p className="mb-3 text-sm text-gray-500">Ordered by enrolled students referred in the period, then admitted or enrolled, then referral count, then name. Counts use the current consultancy.</p>
            {data.ranking.length === 0 ? <p className="text-sm text-gray-500">No consultancy recorded a referral in this period.</p> : (
              <table className="min-w-full text-left text-sm">
                <thead className="text-gray-600">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Consultancy</th>
                    <th className="py-2 pr-3 font-medium">Referrals</th>
                    <th className="py-2 pr-3 font-medium">Admitted or enrolled</th>
                    <th className="py-2 font-medium">Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ranking.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="py-2 pr-3"><Link className="font-medium text-[#003366] underline" to={`/admin/crm/consultancies/${row.id}`}>{row.name}</Link></td>
                      <td className="py-2 pr-3">{row.referrals}</td>
                      <td className="py-2 pr-3">{row.admitted}</td>
                      <td className="py-2">{row.enrolled}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : null}
      {!loading && !data && !notice ? <p className="text-sm text-gray-500">No analytics were returned.</p> : null}
    </div>
  );
}
