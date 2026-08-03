/**
 * Reusable KPI metric card for admin dashboard.
 * Optional: icon, top accent bar, subtitle/context, trend. Theme-aligned hover and focus.
 * When interactive, acts as a button (click + Enter/Space) and can expose data-funnel-card for popovers.
 */
export default function KpiCard({
  label,
  value,
  trend,
  trendLabel,
  title,
  className = '',
  icon: Icon = null,
  accent = false,
  subtitle = '',
  compact = false,
  interactive = false,
  onActivate = null,
  ariaExpanded = false,
  funnelCard = false,
}) {
  const hasTrend = trend != null && trend !== 0;
  const trendUp = trend > 0;
  const showAccent = accent === true || accent === 'hero';
  const accentAlways = accent === 'hero';

  const interactiveProps =
    interactive && typeof onActivate === 'function'
      ? {
          role: 'button',
          tabIndex: 0,
          onClick: onActivate,
          onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onActivate(e);
            }
          },
          'aria-haspopup': 'dialog',
          'aria-expanded': ariaExpanded,
          ...(funnelCard ? { 'data-funnel-card': '' } : {}),
        }
      : {};

  return (
    <div
      {...interactiveProps}
      className={`
        relative rounded-xl border border-primary-blue-200/70 bg-white portal-card
        transition-all duration-200
        focus-visible:ring-2 focus-visible:ring-primary-navy focus-visible:ring-offset-2 focus-visible:outline-none
        ${compact ? 'p-3 shadow-none hover:border-primary-blue-300 hover:shadow-sm' : 'p-4 shadow-sm hover:border-primary-blue-300 hover:shadow-md hover:-translate-y-0.5'}
        ${showAccent ? 'group' : ''}
        ${interactive ? 'cursor-pointer' : ''}
        ${className}
      `}
      title={title || label}
    >
      {showAccent && (
        <div
          className={`
            absolute left-0 right-0 top-0 h-[3px] rounded-t-xl bg-primary-navy transition-opacity duration-200
            ${accentAlways ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}
          aria-hidden
        />
      )}
      <div>
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.12em] min-w-0 break-words leading-snug">
            {label}
          </p>
          {Icon && (
            <span className="shrink-0 text-primary-blue-400" aria-hidden>
              <Icon className="w-4 h-4" />
            </span>
          )}
        </div>
        <p
          className={`${
            compact ? 'text-[1.5rem] leading-7' : 'text-[1.75rem] leading-8'
          } font-semibold text-primary-navy tabular-nums truncate`}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && (
          <p className="mt-1 text-[11px] text-slate-500" role="status">
            {subtitle}
          </p>
        )}
        {hasTrend && (
          <p
            className={`mt-1 text-xs font-medium ${
              trendUp ? 'text-success' : 'text-error'
            }`}
            role="status"
          >
            {trendUp ? '↑' : '↓'} {Math.abs(trend)}% {trendLabel || 'vs previous'}
          </p>
        )}
      </div>
    </div>
  );
}
