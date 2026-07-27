import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LuArrowRight } from 'react-icons/lu';
import { SECTION_COPY, WORKSPACE_UPDATES } from './careers360HomeData';
import { LAYOUT } from './careers360Theme';
import { getStudentWorkspaceUpdatesFeed } from '../../../utils/api';
import { formatUpdateDate } from '../../../utils/studentWorkspaceUpdates';

function normalizeHomeItems(apiItems) {
  if (!Array.isArray(apiItems) || apiItems.length === 0) return null;
  return apiItems.map((item) => ({
    id: item.id,
    tag: item.tag || item.category,
    title: item.title,
    date: formatUpdateDate(item.publishedAt),
    to: item.linkUrl || '/students/updates',
    external: /^https?:\/\//i.test(item.linkUrl || ''),
  }));
}

function tagStyles(tag) {
  if (tag === 'Updated') return 'bg-[#eff6ff] text-[#1d4ed8]';
  if (tag === 'New data') return 'bg-[#ecfdf5] text-[#047857]';
  if (tag === 'Partner') return 'bg-[#f5f3ff] text-[#6d28d9]';
  return 'bg-[#fff4ed] text-[#c2410c]';
}

function UpdateLink({ item, className, children }) {
  if (item.external) {
    return (
      <a href={item.to} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={item.to} className={className}>
      {children}
    </Link>
  );
}

export function Careers360NewsSection() {
  const { title, subtitle } = SECTION_COPY.updates;
  const [items, setItems] = useState(WORKSPACE_UPDATES);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getStudentWorkspaceUpdatesFeed({ placement: 'home', limit: 8 });
      if (cancelled) return;
      const live = normalizeHomeItems(res.success ? res.data?.data?.items : null);
      if (live?.length) setItems(live);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className={`${LAYOUT.section} bg-white`}>
      <div className={LAYOUT.container}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f27921]">
              Updates
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl">
              {title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#666]">{subtitle}</p>
          </div>
          <Link
            to="/students/updates"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563eb] transition hover:underline"
          >
            All updates <LuArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ul className="overflow-hidden rounded-2xl border border-[#e5e7eb] divide-y divide-[#eef0f3]">
          {items.map((item) => (
            <li key={item.id}>
              <UpdateLink
                item={item}
                className="group flex items-start justify-between gap-4 px-5 py-5 transition hover:bg-[#fafbfc] sm:items-center sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.tag ? (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tagStyles(item.tag)}`}
                      >
                        {item.tag}
                      </span>
                    ) : null}
                    <span className="text-[11px] text-[#999]">{item.date}</span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold leading-snug text-[#1a1a1a] transition group-hover:text-[#f27921] sm:text-[15px]">
                    {item.title}
                  </p>
                </div>
                <LuArrowRight
                  className="mt-1 h-4 w-4 shrink-0 text-[#d1d5db] transition group-hover:translate-x-0.5 group-hover:text-[#f27921] sm:mt-0"
                  aria-hidden
                />
              </UpdateLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Careers360CounsellingSection({ onBookCounselling }) {
  return (
    <section id="career-counselling" className="border-b border-[#e8eaed] bg-[#faf8f5] py-12 sm:py-16">
      <div className={`${LAYOUT.container} max-w-3xl text-center`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f27921]">
          Career counselling
        </p>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl sm:leading-tight">
          Still unsure about colleges, branches, or what to choose next?
        </h2>
        <p className="mx-auto mt-4 text-[15px] leading-relaxed text-[#555]">
          Book a free one-on-one session with an IITian mentor — personalised guidance on admissions,
          campus fit, and shortlist decisions.
        </p>

        <ul className="mx-auto mt-8 max-w-xl space-y-3 text-left">
          {[
            'Confused between colleges or branches after seeing your predicted rank?',
            'Want campuses that fit your budget, category, and preferences?',
            'Ready to plan counselling with someone who has walked this path?',
          ].map((q) => (
            <li key={q} className="flex gap-3 text-sm leading-relaxed text-[#444]">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f27921]" aria-hidden />
              {q}
            </li>
          ))}
        </ul>

        <div className="mt-9 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onBookCounselling}
            className="inline-flex items-center justify-center rounded-lg bg-[#f27921] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[#e06810]"
          >
            Book free IITian 1-on-1 counselling
          </button>
          <p className="text-xs text-[#888]">100% free · Live session with an IITian mentor</p>
        </div>
      </div>
    </section>
  );
}
