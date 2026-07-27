import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LuArrowRight, LuCalendar } from 'react-icons/lu';
import { SECTION_COPY, WORKSPACE_UPDATES } from './careers360HomeData';
import { LAYOUT } from './careers360Theme';
import CollegeCampusImage from '../landing/CollegeCampusImage';
import { CounsellingIllustration } from './SectionIllustrations';
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
    image: item.imageUrl || '',
    imageId: `live-update-${item.id}`,
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

  const [featured, ...rest] = items;
  const sideItems = rest.slice(0, 4);

  return (
    <section className={`${LAYOUT.section} bg-white`}>
      <div className={LAYOUT.container}>
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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

        {featured ? (
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
            <UpdateLink
              item={featured}
              className="group relative overflow-hidden rounded-2xl border border-[#e5e7eb] lg:col-span-7"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[#eef2f7] sm:aspect-[16/9]">
                {featured.image ? (
                  <CollegeCampusImage
                    id={featured.imageId || `update-${featured.id}`}
                    name={featured.title}
                    src={featured.image}
                    className="h-full w-full"
                    imgClassName="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[#1e3a5f] to-[#f27921]/80" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/85 via-[#0f172a]/25 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2">
                    {featured.tag ? (
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tagStyles(featured.tag)}`}
                      >
                        {featured.tag}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 text-xs text-white/70">
                      <LuCalendar className="h-3.5 w-3.5" aria-hidden />
                      {featured.date}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold leading-snug text-white sm:text-xl">
                    {featured.title}
                  </h3>
                </div>
              </div>
            </UpdateLink>

            <ul className="flex flex-col divide-y divide-[#eef0f3] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-[#fafbfc] lg:col-span-5">
              {sideItems.map((item) => (
                <li key={item.id} className="flex-1">
                  <UpdateLink
                    item={item}
                    className="group flex h-full gap-4 px-5 py-5 transition hover:bg-white sm:px-6"
                  >
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-[#eef2f7]">
                      {item.image ? (
                        <CollegeCampusImage
                          id={item.imageId || `update-${item.id}`}
                          name={item.title}
                          src={item.image}
                          className="h-full w-full"
                          imgClassName="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
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
                      <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-[#1a1a1a] transition group-hover:text-[#f27921]">
                        {item.title}
                      </p>
                    </div>
                  </UpdateLink>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function Careers360CounsellingSection({ onBookCounselling }) {
  return (
    <section
      id="career-counselling"
      className="relative overflow-hidden border-b border-[#e8eaed] py-12 sm:py-16"
      style={{
        background: 'linear-gradient(165deg, #faf7f2 0%, #fff8f1 45%, #ffffff 100%)',
      }}
    >
      <div className={`${LAYOUT.container} grid items-center gap-10 lg:grid-cols-2 lg:gap-14`}>
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f27921]">
            Career counselling
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl sm:leading-tight">
            Still unsure about colleges, branches, or what to choose next?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[#555] lg:mx-0">
            Need guidance on admissions, want to understand campus options, or simply talk through your
            shortlist with someone who has done it? Book a free one-on-one session with an IITian
            mentor — personalised, calm, and focused on your goals.
          </p>

          <ul className="mx-auto mt-8 flex max-w-lg flex-col gap-3 text-left sm:max-w-md lg:mx-0">
            {[
              'Confused between colleges or branches after seeing your predicted rank?',
              'Want to know which campuses fit your budget, category, and preferences?',
              'Ready to plan counselling with help from someone who has walked this path?',
            ].map((q) => (
              <li
                key={q}
                className="flex gap-3 border-b border-[#f0e6da] pb-3 text-sm leading-relaxed text-[#444] last:border-0 last:pb-0"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f27921]" aria-hidden />
                {q}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col items-center gap-3 lg:items-start">
            <button
              type="button"
              onClick={onBookCounselling}
              className="inline-flex items-center justify-center rounded-lg bg-[#f27921] px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e06810]"
            >
              Book free IITian 1-on-1 counselling
            </button>
            <p className="text-xs text-[#888]">100% free · Live session with an IITian mentor</p>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <CounsellingIllustration className="shadow-sm" />
        </div>
      </div>
    </section>
  );
}
