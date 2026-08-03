import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUsers,
  FiTrendingUp,
  FiCalendar,
  FiCheckCircle,
  FiMessageSquare,
  FiHeadphones,
  FiSend,
  FiBarChart2,
  FiExternalLink,
} from 'react-icons/fi';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import DashboardLayout from '../../components/Admin/DashboardLayout';
import KpiCard from '../../components/Admin/KpiCard';
import ChartContainer from '../../components/Admin/ChartContainer';
import { useAdminDateRange } from '../../hooks/useAdminDateRange';
import {
  getExecutiveSummary,
  getLifecycleValidation,
  getStoredToken,
} from '../../utils/adminApi';

const STAGE_LABELS = {
  lead: 'Lead',
  qualified: 'Qualified',
  interested: 'Interested',
  booked: 'Booked',
  attended: 'Attended',
  admission: 'Admission',
};

function formatMs(ms) {
  if (ms == null || !Number.isFinite(ms)) return '—';
  const hours = ms / 3600000;
  if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
  return `${Math.round((hours / 24) * 10) / 10}d`;
}

function formatPct(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value}%`;
}

export default function ExecutiveDashboard() {
  const { dateRange } = useAdminDateRange();
  const [summary, setSummary] = useState(null);
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validationLoading, setValidationLoading] = useState(false);
  const [error, setError] = useState('');
  const [showValidation, setShowValidation] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setValidation(null);

    const params = {};
    if (dateRange.from) params.from = dateRange.from;
    if (dateRange.to) params.to = dateRange.to;
    const token = getStoredToken();

    getExecutiveSummary(params, token).then((summaryRes) => {
      if (cancelled) return;
      if (!summaryRes.success) {
        setError(summaryRes.message || 'Failed to load executive summary');
        setSummary(null);
        setLoading(false);
        return;
      }
      setSummary(summaryRes.data?.data || summaryRes.data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [dateRange.from, dateRange.to]);

  useEffect(() => {
    if (!showValidation) return;

    let cancelled = false;
    setValidationLoading(true);

    const params = {};
    if (dateRange.from) params.from = dateRange.from;
    if (dateRange.to) params.to = dateRange.to;
    const token = getStoredToken();

    getLifecycleValidation(params, token).then((validationRes) => {
      if (cancelled) return;
      setValidation(
        validationRes.success ? validationRes.data?.data || validationRes.data : null
      );
      setValidationLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [showValidation, dateRange.from, dateRange.to]);

  const funnelChartData = useMemo(() => {
    const stages = summary?.funnelSnapshot?.stages || [];
    return stages.map((row) => ({
      stage: STAGE_LABELS[row.stage] || row.stage,
      count: row.count,
      rate: row.rateFromLeadPct,
    }));
  }, [summary]);

  const deepLinks = [
    { to: '/admin/dashboard', label: 'Sales Analytics' },
    { to: '/admin/funnel-analytics', label: 'Funnel Analytics' },
    { to: '/admin/lead-intelligence', label: 'Lead Intelligence' },
    { to: '/admin/whatsapp-ops/overview', label: 'WhatsApp Ops' },
    { to: '/admin/one-on-one-counseling', label: '1-on-1 Counseling' },
    { to: '/admin/calling-team', label: 'Calling Team (BDA)' },
  ];

  return (
    <DashboardLayout
      title="Executive Dashboard"
      subtitle="Cross-product KPIs and canonical lifecycle funnel. Metrics are aggregated from existing analytics services."
    >
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading executive metrics…</p>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Lifecycle cohort"
              value={summary?.leadVolume?.lifecycleCohort ?? '—'}
              icon={FiUsers}
              accent="hero"
              subtitle="Leads in canonical funnel (date range)"
            />
            <KpiCard
              label="Qualified leads"
              value={summary?.qualifiedAndHot?.qualifiedLeads ?? '—'}
              icon={FiCheckCircle}
              subtitle={`Hot: ${summary?.qualifiedAndHot?.hotLeads ?? 0}`}
            />
            <KpiCard
              label="Bookings"
              value={summary?.bookings?.lifecycleBooked ?? '—'}
              icon={FiCalendar}
              subtitle={`Reg: ${summary?.bookings?.registrationSlotBooked ?? 0} · 1:1: ${summary?.bookings?.oneOnOneBookingConfirmed ?? 0}`}
            />
            <KpiCard
              label="Admissions"
              value={summary?.conversions?.lifecycleAdmission ?? '—'}
              icon={FiTrendingUp}
              subtitle={`Reg completed: ${summary?.conversions?.registrationCompleted ?? 0}`}
            />
          </section>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <KpiCard
              label="WhatsApp leads"
              value={summary?.leadVolume?.whatsappTotal ?? '—'}
              icon={FiMessageSquare}
              subtitle={`Avg score: ${summary?.qualifiedAndHot?.averageLeadScore ?? '—'}`}
            />
            <KpiCard
              label="Copilot response"
              value={formatMs(summary?.responseTime?.avgFirstResponseMs)}
              icon={FiHeadphones}
              subtitle={`Active: ${summary?.responseTime?.activeHandoffs ?? 0} · Resolved: ${summary?.responseTime?.resolvedHandoffs ?? 0}`}
            />
            <KpiCard
              label="WA delivery"
              value={summary?.whatsappDelivery?.delivered ?? '—'}
              icon={FiSend}
              subtitle={`Recipients: ${summary?.whatsappDelivery?.totalRecipients ?? '—'}`}
            />
          </section>

          <ChartContainer title="Canonical lifecycle funnel" icon={FiBarChart2}>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'rate' ? formatPct(value) : value,
                      name === 'rate' ? '% of leads' : 'Count',
                    ]}
                  />
                  <Bar dataKey="count" fill="#1e40af" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-4 font-medium">Transition</th>
                    <th className="py-2 pr-4 font-medium">Median duration</th>
                    <th className="py-2 font-medium">Sample</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.funnelSnapshot?.transitions || []).map((row) => (
                    <tr key={`${row.from}-${row.to}`} className="border-b border-slate-100">
                      <td className="py-2 pr-4">
                        {STAGE_LABELS[row.from]} → {STAGE_LABELS[row.to]}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">{formatMs(row.medianMs)}</td>
                      <td className="py-2 tabular-nums">{row.sampleSize}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartContainer>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Drill-down</h2>
              <button
                type="button"
                onClick={() => setShowValidation((v) => !v)}
                className="text-xs font-medium text-primary-blue-700 hover:underline"
              >
                {showValidation ? 'Hide' : 'Show'} validation report
              </button>
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {deepLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-primary-blue-300 hover:bg-slate-50"
                  >
                    <FiExternalLink className="shrink-0 text-slate-400" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {showValidation ? (
              <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                {validationLoading ? (
                  <p className="text-xs text-slate-500">Loading validation report…</p>
                ) : validation ? (
                  <>
                <p className="text-xs text-slate-600">
                  Alignment: {validation.meta?.alignedCount ?? 0} /{' '}
                  {validation.meta?.totalComparisons ?? 0} ({validation.meta?.alignmentPct ?? 0}%)
                  {validation.meta?.intentionalDifferenceCount ? (
                    <span className="text-slate-500">
                      {' '}
                      · {validation.meta.intentionalDifferenceCount} intentional differences documented
                    </span>
                  ) : null}
                </p>
                {['registration', 'oneOnOne', 'bda'].map((key) => {
                  const block = validation[key];
                  if (!block?.comparisons?.length) return null;
                  return (
                    <div key={key}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {key}
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                          <thead>
                            <tr className="text-slate-500">
                              <th className="py-1 pr-3">Metric</th>
                              <th className="py-1 pr-3">Legacy</th>
                              <th className="py-1 pr-3">Lifecycle</th>
                              <th className="py-1 pr-3">Delta</th>
                              <th className="py-1">OK</th>
                            </tr>
                          </thead>
                          <tbody>
                            {block.comparisons.map((row) => (
                              <tr key={row.label} className="border-t border-slate-100">
                                <td className="py-1.5 pr-3 text-slate-800">{row.label}</td>
                                <td className="py-1.5 pr-3 tabular-nums">{row.legacy}</td>
                                <td className="py-1.5 pr-3 tabular-nums">{row.lifecycle}</td>
                                <td className="py-1.5 pr-3 tabular-nums">{row.delta}</td>
                              <td className="py-1.5">{row.aligned ? '✓' : row.intentionalDifference ? '≈' : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
                  </>
                ) : (
                  <p className="text-xs text-slate-500">Validation report unavailable.</p>
                )}
              </div>
            ) : null}
          </section>
        </>
      )}
    </DashboardLayout>
  );
}
