import { Link, useLocation } from 'react-router-dom';
import {
  FiHome,
  FiCheck,
  FiFilter,
  FiLayers,
  FiTarget,
  FiChevronRight,
} from 'react-icons/fi';
import { LAYOUT } from '../../../components/studentDashboard/careers360/careers360Theme';
import {
  swPageShell,
} from './studentWorkspaceUi';
import RelatedToolsSection from './RelatedToolsSection';
import ToolPageVisual from './ToolPageVisual';

const FEATURE_ICONS = [FiLayers, FiFilter, FiTarget];
const FEATURE_ICON_STYLES = [
  'bg-[#fff4ed] text-[#f27921]',
  'bg-[#eef2f7] text-[#041e30]',
  'bg-[#e8f1f8] text-[#0b3a5c]',
];

const DEFAULT_STEP_TITLES = ['Match criteria', 'Apply filters', 'Score chances'];

/** Shared title scale across DualCards + Features heroes */
const HERO_TITLE =
  'font-sw-display text-[1.65rem] font-bold leading-[1.18] tracking-tight text-[#041e30] sm:text-3xl sm:leading-[1.15] lg:text-[2.15rem]';
const HERO_SUBTITLE =
  'mt-2 max-w-xl text-[15px] leading-relaxed text-[#5a6570] sm:mt-2.5 sm:text-base';
/** Shared form column width */
const HERO_GRID =
  'grid items-start gap-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-6 xl:gap-8';

const BREADCRUMB_CATEGORY = {
  '/students/college-predictor': {
    label: 'College Predictors',
    to: '/students/predictors',
  },
  '/students/branch-predictor': {
    label: 'College Predictors',
    to: '/students/predictors',
  },
  '/students/exam-predictor': {
    label: 'College Predictors',
    to: '/students/predictors',
  },
  '/students/college-comparison': {
    label: 'Compare',
    to: '/students/college-comparison',
  },
  '/students/rank-predictor': {
    label: 'Rank Predictors',
    to: '/students/rank-predictor',
  },
  '/students/course-fit-test': { label: 'Fit Tests', to: '/students/tests' },
  '/students/college-fit-test': { label: 'Fit Tests', to: '/students/tests' },
  '/students/deadline-manager': {
    label: 'Deadlines',
    to: '/students/deadline-manager',
  },
};

function resolveBreadcrumbCategory(pathname) {
  if (BREADCRUMB_CATEGORY[pathname]) return BREADCRUMB_CATEGORY[pathname];
  if (pathname.startsWith('/students/rank-predictor/')) {
    return BREADCRUMB_CATEGORY['/students/rank-predictor'];
  }
  return { label: 'Predictors & Tools', to: '/students/predictors' };
}

function featureItems({ howItWorks, whatThisToolDoes }) {
  const defaultTitles = ['Detailed Criteria', 'Personalized Report', 'Comprehensive Coverage'];

  if (howItWorks?.length) {
    return howItWorks.slice(0, 3).map((item, index) => {
      if (item && typeof item === 'object') {
        return {
          title: item.title || defaultTitles[index] || `Highlight ${index + 1}`,
          detail: item.detail || item.description || '',
        };
      }
      return {
        title: defaultTitles[index] || `Highlight ${index + 1}`,
        detail: item,
      };
    });
  }
  if (whatThisToolDoes?.length) {
    return whatThisToolDoes.slice(0, 3).map((text, index) => {
      const [head, ...rest] = String(text).split(/[.!]/);
      const title = head?.trim() || defaultTitles[index];
      const detail = rest.join('.').trim() || text;
      return { title, detail };
    });
  }
  return [
    { title: 'Detailed Criteria', detail: 'Rank, quota & category based.' },
    { title: 'Personalized Report', detail: 'Filter by branch, fees, location & more.' },
    { title: 'Comprehensive Coverage', detail: 'All India & state-level colleges.' },
  ];
}

function predictionSteps(howItWorks) {
  if (!howItWorks?.length) {
    return DEFAULT_STEP_TITLES.map((title, index) => ({
      title,
      detail:
        index === 0
          ? 'Your rank and category are matched against historical opening and closing ranks.'
          : index === 1
            ? 'Home state and counselling filters narrow the pool to relevant options.'
            : 'Each match is tagged with an estimated admission chance from live cutoffs.',
    }));
  }
  return howItWorks.slice(0, 3).map((item, index) => {
    if (item && typeof item === 'object') {
      return {
        title: item.title || DEFAULT_STEP_TITLES[index] || `Step ${index + 1}`,
        detail: item.detail || item.description || '',
      };
    }
    return {
      title: DEFAULT_STEP_TITLES[index] || `Step ${index + 1}`,
      detail: String(item),
    };
  });
}

