import { swPreviewLabel } from './studentWorkspaceUi';

/**
 * Shared “Tool facts” block for the About this tool section.
 * Keeps alignment and hierarchy consistent across all predictors.
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
    <div className="space-y-4">
      {(Icon || name) && (
        <div className="flex items-center gap-3">
          {Icon ? (
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          {name ? <p className="text-sm font-semibold text-[#041e30]">{name}</p> : null}
        </div>
      )}

      {metricLabel || metricValue != null ? (
        <div>
          {metricLabel ? <p className={swPreviewLabel}>{metricLabel}</p> : null}
          {metricValue != null ? (
            <p className="mt-1 font-sw-display text-2xl font-bold tabular-nums tracking-tight text-[#041e30]">
              {metricValue}
            </p>
          ) : null}
        </div>
      ) : null}

      {points.length > 0 ? (
        <ul className="space-y-2.5">
          {points.map((point) => (
            <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-[#3d4754]">
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f27921]"
                aria-hidden
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
