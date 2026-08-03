import { FiArrowLeft, FiX } from 'react-icons/fi';
import { formatPhoneDisplay, LI } from './leadIntelligenceUtils';

/** Compact header content for the shared top row (parent supplies h-14 shell). */
export default function LeadChatHeader({
  displayName,
  phone,
  onClose,
  showBack = false,
  bare = false,
}) {
  const inner = (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        {showBack ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] p-1.5 text-[#6B7280] transition-all duration-200 hover:bg-[#F8FAFC] xl:hidden"
            aria-label="Back to list"
          >
            <FiArrowLeft className="h-4 w-4" />
          </button>
        ) : null}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[12px] font-semibold text-white">
          {(displayName || '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className={`truncate text-[14px] font-semibold leading-tight ${LI.text}`}>
            {displayName}
          </h2>
          <p className={`truncate text-[12px] leading-tight tabular-nums ${LI.muted}`}>
            {formatPhoneDisplay(phone)}
          </p>
        </div>
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-[10px] p-1.5 text-[#6B7280] transition-all duration-200 hover:bg-[#F8FAFC]"
          aria-label="Close"
        >
          <FiX className="h-4 w-4" />
        </button>
      ) : null}
    </>
  );

  if (bare) {
    return <div className="flex w-full items-center justify-between gap-3">{inner}</div>;
  }

  return <div className={`${LI.panelHeader} justify-between gap-3`}>{inner}</div>;
}
