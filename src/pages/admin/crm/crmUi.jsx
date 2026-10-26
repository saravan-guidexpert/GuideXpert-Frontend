import { paginationSummary } from '../../../utils/crmWorkspace';

export function Banner({ tone = 'error', children }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-green-200 bg-green-50 text-green-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
  };
  return (
    <div role="alert" className={`rounded-lg border px-3 py-2.5 text-sm ${styles[tone] || styles.error}`}>
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#003366] focus:ring-2 focus:ring-[#003366]/20';

export function PrimaryButton({ children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg bg-[#003366] px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${props.className || ''}`}
    >
      {children}
    </button>
  );
}

export function Pagination({ page, limit, total, onPage }) {
  const summary = paginationSummary(page, limit, total);
  return (
    <nav className="mt-4 flex items-center justify-between text-sm text-gray-600" aria-label="Pagination">
      <span>{summary.label}</span>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
          disabled={summary.previousDisabled}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
          disabled={summary.nextDisabled}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
