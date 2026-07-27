import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuChevronLeft, LuChevronRight, LuQuote } from 'react-icons/lu';
import { STUDENT_OUTCOMES } from './landingPageData';
import { LAYOUT } from '../careers360/careers360Theme';
import { getStudentTestimonialsFeed } from '../../../utils/api';

const INTERVAL_MS = 6000;

function normalizeItems(apiItems) {
  if (!Array.isArray(apiItems) || !apiItems.length) return null;
  return apiItems.map((item) => ({
    id: item.id,
    studentName: item.studentName || '',
    quote: item.quote || '',
    rank: item.rank,
    exam: item.exam,
    colleges: Array.isArray(item.colleges) ? item.colleges : [],
    accuracy: item.accuracy ?? 95,
  }));
}

export default function StudentSuccessCarousel() {
  const [items, setItems] = useState(STUDENT_OUTCOMES);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getStudentTestimonialsFeed({ limit: 20 });
      if (cancelled) return;
      const live = normalizeItems(res.success ? res.data?.data?.items : null);
      if (live?.length) {
        setItems(live);
        setIndex(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (paused || items.length <= 1) return undefined;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [paused, items.length]);

  const outcome = items[index] || items[0];
  if (!outcome) return null;

  const go = (dir) => setIndex((i) => (i + dir + items.length) % items.length);

  return (
    <section
      className="border-b border-[#e8eaed] bg-white"
      aria-labelledby="success-carousel-heading"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className={`${LAYOUT.container} py-12 sm:py-16`}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f27921]">
              Testimonials
            </p>
            <h2
              id="success-carousel-heading"
              className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl"
            >
              Student success stories
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#666]">
              See how accurate predictions help students land at the right colleges.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous story"
              onClick={() => go(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e5e7eb] text-[#555] transition hover:border-[#f27921]/40 hover:text-[#f27921]"
            >
              <LuChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next story"
              onClick={() => go(1)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e5e7eb] text-[#555] transition hover:border-[#f27921]/40 hover:text-[#f27921]"
            >
              <LuChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative mt-10">
          <AnimatePresence mode="wait">
            <motion.article
              key={outcome.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="grid overflow-hidden rounded-2xl border border-[#e5e7eb] bg-[#fafbfc] lg:grid-cols-12"
              aria-live="polite"
            >
              <div className="flex flex-col justify-center border-b border-[#eef0f3] p-6 sm:p-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:bg-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#999]">
                  Student rank
                </p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-[#1a1a1a]">
                  {outcome.rank}
                </p>
                {outcome.studentName ? (
                  <p className="mt-2 text-sm font-medium text-[#666]">{outcome.studentName}</p>
                ) : null}

                <div className="mt-8 space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#999]">
                      Exam
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#333]">{outcome.exam}</p>
                  </div>
                  <div className="inline-flex items-center rounded-lg border border-[#ffe0cc] bg-[#fff8f3] px-3 py-1.5">
                    <span className="text-sm font-bold tabular-nums text-[#f27921]">
                      {outcome.accuracy}%
                    </span>
                    <span className="ml-2 text-xs font-medium text-[#b45309]">prediction accuracy</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center p-6 sm:p-8 lg:col-span-8 lg:p-10">
                <LuQuote className="h-8 w-8 text-[#f27921]/35" aria-hidden />
                {outcome.quote ? (
                  <p className="mt-4 text-lg font-medium leading-relaxed text-[#333] sm:text-xl sm:leading-relaxed">
                    &ldquo;{outcome.quote}&rdquo;
                  </p>
                ) : (
                  <p className="mt-4 text-lg font-medium leading-relaxed text-[#333] sm:text-xl sm:leading-relaxed">
                    Predicted colleges matched the institutes where this student secured admission.
                  </p>
                )}

                <div className="mt-8">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#999]">
                    Predicted colleges
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {(outcome.colleges || []).map((college) => (
                      <li
                        key={college}
                        className="rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2 text-sm font-medium text-[#333]"
                      >
                        {college}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex justify-center gap-2" role="tablist" aria-label="Success story slides">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show story ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-7 bg-[#f27921]' : 'w-1.5 bg-[#d1d5db] hover:bg-[#9ca3af]'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
