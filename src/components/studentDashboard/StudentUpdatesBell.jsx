import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiExternalLink } from 'react-icons/fi';
import { formatUpdateDate } from '../../utils/studentWorkspaceUpdates';

const PRIORITY_DOT = {
  normal: 'bg-[#94a3b8]',
  important: 'bg-[#f27921]',
  urgent: 'bg-[#dc2626]',
};

export default function StudentUpdatesBell({
  items = [],
  unreadCount = 0,
  open,
  onToggle,
  onClose,
  onOpenItem,
  loading,
}) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) onClose?.();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={onToggle}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[#666] transition hover:bg-[#f5f6f8] hover:text-[#333]"
        aria-label="Education updates"
        aria-expanded={open}
      >
        <FiBell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f27921] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-[60] mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
          <div className="flex items-center justify-between border-b border-[#f1f5f9] bg-[#fafbfc] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#0f172a]">Updates</p>
              <p className="text-[11px] text-[#94a3b8]">Exams, admissions & deadlines</p>
            </div>
            <Link
              to="/students/updates"
              onClick={onClose}
              className="text-xs font-semibold text-[#f27921] hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-[#94a3b8]">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#94a3b8]">
                No education updates right now.
              </p>
            ) : (
              <ul>
                {items.slice(0, 8).map((item) => {
                  const href = item.linkUrl || '/students/updates';
                  const isExternal = /^https?:\/\//i.test(href);
                  const content = (
                    <>
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[item.priority] || PRIORITY_DOT.normal}`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          {item.tag ? (
                            <span className="rounded bg-[#fff4ed] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#e06810]">
                              {item.tag}
                            </span>
                          ) : null}
                          <span className="text-[11px] text-[#94a3b8]">
                            {formatUpdateDate(item.publishedAt)}
                          </span>
                        </span>
                        <span className="mt-1 block text-sm font-semibold text-[#0f172a]">
                          {item.title}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-[#64748b]">
                          {item.summary}
                        </span>
                      </span>
                      {isExternal ? (
                        <FiExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-[#94a3b8]" />
                      ) : null}
                    </>
                  );

                  return (
                    <li key={item.id} className="border-b border-[#f1f5f9] last:border-0">
                      {isExternal ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => onOpenItem?.(item)}
                          className="flex gap-3 px-4 py-3 transition hover:bg-[#f8fafc]"
                        >
                          {content}
                        </a>
                      ) : (
                        <Link
                          to={href}
                          onClick={() => onOpenItem?.(item)}
                          className="flex gap-3 px-4 py-3 transition hover:bg-[#f8fafc]"
                        >
                          {content}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
