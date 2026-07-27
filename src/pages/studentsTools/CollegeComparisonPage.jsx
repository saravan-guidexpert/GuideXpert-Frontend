import { useEffect, useMemo, useRef, useState } from 'react';
import { FiAlertCircle, FiColumns, FiLoader } from 'react-icons/fi';
import { LuSearch, LuRocket, LuZap, LuMapPin, LuSparkles } from 'react-icons/lu';
import ToolWorkspaceLayout from './components/ToolWorkspaceLayout';
import ToolFactsPreview from './components/ToolFactsPreview';
import { useStudentAuth } from '../../contexts/StudentAuthContext';
import { useRequireLoginToUse } from '../../components/studentAuth/RequireStudentAuth';
import { compareCollegesPublic, searchCollegeComparisonOptions } from '../../utils/api';
import {
  swBtnPrimary,
  swBtnSecondary,
  swError,
  swErrorBox,
  swInsightsPanel,
  swInput,
  swLabel,
  swMetricBetter,
  swResultCard,
  swResultsHighlight,
  swSectionSubtitle,
  swSectionTitle,
  swFormSubtitle,
  swFormTitle,
} from './components/studentWorkspaceUi';

function VsBadge({ className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#041e30] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white ${className}`}
    >
      VS
    </span>
  );
}

const RELATED = [
  {
    title: 'College Predictor',
    description: 'Shortlist colleges that match your rank, category, and preferences.',
    to: '/students/college-predictor',
    icon: LuSearch,
    iconClass: 'bg-rose-50 text-rose-600',
  },
  {
    title: 'Branch Predictor',
    description: 'See which branches you can get at your target institutions.',
    to: '/students/branch-predictor',
    icon: LuRocket,
    iconClass: 'bg-violet-50 text-violet-600',
  },
  {
    title: 'Exam Predictor',
    description: 'Suggest suitable exams based on your profile and strengths.',
    to: '/students/exam-predictor',
    icon: LuZap,
    iconClass: 'bg-amber-50 text-amber-600',
  },
  {
    title: 'College Fit Test',
    description: 'Find campuses that match your lifestyle, budget, and goals.',
    to: '/students/college-fit-test',
    icon: LuMapPin,
    iconClass: 'bg-sky-50 text-sky-600',
  },
];

