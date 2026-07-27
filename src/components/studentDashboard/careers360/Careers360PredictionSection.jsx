import { Link } from 'react-router-dom';
import { LuArrowRight } from 'react-icons/lu';
import {
  OTHER_PRODUCTS,
  SECTION_COPY,
} from './careers360HomeData';
import { LAYOUT } from './careers360Theme';

const PREDICTOR_FEATURES = [
  {
    id: 'rank',
    step: '01',
    eyebrow: 'Rank clarity',
    title: 'Rank Predictor',
    lead:
      'Convert marks or percentiles into an estimated rank range before official results—so you can plan counselling with clearer expectations.',
    points: [
      'Models for JEE Main, Advanced, EAMCET, KCET, MHT CET, and more',
      'Range-based outputs that reflect score bands',
      'Jump into college shortlisting from your likely band',
    ],
    cta: 'Open rank predictors',
    to: '/students/rank-predictor',
  },
  {
    id: 'college',
    step: '02',
    eyebrow: 'College shortlists',
    title: 'College Predictor',
    lead:
      'Build a practical shortlist from rank, category, and preferences using historical cutoff patterns across institutes you care about.',
    points: [
      'Filter by category, domicile, and preferences',
      'Cutoff-aware matching instead of open browsing',
      'A focused list you can refine before forms open',
    ],
    cta: 'Explore college predictor',
    to: '/students/college-predictor',
  },
  {
    id: 'branch',
    step: '03',
    eyebrow: 'Branch pathways',
    title: 'Branch Predictor',
    lead:
      'Check which branches are realistic at your target campuses so preference order reflects both ambition and probability.',
    points: [
      'Branch-level visibility for preferred institutes',
      'Useful for IIT / NIT / state college priority',
      'Pairs with comparison for fee and placement context',
    ],
    cta: 'Try branch predictor',
    to: '/students/branch-predictor',
  },
];

export function Careers360PredictionSection() {
  const { title, description } = SECTION_COPY.predictors;

  return (
    <section id="rank-predictors" className="border-b border-[#e8eaed] bg-white py-12 sm:py-16">
      <div className={LAYOUT.container}>
        <header className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f27921]">
            Predictors
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl">
            {title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-[#666]">{description}</p>
        </header>

        <ul className="mt-10 grid gap-4 lg:grid-cols-3">
          {PREDICTOR_FEATURES.map((feature) => (
            <li key={feature.id}>
              <article className="flex h-full flex-col rounded-2xl border border-[#e5e7eb] bg-[#fafbfc] p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f27921]">
                    {feature.eyebrow}
                  </p>
                  <span className="text-xs font-bold tabular-nums text-[#ccc]">{feature.step}</span>
                </div>
                <h3 className="mt-3 text-xl font-bold tracking-tight text-[#1a1a1a]">
                  {feature.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[#555]">{feature.lead}</p>

                <ul className="mt-6 space-y-2.5 border-t border-[#eef0f3] pt-5">
                  {feature.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-[#444]">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#f27921]" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>

                <Link
                  to={feature.to}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#1a1a1a] transition hover:text-[#f27921]"
                >
                  {feature.cta}
                  <LuArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Careers360OtherProducts() {
  const { title, description } = SECTION_COPY.moreTools;

  return (
    <section className={`${LAYOUT.section} bg-white`}>
      <div className={LAYOUT.container}>
        <header className="mb-8 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f27921]">
            More tools
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#666]">{description}</p>
        </header>

        <ul className="overflow-hidden rounded-2xl border border-[#e5e7eb] divide-y divide-[#eef0f3]">
          {OTHER_PRODUCTS.map((product) => (
            <li key={product.id}>
              <Link
                to={product.to}
                className="group flex items-center justify-between gap-4 px-5 py-5 transition hover:bg-[#fafbfc] sm:px-6"
              >
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[#1a1a1a] transition group-hover:text-[#f27921]">
                    {product.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#666]">{product.description}</p>
                </div>
                <LuArrowRight
                  className="h-4 w-4 shrink-0 text-[#ccc] transition group-hover:translate-x-0.5 group-hover:text-[#f27921]"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
