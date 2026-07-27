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
    lead:
      'Convert marks or percentiles into an estimated rank range before official results—so you can plan counselling with clearer expectations.',
    points: [
      'Models tuned for JEE Main, JEE Advanced, EAMCET, KCET, MHT CET, and more',
      'Range-based outputs that reflect score bands, not a single hard claim',
      'Direct jump into college shortlisting once you know your likely band',
    ],
    cta: 'Open rank predictors',
    to: '/students/rank-predictor',
    accent: '#1e3a5f',
  },
  {
    id: 'college',
    eyebrow: 'College shortlists',
    title: 'College Predictor',
    lead:
      'Build a practical shortlist from rank, category, and preferences using historical cutoff patterns across institutes you actually care about.',
    points: [
      'Filter by category, domicile, and preference signals',
      'Cutoff-aware matching instead of open-ended browsing',
      'A focused list you can refine before forms open',
    ],
    cta: 'Explore college predictor',
    to: '/students/college-predictor',
    accent: '#f27921',
  },
  {
    id: 'branch',
    eyebrow: 'Branch pathways',
    title: 'Branch Predictor',
    lead:
      'Check which branches are realistic at your target campuses so preference order reflects both ambition and probability.',
    points: [
      'Branch-level visibility for preferred institutions',
      'Useful when deciding IIT / NIT / state college priority',
      'Pairs with college comparison for fee and placement context',
    ],
    cta: 'Try branch predictor',
    to: '/students/branch-predictor',
    accent: '#2d1b4e',
  },
];

function PredictorFeatureRow({ feature, index }) {
  const reverse = index % 2 === 1;

  return (
    <article
      className={`relative grid items-center gap-8 border-t border-[#e8eaed] py-10 first:border-t-0 first:pt-0 lg:grid-cols-12 lg:gap-10 lg:py-14`}
    >
      <SectionDecorDots
        className={`absolute ${reverse ? 'left-0' : 'right-0'} top-6 h-16 w-16 opacity-70`}
      />

      <div className={`lg:col-span-5 ${reverse ? 'lg:order-2' : ''}`}>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: feature.accent }}
        >
          {feature.eyebrow}
        </p>
        <h3 className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-[1.75rem]">
          {feature.title}
        </h3>
        <p className="mt-4 text-[15px] leading-relaxed text-[#555]">{feature.lead}</p>

        <ol className="mt-6 space-y-3">
          {feature.points.map((point, i) => (
            <li key={point} className="flex gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: feature.accent }}
              >
                {i + 1}
              </span>
              <p className="text-[14px] leading-relaxed text-[#444]">{point}</p>
            </li>
          ))}
        </ol>

        <Link
          to={feature.to}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#1a1a1a] transition hover:text-[#f27921]"
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
    <section id="rank-predictors" className="relative overflow-hidden border-b border-[#e8eaed] bg-white py-12 sm:py-16">
      <SectionDecorDots className="absolute right-4 top-8 h-20 w-20 opacity-50 sm:right-12" />
      <div className={LAYOUT.container}>
        <header className="relative mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f27921]">
            Predictors
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl">
            {title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#666]">{description}</p>
        </header>

        <div className="mt-12 lg:mt-14">
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
        <header className="mb-10 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f27921]">
            More tools
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#666]">{description}</p>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2">
          {OTHER_PRODUCTS.map((product) => (
            <li key={product.id}>
              <Link
                to={product.to}
                className="group flex h-full items-start gap-4 rounded-2xl border border-[#e5e7eb] bg-[#fafbfc] p-5 transition hover:border-[#f27921]/35 hover:bg-white hover:shadow-[0_8px_24px_rgba(16,24,40,0.06)] sm:gap-5 sm:p-6"
              >
                <OtherProductIcon id={product.id} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-[#1a1a1a] transition group-hover:text-[#f27921]">
                      {product.title}
                    </h3>
                    <LuArrowRight
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#ccc] transition group-hover:translate-x-0.5 group-hover:text-[#f27921]"
                      aria-hidden
                    />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#666]">{product.description}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
