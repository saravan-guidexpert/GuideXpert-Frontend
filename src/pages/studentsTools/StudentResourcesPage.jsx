import { Link } from 'react-router-dom';
import { FiArrowRight, FiChevronRight, FiDownload, FiFileText, FiHome } from 'react-icons/fi';
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
      <main className="min-h-[60vh] bg-white">
        <div className={`${LAYOUT.container} border-b border-[#eef1f4] py-8 sm:py-10`}>
          <nav
            className="mb-6 flex items-center gap-1.5 text-[13px] text-[#94a3b8]"
            aria-label="Breadcrumb"
          >
            <Link to="/" className="inline-flex items-center gap-1 transition hover:text-[#0f172a]">
              <FiHome className="h-3.5 w-3.5" />
              <span className="sr-only">Home</span>
            </Link>
            <FiChevronRight className="h-3.5 w-3.5 opacity-50" />
            <span className="text-[#475569]">Resources</span>
          </nav>

          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold tracking-tight text-[#0f172a] sm:text-[1.75rem]">
              Resources
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-[#64748b]">
              PDF guides and study material. Verify your mobile number once to download each file.
            </p>
          </div>
        </div>

        <div className={`${LAYOUT.container} py-8 sm:py-10`}>
          <div className="mx-auto max-w-3xl">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-[72px] animate-pulse rounded-lg bg-[#f8fafc]" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-lg border border-[#eef1f4] px-6 py-14 text-center">
                <FiFileText className="mx-auto h-8 w-8 text-[#cbd5e1]" strokeWidth={1.5} />
                <p className="mt-3 text-sm text-[#64748b]">No resources available yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#eef1f4] rounded-lg border border-[#eef1f4]">
                {items.map((item) => (
                  <li key={item.id}>
                    <div className="flex items-center gap-4 px-4 py-4 sm:px-5 sm:py-5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#f8fafc] text-[#64748b]">
                        <FiFileText className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="text-[15px] font-medium leading-snug text-[#0f172a] sm:text-base">
                          {item.title}
                        </h2>
                        {item.description ? (
                          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#64748b]">
                            {item.description}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs text-[#94a3b8]">
                          PDF · {formatBytes(item.fileSize)}
                          {item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedResource(item)}
                        className="group inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-medium text-[#334155] transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] sm:px-3.5"
                      >
                        <FiDownload className="h-4 w-4 text-[#64748b] group-hover:text-[#0f172a]" />
                        <span className="hidden sm:inline">Download</span>
                        <FiArrowRight className="h-3.5 w-3.5 text-[#94a3b8] sm:hidden" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
