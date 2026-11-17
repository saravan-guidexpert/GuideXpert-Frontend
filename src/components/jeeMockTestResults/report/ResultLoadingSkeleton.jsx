export default function ResultLoadingSkeleton() {
  return (
    <div className="animate-pulse" aria-label="Loading result">
      <div className="flex items-center justify-between border-b border-[#E5EAF0] pb-4">
        <div className="h-7 w-40 rounded bg-[#E5EAF0]" />
        <div className="h-6 w-20 rounded-full bg-[#E5EAF0]" />
      </div>
      <div className="mt-5 h-3 w-48 rounded bg-[#E5EAF0]" />
      <div className="mt-3 h-8 w-64 max-w-full rounded bg-[#E5EAF0]" />
      <div className="mt-2 h-4 w-40 rounded bg-[#E5EAF0]" />
      <div className="mt-5 h-40 rounded-2xl bg-white" />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="h-44 rounded-2xl bg-white" />
        <div className="h-44 rounded-2xl bg-white" />
      </div>
      <div className="mt-3 h-36 rounded-2xl bg-white" />
    </div>
  );
}
