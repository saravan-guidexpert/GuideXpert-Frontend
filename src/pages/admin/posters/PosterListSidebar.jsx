import { FiLayers, FiPlus, FiGlobe } from 'react-icons/fi';

export default function PosterListSidebar({
  posters,
  selectedId,
  isNew,
  onSelect,
  onCreate,
  disabled,
  emptyHint = 'Create one to upload an SVG and map it to a route.',
}) {
  return (
    <div className="flex h-full min-h-[min(70vh,640px)] flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-gray-500">
              Library
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{posters.length} template{posters.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onCreate}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-navy py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-[0.97] disabled:opacity-50"
        >
          <FiPlus className="h-[1.125rem] w-[1.125rem] shrink-0 opacity-95" aria-hidden />
          New template
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {posters.length === 0 && !isNew && (
          <div className="mx-2 mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center">
            <FiLayers className="mx-auto h-8 w-8 text-gray-300" aria-hidden />
            <p className="mt-3 text-sm font-medium text-gray-700">No poster templates</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              {emptyHint}
            </p>
          </div>
        )}

        <ul className="space-y-1">
          {posters.map((p) => {
            const active = !isNew && selectedId === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className={`flex w-full rounded-xl px-3 py-3 text-left transition ${
                    active
                      ? 'bg-primary-navy/[0.08] shadow-[inset_3px_0_0_0_rgb(77,142,199)]'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`min-w-0 truncate text-sm font-medium ${active ? 'text-primary-navy' : 'text-gray-900'}`}
                      >
                        {p.name || 'Untitled'}
                      </span>
                      {p.published ? (
                        <span
                          className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-emerald-900 ring-1 ring-emerald-200/80"
                          title="Published to public URL"
                        >
                          <FiGlobe className="h-2.5 w-2.5" aria-hidden />
                          Live
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[0.6875rem] text-gray-500">{p.route}</div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {isNew && (
          <div className="mx-2 mt-2 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-3 text-sm text-amber-950">
            <span className="font-medium">Draft</span>
            <span className="mt-0.5 block text-xs font-normal text-amber-900/80">
              Save to store this template.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
