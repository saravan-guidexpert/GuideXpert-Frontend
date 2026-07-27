import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuArrowRight, LuBadgeCheck, LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { SECTION_COPY } from './careers360HomeData';
import { OUTCOME_IMAGES } from './studentWorkspaceImages';
import { LAYOUT } from './careers360Theme';
import { STUDENT_OUTCOMES } from '../landing/landingPageData';
import CollegeCampusImage from '../landing/CollegeCampusImage';

export default function Careers360ImpactSection() {
  const [index, setIndex] = useState(0);
  const { title, description } = SECTION_COPY.outcomes;

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % STUDENT_OUTCOMES.length), 6000);
    return () => clearInterval(t);
  }, []);

  const outcome = STUDENT_OUTCOMES[index];
  const outcomeImage = OUTCOME_IMAGES[outcome.id];
  const go = (dir) =>
    setIndex((i) => (i + dir + STUDENT_OUTCOMES.length) % STUDENT_OUTCOMES.length);

  return (
    <section className={`${LAYOUT.section} bg-[#f7f8fa]`}>
      <div className={LAYOUT.container}>
        <header className="mb-10 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f27921]">
            Outcomes
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#666]">{description}</p>
        </header>

        <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="grid lg:grid-cols-12">
            <div className="relative min-h-[240px] lg:col-span-5 lg:min-h-[360px]">
              <CollegeCampusImage
                id={`outcome-${outcome.id}`}
                name={outcome.colleges[0]}
                src={outcomeImage}
                className="absolute inset-0 h-full w-full"
                imgClassName="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/75 via-[#0f172a]/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/90">
                  <LuBadgeCheck className="h-4 w-4 text-[#f27921]" aria-hidden />
                  Verified admission outcome
                </span>
                <p className="mt-2 text-lg font-semibold text-white">{outcome.colleges[0]}</p>
              </div>
            </div>

            <div className="flex flex-col justify-between lg:col-span-7">
              <div className="flex flex-1 flex-col justify-center p-6 sm:p-8 lg:p-10">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#999]">
                      Achieved rank
                    </p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-[#1a1a1a] sm:text-4xl">
                      {outcome.rank}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#ffe0cc] bg-[#fff8f3] px-4 py-3 text-right">
                    <p className="text-2xl font-bold tabular-nums text-[#f27921]">{outcome.accuracy}%</p>
                    <p className="mt-0.5 text-[11px] font-medium text-[#b45309]">
                      shortlist match
                    </p>
                  </div>
                </div>

                <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-[#555]">
                  <span className="font-semibold text-[#1a1a1a]">{outcome.exam}</span>
                  {' — '}predicted institutes aligned with where the student eventually secured a seat.
                </p>

                <div className="mt-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#999]">
                    Matched institutes
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {outcome.colleges.map((college) => (
                      <li
                        key={college}
                        className="rounded-lg border border-[#e8eaed] bg-[#fafbfc] px-3.5 py-2 text-sm font-medium text-[#333]"
                      >
                        {college}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#eef0f3] px-6 py-4 sm:px-8">
                <div className="flex items-center gap-2">
                  {STUDENT_OUTCOMES.map((o, i) => (
                    <button
                      key={o.id}
                      type="button"
                      aria-label={`Show outcome ${i + 1}`}
                      onClick={() => setIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === index ? 'w-7 bg-[#f27921]' : 'w-1.5 bg-[#d1d5db] hover:bg-[#9ca3af]'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous outcome"
                    onClick={() => go(-1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e7eb] text-[#555] transition hover:border-[#f27921]/40 hover:text-[#f27921]"
                  >
                    <LuChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next outcome"
                    onClick={() => go(1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e7eb] text-[#555] transition hover:border-[#f27921]/40 hover:text-[#f27921]"
                  >
                    <LuChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Careers360CommunityCTA() {
  const { title, description, cta } = SECTION_COPY.helpCta;

  return (
    <section className={`${LAYOUT.sectionCompact} bg-white`}>
      <div className={LAYOUT.container}>
        <div className="relative overflow-hidden rounded-2xl bg-[#1a2332] px-6 py-10 sm:px-10 sm:py-12 lg:px-14">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#f27921]/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-[#3b82f6]/15 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-white/70">{description}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/students/tests"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f27921] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#e06810]"
              >
                Take a fit test
                <LuArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                to="/students/predictors"
                className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                {cta}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
