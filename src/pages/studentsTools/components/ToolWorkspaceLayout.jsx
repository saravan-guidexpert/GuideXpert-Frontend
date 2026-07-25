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

const FEATURE_ICONS = [FiLayers, FiFilter, FiTarget];
const FEATURE_ICON_STYLES = [
  'bg-[#fce7f3] text-[#be185d]',
  'bg-[#dbeafe] text-[#1d4ed8]',
  'bg-[#ffedd5] text-[#c2410c]',
];

const DEFAULT_STEP_TITLES = ['Match criteria', 'Apply filters', 'Score chances'];

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
      className="sw-fade-up mb-8 flex flex-wrap items-center gap-1.5 text-[13px] !text-white/70 sm:mb-10"
      aria-label="Breadcrumb"
    >
      <Link
        to="/students"
        className="inline-flex items-center gap-1 !text-white/70 transition hover:!text-white"
      >
        <FiHome className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">Home</span>
      </Link>
      <FiChevronRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
      <Link to={category.to} className="!text-white/70 transition hover:!text-white">
        {category.label}
      </Link>
      <FiChevronRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
      <span className="font-medium !text-white">{title}</span>
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

function ToolInfoSection({ title, whatThisToolDoes, inputGuide, preview }) {
  const hasWhat = Array.isArray(whatThisToolDoes) && whatThisToolDoes.length > 0;
  const hasGuide = Array.isArray(inputGuide) && inputGuide.length > 0;
  const hasPreview = Boolean(preview);
  if (!hasWhat && !hasGuide && !hasPreview) return null;

  const bodyCols = [hasWhat, hasGuide].filter(Boolean).length;

  return (
    <section className="sw-fade-up" aria-labelledby="tool-info-heading">
      <div className="grid gap-8 border-b border-[#d5dde8] pb-8 sm:gap-10 sm:pb-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,20rem)] lg:items-end lg:gap-12">
        <header className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f27921]">
            About this tool
          </p>
          <h2
            id="tool-info-heading"
            className="mt-3 font-sw-display text-2xl font-bold tracking-tight text-[#041e30] sm:text-[1.75rem]"
          >
            {title || 'How this predictor works'}
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#5a6570]">
            What the tool covers, the inputs it needs, and the score bounds it uses.
          </p>
        </header>

        {hasPreview ? (
          <aside className="min-w-0 border-t border-[#e4e9f0] pt-5 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a94a0]">
              Tool facts
            </p>
            <div className="mt-3 text-sm leading-relaxed text-[#2c3640]">{preview}</div>
          </aside>
        ) : null}
      </div>

      {bodyCols > 0 ? (
        <div
          className={`mt-8 grid gap-10 sm:mt-10 sm:gap-12 ${
            bodyCols === 2 ? 'lg:grid-cols-2 lg:gap-16' : 'lg:grid-cols-1'
          }`}
        >
          {hasWhat ? (
            <div className="min-w-0">
              <div className="flex items-baseline gap-3">
                <span className="font-sw-display text-sm font-bold tabular-nums text-[#f27921]">
                  01
                </span>
                <h3 className="text-base font-semibold tracking-tight text-[#041e30]">
                  What this tool does
                </h3>
              </div>
              <ul className="mt-6 space-y-5 border-l border-[#e4e9f0] pl-5">
                {whatThisToolDoes.map((item) => (
                  <li key={item} className="relative">
                    <span
                      className="absolute -left-[1.41rem] top-2.5 h-2 w-2 rounded-full bg-[#f27921] ring-4 ring-[#f3f5f8]"
                      aria-hidden
                    />
                    <p className="text-[15px] leading-[1.7] text-[#3d4754]">{item}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasGuide ? (
            <div className="min-w-0">
              <div className="flex items-baseline gap-3">
                <span className="font-sw-display text-sm font-bold tabular-nums text-[#f27921]">
                  {hasWhat ? '02' : '01'}
                </span>
                <h3 className="text-base font-semibold tracking-tight text-[#041e30]">
                  How to use it
                </h3>
              </div>
              <ol className="mt-6 space-y-6">
                {inputGuide.map((item, index) => {
                  const { label, detail } = splitGuideItem(item);
                  return (
                    <li key={item} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d5dde8] bg-white text-xs font-bold tabular-nums text-[#041e30]">
                        {index + 1}
                      </span>
                      <div className="min-w-0 pt-1">
                        {label ? (
                          <>
                            <p className="text-sm font-semibold text-[#041e30]">{label}</p>
                            <p className="mt-1.5 text-[15px] leading-[1.7] text-[#3d4754]">
                              {detail}
                            </p>
                          </>
                        ) : (
                          <p className="text-[15px] leading-[1.7] text-[#3d4754]">{detail}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}
        </div>
      ) : null}
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

      <div className="sw-fade-up mb-8 flex flex-col gap-5 sm:mb-10 lg:mb-12 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="min-w-0 max-w-2xl">
          <div className="flex gap-3 sm:gap-4">
            <span
              className="mt-1.5 hidden h-[2.75rem] w-1 shrink-0 rounded-full bg-[#f27921] sm:block sm:h-[3.25rem]"
              aria-hidden
            />
            <div>
              <h1 className="font-sw-display text-[1.85rem] font-bold leading-[1.15] tracking-tight !text-white sm:text-4xl lg:text-[2.45rem]">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed !text-white/75 sm:text-base">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {trustBadge ? (
          <div className="shrink-0 text-left lg:max-w-[14rem] lg:pb-1 lg:text-right">
            <p className="text-sm font-semibold !text-white/90">{trustBadge}</p>
            {trustSubline ? (
              <p className="mt-1 text-xs leading-relaxed !text-white/55">{trustSubline}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,22.5rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-6 xl:gap-8">
        <div className="sw-fade-up sw-fade-up-delay-1 w-full min-w-0">
          <div className="sw-gx-form-rail w-full min-w-0 rounded-xl bg-white">
            <div className="w-full min-w-0">{children}</div>
          </div>
        </div>

        <aside className="sw-fade-up sw-fade-up-delay-2 w-full min-w-0 self-start">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] !text-white/55">
            How predictions work
          </p>
          <div className="sw-gx-signal-steps overflow-hidden rounded-xl">
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

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,24rem)] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,26rem)] lg:gap-12 xl:gap-16">
        <div className="sw-fade-up min-w-0 text-white lg:pr-4">
          {trustBadge ? (
            <p className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-[#16a34a]/20 px-3.5 py-1.5 text-xs font-semibold !text-[#86efac] ring-1 ring-[#4ade80]/35">
              <FiCheck className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
              {trustBadge}
            </p>
          ) : null}

          <h1 className="font-sw-display text-[1.85rem] font-bold leading-[1.15] tracking-tight !text-white sm:text-4xl lg:text-[2.55rem]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed !text-white/80 sm:text-base">
              {subtitle}
            </p>
          ) : null}

          <ul className="mt-10 space-y-5">
            {features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index % FEATURE_ICONS.length];
              const iconStyle = FEATURE_ICON_STYLES[index % FEATURE_ICON_STYLES.length];
              return (
                <li key={`${feature.title}-${index}`} className="flex gap-4">
                  <span
                    className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 pt-1">
                    <p className="text-sm font-semibold !text-white sm:text-[15px]">
                      {feature.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed !text-white/65">{feature.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="sw-fade-up sw-fade-up-delay-1 w-full min-w-0 max-w-full justify-self-stretch lg:justify-self-end">
          <div className="w-full min-w-0 max-w-full rounded-[1.25rem] border border-white/40 bg-white p-6 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.55)] sm:p-8">
            <div className="w-full min-w-0 max-w-full">{children}</div>
          </div>
        </div>
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
  compactHero = false,
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
    />
  ) : null;
  const hasBelowHero = Boolean(
    afterHero || infoSection || results || insights || showRelatedTools
  );

  return (
    <main className={`${swPageShell} !bg-[#f3f5f8]`}>
      <section className="sw-c360-tool-hero relative overflow-hidden !py-0">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 22%, rgba(242,121,33,0.18), transparent 42%), radial-gradient(circle at 82% 18%, rgba(56,189,248,0.12), transparent 38%)',
          }}
          aria-hidden
        />

        <div className={`relative ${LAYOUT.container} py-10 sm:py-12 lg:py-14`}>
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
        <div className={`${LAYOUT.container} space-y-14 py-14 sm:space-y-16 sm:py-16 lg:space-y-20 lg:py-20`}>
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
