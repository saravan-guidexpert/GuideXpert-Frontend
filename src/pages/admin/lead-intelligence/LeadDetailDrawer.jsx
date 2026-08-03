import LeadDetailPanel from './LeadDetailPanel';

/**
 * Slide-over used by Prediction Dashboard and other entry points.
 * Shares the same scoring + transcript workspace as Lead Intelligence.
 */
export default function LeadDetailDrawer({ phone, onClose }) {
  if (!phone) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close lead details"
      />
      <aside className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-slate-200">
        <LeadDetailPanel phone={phone} onClose={onClose} />
      </aside>
    </div>
  );
}
