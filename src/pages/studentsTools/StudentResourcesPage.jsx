import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiChevronRight, FiDownload, FiFileText, FiHome, FiX } from 'react-icons/fi';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const { slug: slugParam } = useParams();
  const navigate = useNavigate();
  const focusKey = slugParam ? String(slugParam).trim() : '';
  const focusKeyLower = focusKey.toLowerCase();
  const spotlightActive = Boolean(focusKey);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState(null);
  const focusedCardRef = useRef(null);

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

  const focusedItem = useMemo(() => {
    if (!focusKey) return null;
    return (
      items.find((item) => {
        const slug = String(item.slug || '').toLowerCase();
        const id = String(item.id || '');
        return (slug && slug === focusKeyLower) || id === focusKey;
      }) || null
    );
  }, [items, focusKey, focusKeyLower]);

  const slugNotFound = spotlightActive && !loading && !focusedItem;

  useEffect(() => {
    setSelectedResource(null);
  }, [focusKey]);

  useEffect(() => {
    if (!spotlightActive || !focusedItem) return;
    const el = focusedCardRef.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
    return () => window.clearTimeout(t);
  }, [spotlightActive, focusedItem]);

  const clearSpotlight = () => {
    setSelectedResource(null);
    navigate('/students/resources');
  };

  const resourcePath = (item) => {
    const key = String(item?.slug || item?.id || '').trim();
    return key ? `/students/resources/${key}` : '/students/resources';
  };

  return (
    <>
      <main className="relative min-h-[60vh] bg-[#f6f7f9]">
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
              {spotlightActive ? (
                <>
                  <Link to="/students/resources" className="hover:text-[#0f172a]">
                    Resources
                  </Link>
                  <FiChevronRight className="h-3.5 w-3.5 opacity-40" />
                  <span className="truncate font-medium text-[#0f172a]">
                    {focusedItem?.title || 'Resource'}
                  </span>
                </>
              ) : (
                <span className="font-medium text-[#0f172a]">Resources</span>
              )}
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

        <div className={`relative ${LAYOUT.container} py-8 sm:py-10`}>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-52 animate-pulse rounded-2xl border border-[#e8eaed] bg-white"
                />
              ))}
            </div>
          ) : slugNotFound ? (
            <div className="relative z-20 mx-auto max-w-md rounded-2xl border border-[#e8eaed] bg-white px-6 py-12 text-center shadow-lg">
              <FiFileText className="mx-auto h-10 w-10 text-[#cbd5e1]" />
              <p className="mt-3 text-base font-semibold text-[#0f172a]">Resource not found</p>
              <p className="mt-1.5 text-sm text-[#64748b]">
                This share link is invalid or the PDF is no longer published.
              </p>
              <Link
                to="/students/resources"
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#f27921] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e06d1a]"
              >
                View all resources
              </Link>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dce3ec] bg-white px-6 py-14 text-center">
              <FiFileText className="mx-auto h-10 w-10 text-[#cbd5e1]" />
              <p className="mt-3 text-sm font-medium text-[#64748b]">No resources available yet.</p>
              <p className="mt-1 text-xs text-[#94a3b8]">Check back soon for new guides and PDFs.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const isFocused =
                  spotlightActive &&
                  focusedItem &&
                  (String(item.id || '') === String(focusedItem.id || '') ||
                    (item.slug &&
                      String(item.slug).toLowerCase() ===
                        String(focusedItem.slug || '').toLowerCase()));
                return (
                  <li
                    key={item.id}
                    ref={isFocused ? focusedCardRef : undefined}
                    className={isFocused ? 'relative z-30' : spotlightActive ? 'relative z-0' : ''}
                  >
                    <article
                      className={`flex h-full flex-col rounded-2xl border bg-white p-5 sm:p-6 ${
                        isFocused
                          ? 'border-[#f27921]/50 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.35)] ring-2 ring-[#f27921]/25'
                          : 'border-[#e8eaed] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:border-[#f27921]/35 hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff4eb] text-[#f27921]">
                          <FiFileText className="h-5 w-5" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="inline-flex rounded bg-[#fff4ed] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#e06810]">
                            PDF
                          </span>
                          <h2 className="mt-2 text-lg font-bold leading-snug text-[#0f172a]">
                            <Link to={resourcePath(item)} className="hover:text-[#f27921]">
                              {item.title}
                            </Link>
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
                );
              })}
            </ul>
          )}
        </div>

        {spotlightActive && !loading && !slugNotFound ? (
          <>
            <div
              className="pointer-events-auto fixed inset-0 z-20 bg-slate-900/35 backdrop-blur-md"
              aria-hidden
              onClick={clearSpotlight}
            />
            <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
              <button
                type="button"
                onClick={clearSpotlight}
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm hover:bg-slate-900"
              >
                <FiX className="h-4 w-4" />
                View all resources
              </button>
            </div>
          </>
        ) : null}
      </main>

      <ResourceDownloadModal
        resource={selectedResource}
        open={Boolean(selectedResource)}
        onClose={() => setSelectedResource(null)}
      />
    </>
  );
}
