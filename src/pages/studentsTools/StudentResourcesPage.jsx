import { Link } from 'react-router-dom';
import { FiChevronRight, FiDownload, FiFileText, FiHome } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { LAYOUT } from '../../components/studentDashboard/careers360/careers360Theme';
import { getStudentResourcesFeed } from '../../utils/api';
import ResourceDownloadModal from '../../components/resources/ResourceDownloadModal';

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StudentResourcesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getStudentResourcesFeed();
      if (cancelled) return;
      setItems(res.success ? res.data?.data || [] : []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <main className="min-h-[60vh] bg-[#f6f7f9]">
        <div className="border-b border-[#e8eaed] bg-white">
          <div className={`${LAYOUT.container} py-6 sm:py-8`}>
            <nav
              className="mb-4 flex items-center gap-1.5 text-[13px] text-[#64748b]"
              aria-label="Breadcrumb"
            >
              <Link to="/" className="inline-flex items-center gap-1 hover:text-[#0f172a]">
                <FiHome className="h-3.5 w-3.5" />
                <span className="sr-only">Home</span>
              </Link>
              <FiChevronRight className="h-3.5 w-3.5 opacity-40" />
              <span className="font-medium text-[#0f172a]">Resources</span>
            </nav>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f27921]">
              Study materials
            </p>
            <h1 className="mt-1.5 font-sw-display text-2xl font-bold text-[#0f172a] sm:text-3xl">
              Guides &amp; PDF resources
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#64748b]">
              Download preparation guides and study PDFs. Verify your mobile number with OTP before
              each download.
            </p>
          </div>
        </div>

        <div className={`${LAYOUT.container} py-8 sm:py-10`}>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-52 animate-pulse rounded-2xl border border-[#e8eaed] bg-white"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dce3ec] bg-white px-6 py-14 text-center">
              <FiFileText className="mx-auto h-10 w-10 text-[#cbd5e1]" />
              <p className="mt-3 text-sm font-medium text-[#64748b]">No resources available yet.</p>
              <p className="mt-1 text-xs text-[#94a3b8]">Check back soon for new guides and PDFs.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <li key={item.id}>
                  <article className="flex h-full flex-col rounded-2xl border border-[#e8eaed] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:border-[#f27921]/35 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff4eb] text-[#f27921]">
                        <FiFileText className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex rounded bg-[#fff4ed] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#e06810]">
                          PDF
                        </span>
                        <h2 className="mt-2 text-lg font-bold leading-snug text-[#0f172a]">
                          {item.title}
                        </h2>
                      </div>
                    </div>

                    {item.description ? (
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-[#64748b] line-clamp-3">
                        {item.description}
                      </p>
                    ) : (
                      <div className="mt-3 flex-1" />
                    )}

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#f1f5f9] pt-4">
                      <p className="text-xs text-[#94a3b8]">
                        {formatBytes(item.fileSize)}
                        {item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ''}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedResource(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#f27921] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e06d1a]"
                      >
                        <FiDownload className="h-4 w-4" />
                        Download
                      </button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <ResourceDownloadModal
        resource={selectedResource}
        open={Boolean(selectedResource)}
        onClose={() => setSelectedResource(null)}
      />
    </>
  );
}
