export default function ResultActions({ onDownload, downloading, downloadError, downloadReady }) {
  return (
    <div className="jee-report-in pt-1" style={{ animationDelay: '200ms' }}>
      <button
        type="button"
        onClick={onDownload}
        disabled={downloading}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#F58220] px-5 text-[15px] font-semibold text-white transition hover:bg-[#e07416] enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M10 3.5v9" strokeLinecap="round" />
          <path d="M6.5 9.5 10 13l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16.5h12" strokeLinecap="round" />
        </svg>
        {downloading ? 'Preparing PDF…' : 'Download Result PDF'}
      </button>
      {downloadReady && (
        <p className="mt-2 text-sm font-medium text-[#127A50]" role="status">Result PDF downloaded.</p>
      )}
      {downloadError && (
        <p className="mt-2 text-sm text-red-700" role="alert">{downloadError}</p>
      )}
    </div>
  );
}
