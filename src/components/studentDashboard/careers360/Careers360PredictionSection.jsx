import { Link } from 'react-router-dom';
import { LuArrowRight } from 'react-icons/lu';
import {
  OTHER_PRODUCTS,
  SECTION_COPY,
} from './careers360HomeData';
import { LAYOUT } from './careers360Theme';
import {
  OtherProductIcon,
  PredictorIllustration,
  SectionDecorDots,
} from './SectionIllustrations';

const PREDICTOR_FEATURES = [
  {
    id: 'rank',
    eyebrow: 'Rank clarity',
    title: 'Rank Predictor',
    lead: 'Marks or percentile → estimated rank range.',
    tags: ['JEE · EAMCET · KCET · more', 'Range-based estimates'],
    cta: 'Open rank predictors',
    to: '/students/rank-predictor',
    accent: '#1e3a5f',
  },
  {
    id: 'college',
    eyebrow: 'College shortlists',
    title: 'College Predictor',
    lead: 'Rank + category → practical college shortlist.',
    tags: ['Cutoff-aware matching', 'Filter by preference'],
    cta: 'Explore college predictor',
    to: '/students/college-predictor',
    accent: '#f27921',
  },
  {
    id: 'branch',
    eyebrow: 'Branch pathways',
    title: 'Branch Predictor',
    lead: 'See which branches fit your target campuses.',
    tags: ['IIT · NIT · state colleges', 'Pairs with compare'],
    cta: 'Try branch predictor',
    to: '/students/branch-predictor',
    accent: '#2d1b4e',
  },
];

function PredictorFeatureRow({ feature, index }) {
  const reverse = index % 2 === 1;

  return (
    <article
      className={`relative grid items-center gap-6 border-t border-[#e8eaed] py-8 first:border-t-0 first:pt-0 lg:grid-cols-12 lg:gap-10 lg:py-10`}
    >
      <SectionDecorDots
        className={`absolute ${reverse ? 'left-0' : 'right-0'} top-4 h-14 w-14 opacity-60`}
      />

      <div className={`lg:col-span-5 ${reverse ? 'lg:order-2' : ''}`}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: feature.accent }}
        >
          {feature.eyebrow}
        </p>
        <h3 className="mt-2 text-xl font-bold tracking-tight text-[#1a1a1a] sm:text-2xl">
          {feature.title}
        </h3>
        <p className="mt-2 text-sm leading-snug text-[#555]">{feature.lead}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {feature.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[#e8eaed] bg-[#fafbfc] px-2.5 py-1 text-[11px] font-medium text-[#667085]"
            >
              {tag}
            </span>
          ))}
        </div>

        <Link
          to={feature.to}
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1a1a1a] transition hover:text-[#f27921]"
        >
          {feature.cta}
          <LuArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className={`lg:col-span-7 ${reverse ? 'lg:order-1' : ''}`}>
        <PredictorIllustration id={feature.id} className="h-full shadow-sm" />
      </div>
    </article>
  );
}

export function Careers360PredictionSection() {
  const { title, description } = SECTION_COPY.predictors;

  return (
    <section id="rank-predictors" className="relative overflow-hidden border-b border-[#e8eaed] bg-white py-10 sm:py-14">
      <SectionDecorDots className="absolute right-4 top-8 h-20 w-20 opacity-50 sm:right-12" />
      <div className={LAYOUT.container}>
        <header className="relative mx-auto max-w-xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f27921]">
            Predictors
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-[1.75rem]">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-snug text-[#666]">{description}</p>
        </header>

        <div className="mt-8 lg:mt-10">
          {PREDICTOR_FEATURES.map((feature, index) => (
            <PredictorFeatureRow
              key={feature.id}
              feature={feature}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function Careers360OtherProducts() {
  const { title, description } = SECTION_COPY.moreTools;

  return (
    <section className={`${LAYOUT.section} bg-white`}>
      <div className={LAYOUT.container}>
        <header className="mb-8 max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f27921]">
            More tools
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-[1.75rem]">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-snug text-[#666]">{description}</p>
        </header>

        <ul className="grid gap-3 sm:grid-cols-2">
          {OTHER_PRODUCTS.map((product) => (
            <li key={product.id}>
              <Link
                to={product.to}
                className="group flex h-full items-center gap-4 rounded-2xl border border-[#e5e7eb] bg-[#fafbfc] p-4 transition hover:border-[#f27921]/35 hover:bg-white hover:shadow-[0_8px_24px_rgba(16,24,40,0.06)] sm:p-5"
              >
                <OtherProductIcon id={product.id} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[#1a1a1a] transition group-hover:text-[#f27921] sm:text-base">
                      {product.title}
                    </h3>
                    <LuArrowRight
                      className="h-4 w-4 shrink-0 text-[#ccc] transition group-hover:translate-x-0.5 group-hover:text-[#f27921]"
                      aria-hidden
                    />
                  </div>
                  <p className="mt-1 text-xs leading-snug text-[#666] sm:text-sm">{product.description}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
