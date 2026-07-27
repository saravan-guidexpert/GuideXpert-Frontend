import { Link } from 'react-router-dom';
import { FiChevronRight, FiHome } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { LAYOUT } from '../../components/studentDashboard/careers360/careers360Theme';
import { getStudentWorkspaceUpdatesFeed } from '../../utils/api';
import {
  formatUpdateDate,
  markUpdatesSeen,
} from '../../utils/studentWorkspaceUpdates';

export default function StudentUpdatesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getStudentWorkspaceUpdatesFeed({ limit: 50 });
      if (cancelled) return;
      const list = res.success ? res.data?.data?.items || [] : [];
      setItems(list);
      markUpdatesSeen(list.map((i) => i.id));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-[60vh] bg-[#f6f7f9]">
      <div className="border-b border-[#e8eaed] bg-white">
        <div className={`${LAYOUT.container} py-6 sm:py-8`}>
          <nav className="mb-4 flex items-center gap-1.5 text-[13px] text-[#64748b]" aria-label="Breadcrumb">
            <Link to="/" className="inline-flex items-center gap-1 hover:text-[#0f172a]">
              <FiHome className="h-3.5 w-3.5" />
              <span className="sr-only">Home</span>
            </Link>
            <FiChevronRight className="h-3.5 w-3.5 opacity-40" />
            <span className="font-medium text-[#0f172a]">Updates</span>
          </nav>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f27921]">
            Education desk
          </p>
          <h1 className="mt-1.5 font-sw-display text-2xl font-bold text-[#0f172a] sm:text-3xl">
            Exams, admissions & deadlines
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#64748b]">
            Latest GuideXpert updates on predictors, counselling windows, and education news for
            students.
          </p>
        </div>
      </div>

      <div className={`${LAYOUT.container} py-8 sm:py-10`}>
        {loading ? (
          <p className="text-sm text-[#94a3b8]">Loading updates…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dce3ec] bg-white px-6 py-12 text-center">
            <p className="text-sm text-[#64748b]">No published updates yet. Check back soon.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const href = item.linkUrl || '';
              const isExternal = /^https?:\/\//i.test(href);
              const body = (
                <article className="rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[#f27921]/35 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.tag ? (
                      <span className="rounded bg-[#fff4ed] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#e06810]">
                        {item.tag}
                      </span>
                    ) : null}
                    <span className="text-xs capitalize text-[#94a3b8]">{item.category}</span>
                    <span className="text-xs text-[#cbd5e1]">·</span>
                    <time className="text-xs text-[#94a3b8]">{formatUpdateDate(item.publishedAt)}</time>
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-[#0f172a]">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#64748b]">{item.summary}</p>
                  {href ? (
                    <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#f27921]">
                      {item.linkLabel || 'Learn more'}
                      <FiChevronRight className="h-4 w-4" />
                    </p>
                  ) : null}
                </article>
              );

              if (!href) return <li key={item.id}>{body}</li>;
              if (isExternal) {
                return (
                  <li key={item.id}>
                    <a href={href} target="_blank" rel="noreferrer" className="block">
                      {body}
                    </a>
                  </li>
                );
              }
              return (
                <li key={item.id}>
                  <Link to={href} className="block">
                    {body}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