export default function CollegeComparisonPage() {
  const { savePrediction, session } = useStudentAuth() || {};
  const requireLoginToUse = useRequireLoginToUse();
  const [form, setForm] = useState({
    institutionA: '',
    institutionB: '',
    institutionAId: '',
    institutionBId: '',
  });
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [suggestions, setSuggestions] = useState({ institutionA: [], institutionB: [] });
  const [activeField, setActiveField] = useState(null);
  const resultsRef = useRef(null);
  const blurTimerRef = useRef(null);

  const selectedPairKey = useMemo(() => {
    if (!result?.institutionA?.id || !result?.institutionB?.id) return '';
    return `${result.institutionA.id}::${result.institutionB.id}`;
  }, [result]);

  useEffect(() => {
    const controller = { cancelled: false };
    const fields = ['institutionA', 'institutionB'];
    fields.forEach((field) => {
      const query = form[field];
      const selectedId = form[`${field}Id`];
      if (selectedId) return;
      if (!query || !String(query).trim()) {
        setSuggestions((prev) => ({ ...prev, [field]: [] }));
        return;
      }
      const timer = setTimeout(async () => {
        const response = await searchCollegeComparisonOptions(query, 8);
        if (controller.cancelled) return;
        const options = response.success ? response.data?.options || [] : [];
        setSuggestions((prev) => ({ ...prev, [field]: options }));

        const exact = options.find(
          (option) =>
            option.name.toLowerCase() === String(query).trim().toLowerCase() ||
            option.shortName?.toLowerCase() === String(query).trim().toLowerCase()
        );
        if (exact) {
          setForm((prev) => {
            if (prev[`${field}Id`]) return prev;
            return {
              ...prev,
              [field]: exact.name,
              [`${field}Id`]: exact.id,
            };
          });
          setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
      }, 150);
      controller[`${field}Timer`] = timer;
    });
    return () => {
      controller.cancelled = true;
      if (controller.institutionATimer) clearTimeout(controller.institutionATimer);
      if (controller.institutionBTimer) clearTimeout(controller.institutionBTimer);
    };
  }, [form.institutionA, form.institutionAId, form.institutionB, form.institutionBId]);

  const onFieldChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      [`${field}Id`]: '',
    }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setApiError('');
  };

  const onSelectOption = (field, option) => {
    setForm((prev) => ({
      ...prev,
      [field]: option.name,
      [`${field}Id`]: option.id,
    }));
    setSuggestions((prev) => ({ ...prev, [field]: [] }));
    setActiveField(null);
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const resolveFieldSelection = async (field, typedValue) => {
    const currentId = form[`${field}Id`];
    const query = String(typedValue || '').trim();
    if (currentId) {
      return { id: currentId, name: form[field] || query };
    }
    if (!query) return null;

    const cached = suggestions[field] || [];
    const exactCached = cached.find(
      (option) =>
        option.name.toLowerCase() === query.toLowerCase() ||
        option.shortName?.toLowerCase() === query.toLowerCase() ||
        option.id.toLowerCase() === query.toLowerCase()
    );
    if (exactCached) return exactCached;
    if (cached.length === 1) return cached[0];

    const response = await searchCollegeComparisonOptions(query, 8);
    const options = response.success ? response.data?.options || [] : [];
    const exact = options.find(
      (option) =>
        option.name.toLowerCase() === query.toLowerCase() ||
        option.shortName?.toLowerCase() === query.toLowerCase() ||
        option.id.toLowerCase() === query.toLowerCase()
    );
    if (exact) return exact;
    if (options.length === 1) return options[0];

    // Free-text college: backend will resolve / build a profile.
    return { id: '', name: query };
  };

  const validate = (resolvedA, resolvedB) => {
    const nextErrors = {};
    if (!resolvedA?.name?.trim()) {
      nextErrors.institutionA = 'Enter a college name (pick a suggestion or type any college).';
    }
    if (!resolvedB?.name?.trim()) {
      nextErrors.institutionB = 'Enter a second college name (pick a suggestion or type any college).';
    }
    if (
      resolvedA?.id &&
      resolvedB?.id &&
      resolvedA.id === resolvedB.id
    ) {
      nextErrors.institutionB = 'Choose a different second college.';
    } else if (
      resolvedA?.name &&
      resolvedB?.name &&
      resolvedA.name.trim().toLowerCase() === resolvedB.name.trim().toLowerCase()
    ) {
      nextErrors.institutionB = 'Choose a different second college.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const runComparison = async (includeSummary = false, resolvedA, resolvedB) => {
    const payload = {
      collegeAId: resolvedA?.id || form.institutionAId || result?.institutionA?.id || '',
      collegeBId: resolvedB?.id || form.institutionBId || result?.institutionB?.id || '',
      collegeAName: resolvedA?.name || form.institutionA || result?.institutionA?.name || '',
      collegeBName: resolvedB?.name || form.institutionB || result?.institutionB?.name || '',
      includeSummary,
      phone: session?.phone || '',
      fullName: session?.fullName || '',
    };
    const response = await compareCollegesPublic(payload);
    if (!response.success) {
      throw new Error(
        response?.data?.response || response?.message || 'Could not compare these colleges right now.'
      );
    }
    return response.data;
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!requireLoginToUse()) return;
    setLoading(true);
    setApiError('');
    try {
      const [resolvedA, resolvedB] = await Promise.all([
        resolveFieldSelection('institutionA', form.institutionA),
        resolveFieldSelection('institutionB', form.institutionB),
      ]);
      if (resolvedA?.id) onSelectOption('institutionA', resolvedA);
      if (resolvedB?.id) onSelectOption('institutionB', resolvedB);
      if (!validate(resolvedA, resolvedB)) return;

      const comparison = await runComparison(false, resolvedA, resolvedB);
      setResult(comparison);
      savePrediction?.({
        type: 'college_comparison',
        tool: 'College Comparison',
        title: 'Compared colleges',
        summary: `${comparison.institutionA.name} vs ${comparison.institutionB.name}`,
        payload: comparison,
      });
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        resultsRef.current?.focus({ preventScroll: true });
      }, 60);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const onGenerateSummary = async () => {
    if (!result || summaryLoading) return;
    setSummaryLoading(true);
    setApiError('');
    try {
      const comparison = await runComparison(true);
      if (!comparison.summary) {
        setApiError('AI summary is unavailable until the backend LLM env is configured.');
        return;
      }
      if (`${comparison.institutionA.id}::${comparison.institutionB.id}` === selectedPairKey) {
        setResult(comparison);
      }
    } catch (error) {
      setApiError(error.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const truncateLabel = (s, max = 14) => {
    const t = (s || '').trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max)}…`;
  };

  const renderMetricTable = (rows, aName, bName) => (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e4e9f0] text-left">
              <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a94a0]">
                Metric
              </th>
              <th
                className="max-w-40 px-3 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a94a0]"
                title={aName}
              >
                {truncateLabel(aName, 18)}
              </th>
              <th
                className="max-w-40 px-3 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a94a0]"
                title={bName}
              >
                {truncateLabel(bName, 18)}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.metric || row.factor} className="border-b border-[#f0f3f7]">
                <td className="px-3 py-3.5 font-semibold text-[#041e30]">
                  {row.metric || row.factor}
                </td>
                <td
                  className={`px-3 py-3.5 ${
                    row.better === 'a' || row.edge === 'A'
                      ? 'bg-[#fff4ed] font-semibold text-[#c45a0c]'
                      : 'text-[#5a6570]'
                  }`}
                >
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {row.aValue || row.collegeA}
                    {row.better === 'a' || row.edge === 'A' ? (
                      <span className={swMetricBetter}>Better</span>
                    ) : null}
                    {row.better === 'tie' || row.edge === 'Tie' ? (
                      <span className={swMetricBetter}>Tie</span>
                    ) : null}
                  </span>
                </td>
                <td
                  className={`px-3 py-3.5 ${
                    row.better === 'b' || row.edge === 'B'
                      ? 'bg-[#fff4ed] font-semibold text-[#c45a0c]'
                      : 'text-[#5a6570]'
                  }`}
                >
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {row.bValue || row.collegeB}
                    {row.better === 'b' || row.edge === 'B' ? (
                      <span className={swMetricBetter}>Better</span>
                    ) : null}
                    {row.better === 'tie' || row.edge === 'Tie' ? (
                      <span className={swMetricBetter}>Tie</span>
                    ) : null}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden" aria-label="Comparison by metric">
        {rows.map((row) => (
          <li key={row.metric || row.factor} className="rounded-xl bg-[#f8fafc] p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a94a0]">
              {row.metric || row.factor}
            </p>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <div
                className={`min-w-0 flex-1 rounded-xl px-2 py-2 text-center text-sm ${
                  row.better === 'a' || row.edge === 'A'
                    ? 'bg-[#fff4ed] font-semibold text-[#c45a0c]'
                    : 'bg-white'
                }`}
              >
                <span className="block text-[10px] uppercase text-[#8a94a0]">A</span>
                <span className="tabular-nums">{row.aValue || row.collegeA}</span>
              </div>
              <VsBadge className="scale-90" />
              <div
                className={`min-w-0 flex-1 rounded-xl px-2 py-2 text-center text-sm ${
                  row.better === 'b' || row.edge === 'B'
                    ? 'bg-[#fff4ed] font-semibold text-[#c45a0c]'
                    : 'bg-white'
                }`}
              >
                <span className="block text-[10px] uppercase text-[#8a94a0]">B</span>
                <span className="tabular-nums">{row.bValue || row.collegeB}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );

  const renderCollegeField = (field, label, placeholder) => {
    const fieldErrors = errors[field];
    const fieldSuggestions = suggestions[field] || [];
    return (
      <label className={`block min-w-0 ${swLabel} relative`}>
        {label}
        <input
          value={form[field]}
          onChange={(e) => onFieldChange(field, e.target.value)}
          onFocus={() => {
            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
            setActiveField(field);
          }}
          onBlur={() => {
            blurTimerRef.current = setTimeout(() => setActiveField(null), 120);
          }}
          className={swInput}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={!!fieldErrors}
        />
        {activeField === field && fieldSuggestions.length > 0 ? (
          <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-[#dce3ec] bg-white shadow-lg">
            {fieldSuggestions.map((option) => (
              <button
                key={option.id}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelectOption(field, option);
                }}
                className="block w-full border-b border-[#eef2f7] px-4 py-3 text-left last:border-b-0 hover:bg-[#fff8f3]"
              >
                <span className="block text-sm font-semibold text-[#041e30]">{option.name}</span>
                <span className="mt-0.5 block text-xs text-[#667085]">
                  {option.city}, {option.state} · {option.ownership}
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {activeField === field &&
        form[field]?.trim() &&
        !form[`${field}Id`] &&
        fieldSuggestions.length === 0 ? (
          <p className="mt-1.5 text-xs text-[#667085]">
            No catalog match yet — you can still compare this free-text name.
          </p>
        ) : null}
        {fieldErrors ? <span className={swError}>{fieldErrors}</span> : null}
      </label>
    );
  };

  return (
    <ToolWorkspaceLayout
      title="College Comparison"
      subtitle="Compare two institutions side-by-side and identify the stronger value choice."
      howItWorks={[
        'Search a college from suggestions, or type any college name as free text.',
        'Core metrics are compared first; free-text names are resolved when needed.',
        'Ask for an AI table only after results load if you want a compact trade-off view.',
      ]}
      whatThisToolDoes={[
        'Compares two colleges on placements, fees, ROI, branch breadth, ranking signals, and approvals.',
        'Highlights the stronger option per metric so trade-offs are easier to see.',
        'Supports final shortlisting after College Predictor and Branch Predictor.',
      ]}
      inputGuide={[
        'College A: Pick from suggestions or type any college name.',
        'College B: Pick a different college the same way.',
        'Review the matrix first, then request an AI table only if you need a quick recommendation.',
      ]}
      preview={
        <ToolFactsPreview
          icon={FiColumns}
          iconClass="bg-[#e8f1f8] text-[#0b3a5c]"
          name="College Comparison"
          metricLabel="Comparison covers"
          metricValue="Side-by-side"
          points={[
            'Placements, fees, ROI, and approvals',
            'Deterministic rows first to keep API cost low',
            'Optional short AI summary after the main result',
          ]}
        />
      }
      relatedTools={RELATED}
      results={
        result ? (
          <section ref={resultsRef} tabIndex={-1} className={swResultsHighlight}>
            <h2 className={swSectionTitle}>Comparison results</h2>
            <p className={swSectionSubtitle}>
              All comparison data is shown in tables. Highlighted cells mark the stronger option.
            </p>
            <div className={`mt-6 ${swResultCard}`}>
              <div className="mb-5 flex flex-wrap items-center justify-center gap-3 text-center">
                <span
                  className="max-w-48 truncate font-sw-display text-base font-bold text-[#041e30]"
                  title={result.institutionA.name}
                >
                  {result.institutionA.name}
                </span>
                <VsBadge />
                <span
                  className="max-w-48 truncate font-sw-display text-base font-bold text-[#041e30]"
                  title={result.institutionB.name}
                >
                  {result.institutionB.name}
                </span>
              </div>

              {renderMetricTable(
                result.rows,
                result.institutionA.name,
                result.institutionB.name
              )}

              <div className="mt-6 rounded-2xl border border-[#e4e9f0] bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-sw-display text-base font-bold text-[#041e30]">
                      AI comparison table
                    </h3>
                    <p className="mt-1 text-sm text-[#5a6570]">
                      Optional AI view in the same tabular format.
                    </p>
                  </div>
                  {!result.summary ? (
                    <button
                      type="button"
                      onClick={onGenerateSummary}
                      disabled={summaryLoading}
                      className={swBtnSecondary}
                    >
                      {summaryLoading ? (
                        <FiLoader className="h-4 w-4 animate-spin" />
                      ) : (
                        <LuSparkles className="h-4 w-4" />
                      )}
                      {summaryLoading ? 'Generating...' : 'Get AI table'}
                    </button>
                  ) : null}
                </div>

                {result.summary?.rows?.length ? (
                  <div className="mt-4 space-y-4">
                    {renderMetricTable(
                      result.summary.rows,
                      result.institutionA.name,
                      result.institutionB.name
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#e4e9f0] text-left">
                            <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a94a0]">
                              Profile fit
                            </th>
                            <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a94a0]">
                              Recommendation
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-[#f0f3f7]">
                            <td className="px-3 py-3.5 font-semibold text-[#041e30]">
                              Prefer {result.institutionA.name}
                            </td>
                            <td className="px-3 py-3.5 text-[#5a6570]">
                              {result.summary.whoShouldPreferA}
                            </td>
                          </tr>
                          <tr>
                            <td className="px-3 py-3.5 font-semibold text-[#041e30]">
                              Prefer {result.institutionB.name}
                            </td>
                            <td className="px-3 py-3.5 text-[#5a6570]">
                              {result.summary.whoShouldPreferB}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-relaxed text-[#667085]">
                    Skip this if the main table is enough. This keeps API cost low.
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : null
      }
      insights={
        result ? (
          <section className={swInsightsPanel}>
            <h3 className={swSectionTitle}>Next steps</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-[#5a6570]">
              <li className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#f27921]" aria-hidden />
                If budget is tight, prioritize the lower-fee option unless the placement and ROI gap is significant.
              </li>
              <li className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#f27921]" aria-hidden />
                Use this matrix with branch preference, city fit, and your exam-based shortlist before finalizing.
              </li>
            </ul>
          </section>
        ) : null
      }
      afterHero={
        !result ? (
          <section className="rounded-2xl border border-[#e4e9f0] bg-white/90 px-6 py-8 sm:px-8 sm:py-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f27921]">
                  How comparison works
                </p>
                <h2 className={`mt-2 ${swSectionTitle}`}>A clearer side-by-side view</h2>
                <p className={swSectionSubtitle}>
                  Select from the expanded college list or type any college name. Free-text colleges are
                  resolved automatically, then compared on packages, placements, fees, ROI, and ranking
                  signals.
                </p>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#041e30] text-white">
                <FiColumns className="h-6 w-6" aria-hidden />
              </div>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {[
                { label: 'Packages & placements', detail: 'Spot which campus leads on outcomes.' },
                { label: 'Fees & ROI', detail: 'Balance yearly cost against likely value.' },
                { label: 'Decision-ready', detail: 'See deterministic rows before using any AI.' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-[#f7f9fc] px-4 py-4">
                  <p className="text-sm font-semibold text-[#041e30]">{item.label}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#5a6570]">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null
      }
    >
      <div>
        <h2 className={swFormTitle}>Compare two institutions</h2>
        <p className={swFormSubtitle}>
          Search the catalog or type any college name. Unknown names are resolved as free text.
        </p>
      </div>

      <form className="mt-8 space-y-7" onSubmit={onSubmit} noValidate>
        {apiError ? (
          <div className={`${swErrorBox} flex items-start gap-2.5`}>
            <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        ) : null}
        <div className="flex flex-col gap-7 md:grid md:grid-cols-[1fr_auto_1fr] md:items-end md:gap-5">
          {renderCollegeField('institutionA', 'Institution A', 'e.g. IIIT Hyderabad')}

          <div className="flex justify-center md:pb-1.5">
            <VsBadge />
          </div>

          {renderCollegeField('institutionB', 'Institution B', 'e.g. NIT Trichy')}
        </div>

        <button type="submit" disabled={loading} className={swBtnPrimary}>
          {loading ? <FiLoader className="h-4 w-4 animate-spin" /> : null}
          {loading ? 'Running comparison...' : 'Run comparison'}
        </button>
      </form>
    </ToolWorkspaceLayout>
  );
}
