export default function ResultErrorState({ message, onRetry }) {
  return (
    <div className="rounded-2xl border border-[#E5EAF0] bg-white px-5 py-8">
      <h1 className="font-sw-display text-2xl font-semibold tracking-tight text-[#102A3D]">Unable to load result</h1>
      <p className="mt-2 text-sm text-red-700" role="alert">{message}</p>
      <button type="button" className="mt-5 text-sm font-semibold text-[#0B3B65]" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
