import { swPreviewLabel } from './studentWorkspaceUi';

/**
 * Shared “Tool facts” card for the About this tool section.
 */
export default function ToolFactsPreview({
  icon: Icon = null,
  iconClass = 'bg-[#fff4ed] text-[#f27921]',
  name,
  metricLabel,
  metricValue,
  points = [],
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)]">
      <div className="border-b border-[#eef0f3] bg-gradient-to-br from-[#fbfcfe] to-white px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          {Icon ? (
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f27921]">
              Tool facts
            </p>
            {name ? (
              <p className="mt-1 truncate text-sm font-semibold text-[#041e30]">{name}</p>
            ) : null}
          </div>
        </div>
      </div>

      {metricLabel || metricValue != null ? (
        <div className="border-b border-[#eef0f3] px-4 py-4 sm:px-5">
          {metricLabel ? <p className={swPreviewLabel}>{metricLabel}</p> : null}
          {metricValue != null ? (
            <p className="mt-1.5 font-sw-display text-[1.75rem] font-bold tabular-nums tracking-tight text-[#041e30] sm:text-3xl">
              {metricValue}
            </p>
          ) : null}
        </div>
      ) : null}

      {points.length > 0 ? (
        <ul className="space-y-3 px-4 py-4 sm:px-5">
          {points.map((point) => (
            <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-[#3d4754]">
              <span
                className="mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#fff4ed]"
                aria-hidden
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#f27921]" />
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
