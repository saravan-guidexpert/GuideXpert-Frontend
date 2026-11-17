import { GUIDEXPERT_LOGO_URL } from '../ResultsShell';

export default function ResultPageHeader({ onLogout, loggingOut }) {
  return (
    <header className="border-b border-[#E5EAF0] pb-4">
      <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <img src={GUIDEXPERT_LOGO_URL} alt="GuideXpert" className="h-7 w-auto shrink-0 object-contain" />
        <p className="hidden truncate text-sm font-semibold text-[#102A3D] sm:block">JEE Main Mock Test</p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
        <span className="rounded-full bg-[#E7F6EF] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#127A50] uppercase">
          Attempted
        </span>
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="text-sm font-semibold text-[#69798A] transition hover:text-[#102A3D] disabled:opacity-60"
        >
          {loggingOut ? 'Signing out…' : 'Log out'}
        </button>
      </div>
      </div>
      <p className="mt-2 text-sm font-semibold text-[#102A3D] sm:hidden">JEE Main Mock Test</p>
    </header>
  );
}