function BreadcrumbNav({ category, title }) {
  return (
    <nav
      className="sw-fade-up mb-6 flex flex-wrap items-center gap-1.5 text-[13px] text-[#667085] sm:mb-8"
      aria-label="Breadcrumb"
    >
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-[#667085] transition hover:text-[#f27921]"
      >
        <FiHome className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">Home</span>
      </Link>
      <FiChevronRight className="h-3.5 w-3.5 opacity-40" aria-hidden />
      <Link to={category.to} className="text-[#667085] transition hover:text-[#f27921]">
        {category.label}
      </Link>
      <FiChevronRight className="h-3.5 w-3.5 opacity-40" aria-hidden />
      <span className="font-medium text-[#041e30]">{title}</span>
    </nav>
  );
}

function splitGuideItem(item) {
  const text = String(item || '').trim();
  const match = text.match(/^([^:]{1,48}):\s+(.+)$/);
  if (match) {
    return { label: match[1].trim(), detail: match[2].trim() };
  }
  return { label: null, detail: text };
}

function ToolInfoSection({ title, whatThisToolDoes, inputGuide, preview, pathname }) {
  const hasWhat = Array.isArray(whatThisToolDoes) && whatThisToolDoes.length > 0;
  const hasGuide = Array.isArray(inputGuide) && inputGuide.length > 0;
  const hasPreview = Boolean(preview);
  if (!hasWhat && !hasGuide && !hasPreview) return null;

  const bodyCols = [hasWhat, hasGuide].filter(Boolean).length;

  return (
    <section className="sw-fade-up" aria-labelledby="tool-info-heading">
      <div className="overflow-hidden rounded-[1.35rem] border border-[#e5e7eb] bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.28)]">
        {/* Masthead */}
        <div className="relative overflow-hidden border-b border-[#eef0f3] bg-gradient-to-br from-[#fff8f3] via-[#fbfcfe] to-white px-5 py-6 sm:px-7 sm:py-7 lg:px-8">
          <div
            className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#f27921]/10 blur-2xl"
            aria-hidden
          />
          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,18rem)] lg:items-start lg:gap-10">
            <header className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f27921]/20 bg-white/80 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f27921]" aria-hidden />
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f27921]">
                  About this tool
                </p>
              </div>
              <h2
                id="tool-info-heading"
                className="mt-4 font-sw-display text-2xl font-bold tracking-tight text-[#041e30] sm:text-[1.85rem]"
              >
                {title || 'How this predictor works'}
              </h2>
              <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-[#5a6570]">
                Coverage, inputs, and score bounds — so you know exactly what this predictor delivers.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {hasWhat ? (
                  <span className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-[11px] font-semibold text-[#667085]">
                    Capabilities
                  </span>
                ) : null}
                {hasGuide ? (
                  <span className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-[11px] font-semibold text-[#667085]">
                    Step-by-step use
                  </span>
                ) : null}
                {hasPreview ? (
                  <span className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-[11px] font-semibold text-[#667085]">
                    Score bounds
                  </span>
                ) : null}
              </div>
            </header>

            {hasPreview ? (
              <aside className="min-w-0 lg:pt-1">{preview}</aside>
            ) : null}
          </div>
        </div>

        {/* Body */}
        {bodyCols > 0 ? (
          <div className="grid items-stretch gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]">
            <div
              className={`min-w-0 grid gap-0 ${
                bodyCols === 2 ? 'md:grid-cols-2' : ''
              }`}
            >
              {hasWhat ? (
                <div className="min-w-0 border-b border-[#eef0f3] p-5 sm:p-6 md:border-b-0 md:border-r md:border-[#eef0f3]">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff4ed] font-sw-display text-sm font-bold tabular-nums text-[#f27921]">
                      01
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold tracking-tight text-[#041e30] sm:text-base">
                        What this tool does
                      </h3>
                      <p className="mt-0.5 text-xs text-[#8a94a0]">Core outcomes</p>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {whatThisToolDoes.map((item, index) => (
                      <li
                        key={item}
                        className="rounded-xl border border-[#eef0f3] bg-[#fafbfc] px-3.5 py-3.5 transition hover:border-[#f27921]/25 hover:bg-white"
                      >
                        <div className="flex gap-3">
                          <span
                            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#041e30] text-[10px] font-bold tabular-nums text-white"
                            aria-hidden
                          >
                            {index + 1}
                          </span>
                          <p className="text-sm leading-relaxed text-[#3d4754]">{item}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {hasGuide ? (
                <div className="min-w-0 border-b border-[#eef0f3] p-5 sm:p-6 lg:border-b-0">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef2f7] font-sw-display text-sm font-bold tabular-nums text-[#041e30]">
                      {hasWhat ? '02' : '01'}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold tracking-tight text-[#041e30] sm:text-base">
                        How to use it
                      </h3>
                      <p className="mt-0.5 text-xs text-[#8a94a0]">Quick workflow</p>
                    </div>
                  </div>
                  <ol className="relative space-y-0 border-l border-[#e8eaed] pl-5">
                    {inputGuide.map((item, index) => {
                      const { label, detail } = splitGuideItem(item);
                      return (
                        <li key={item} className="relative pb-5 last:pb-0">
                          <span
                            className="absolute -left-[1.55rem] top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#f27921] text-[10px] font-bold tabular-nums text-white shadow-sm"
                            aria-hidden
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0 rounded-xl border border-[#eef0f3] bg-white px-3.5 py-3 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
                            {label ? (
                              <>
                                <p className="text-sm font-semibold text-[#041e30]">{label}</p>
                                <p className="mt-1 text-sm leading-relaxed text-[#5a6570]">
                                  {detail}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm leading-relaxed text-[#5a6570]">{detail}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : null}
            </div>

            <aside className="min-w-0 border-t border-[#eef0f3] bg-[#fafbfc] p-5 sm:p-6 lg:border-t-0 lg:border-l lg:border-[#eef0f3]">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a94a0]">
                Visual guide
              </p>
              <ToolPageVisual pathname={pathname} />
            </aside>
          </div>
        ) : (
          <div className="bg-[#fafbfc] p-5 sm:p-6">
            <ToolPageVisual pathname={pathname} className="max-w-md" />
          </div>
        )}
      </div>
    </section>
  );
}

function DualCardsHero({
  title,
  subtitle,
  trustBadge,
  trustSubline,
  howItWorks,
  children,
  category,
}) {
  const steps = predictionSteps(howItWorks);

  return (
    <>
      <BreadcrumbNav category={category} title={title} />

      <div className="sw-fade-up mb-6 flex flex-col gap-4 sm:mb-8 sm:gap-5 lg:mb-10 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="min-w-0 max-w-2xl">
          <div className="flex gap-3 sm:gap-4">
            <span
              className="mt-1.5 h-[2.5rem] w-1 shrink-0 rounded-full bg-[#f27921] sm:h-[3rem]"
              aria-hidden
            />
            <div className="min-w-0">
              <h1 className={HERO_TITLE}>{title}</h1>
              {subtitle ? <p className={HERO_SUBTITLE}>{subtitle}</p> : null}
            </div>
          </div>
        </div>

        {trustBadge ? (
          <div className="shrink-0 border-t border-[#e8eaed] pt-3 text-left sm:border-0 sm:pt-0 lg:max-w-[14rem] lg:pb-1 lg:text-right">
            <p className="text-sm font-semibold text-[#041e30]">{trustBadge}</p>
            {trustSubline ? (
              <p className="mt-1 text-xs leading-relaxed text-[#667085]">{trustSubline}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={HERO_GRID}>
        <div className="order-1 sw-fade-up sw-fade-up-delay-1 w-full min-w-0">
          <div className="sw-gx-form-rail w-full min-w-0">
            <div className="w-full min-w-0">{children}</div>
          </div>
        </div>

        <aside className="order-2 sw-fade-up sw-fade-up-delay-2 w-full min-w-0 self-start">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a94a0]">
            How predictions work
          </p>
          <div className="sw-gx-signal-steps overflow-hidden">
            {steps.map((step, index) => (
              <div key={`${step.title}-${index}`} className="sw-gx-signal-step">
                <span className="font-sw-display text-2xl font-bold tabular-nums leading-none text-[#f27921] sm:text-[1.65rem]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="sw-gx-step-title text-[15px] font-semibold sm:text-base">
                    {step.title}
                  </p>
                  <p className="sw-gx-step-detail mt-1.5 text-sm leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

function FeaturesHero({ title, subtitle, trustBadge, features, children, category }) {
  return (
    <>
      <BreadcrumbNav category={category} title={title} />

      <div className="sw-fade-up mb-6 flex flex-col gap-4 sm:mb-8 sm:gap-5 lg:mb-10 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="min-w-0 max-w-2xl">
          <div className="flex gap-3 sm:gap-4">
            <span
              className="mt-1.5 h-[2.5rem] w-1 shrink-0 rounded-full bg-[#f27921] sm:h-[3rem]"
              aria-hidden
            />
            <div className="min-w-0">
              {trustBadge ? (
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#ecfdf5] px-2.5 py-1 text-[11px] font-semibold text-[#047857]">
                  <FiCheck className="h-3 w-3" strokeWidth={3} aria-hidden />
                  {trustBadge}
                </p>
              ) : null}
              <h1 className={HERO_TITLE}>{title}</h1>
              {subtitle ? <p className={HERO_SUBTITLE}>{subtitle}</p> : null}
            </div>
          </div>
        </div>
      </div>

      <div className={HERO_GRID}>
        <div className="order-1 sw-fade-up sw-fade-up-delay-1 w-full min-w-0">
          <div className="sw-gx-form-rail w-full min-w-0">
            <div className="w-full min-w-0">{children}</div>
          </div>
        </div>

        <aside className="order-2 sw-fade-up sw-fade-up-delay-2 w-full min-w-0 self-start">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a94a0]">
            Highlights
          </p>
          <ul className="sw-gx-signal-steps overflow-hidden">
            {features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length];
              const iconStyle = FEATURE_ICON_STYLES[index % FEATURE_ICON_STYLES.length];
              return (
                <li key={`${feature.title}-${index}`} className="sw-gx-signal-step">
                  <span
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="sw-gx-step-title text-[15px] font-semibold sm:text-base">
                      {feature.title}
                    </p>
                    <p className="sw-gx-step-detail mt-1.5 text-sm leading-relaxed">
                      {feature.detail}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </>
  );
}

export default function ToolWorkspaceLayout({
  title,
  subtitle,
  howItWorks,
  children,
  results,
  insights,
  whatThisToolDoes,
  trustBadge = 'Trusted by 500K+ Students',
  trustSubline = 'Built on multi-year cutoff trends',
  relatedTools,
  showRelatedTools = true,
  preview = null,
  inputGuide = null,
  compactHero = true,
  afterHero = null,
}) {
  const { pathname } = useLocation();
  const category = resolveBreadcrumbCategory(pathname);
  const features = featureItems({ howItWorks, whatThisToolDoes });
  const hasInfo =
    (Array.isArray(whatThisToolDoes) && whatThisToolDoes.length > 0) ||
    (Array.isArray(inputGuide) && inputGuide.length > 0) ||
    Boolean(preview);
  const infoSection = hasInfo ? (
    <ToolInfoSection
      title={title}
      whatThisToolDoes={whatThisToolDoes}
      inputGuide={inputGuide}
      preview={preview}
      pathname={pathname}
    />
  ) : null;
  const hasBelowHero = Boolean(
    afterHero || infoSection || results || insights || showRelatedTools
  );

  return (
    <main className={`${swPageShell} !bg-[#f7f8fc]`}>
      <section className="sw-c360-tool-hero relative overflow-hidden !py-0">
        <div className={`relative ${LAYOUT.container} py-8 sm:py-10 lg:py-12`}>
          {compactHero ? (
            <DualCardsHero
              title={title}
              subtitle={subtitle}
              trustBadge={trustBadge}
              trustSubline={trustSubline}
              howItWorks={howItWorks}
              category={category}
            >
              {children}
            </DualCardsHero>
          ) : (
            <FeaturesHero
              title={title}
              subtitle={subtitle}
              trustBadge={trustBadge}
              features={features}
              category={category}
            >
              {children}
            </FeaturesHero>
          )}
        </div>
      </section>

      {hasBelowHero ? (
        <div className={`${LAYOUT.container} space-y-10 py-10 sm:space-y-12 sm:py-12 lg:space-y-14 lg:py-14`}>
          {afterHero}
          {results}
          {insights}
          {infoSection}
          {showRelatedTools ? <RelatedToolsSection tools={relatedTools} /> : null}
        </div>
      ) : null}
    </main>
  );
}
