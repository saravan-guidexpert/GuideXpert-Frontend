import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export const GUIDEXPERT_LOGO_URL =
  'https://res.cloudinary.com/dfqdb1xws/image/upload/v1773394627/GuideXpert_Logo_2_icepsv.png';

export const resultsPrimaryButtonClass =
  'inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#f27921] px-4 text-base font-semibold text-white transition duration-150 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60';

export const resultsSecondaryButtonClass =
  'inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#d8dce6] bg-white px-4 text-base font-semibold text-[#041e30] transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60';

export default function ResultsShell({
  title,
  children,
  logoLinksHome = true,
  dense = false,
  hideLogo = false,
  wide = false,
}) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, noarchive';
    meta.setAttribute('data-jee-results', 'true');
    document.head.appendChild(meta);
    return () => {
      document.title = previousTitle;
      meta.remove();
    };
  }, [title]);

  const logo = (
    <img src={GUIDEXPERT_LOGO_URL} alt="GuideXpert" className="h-8 w-auto object-contain" />
  );

  return (
    <main className={`min-h-dvh overflow-x-hidden text-[#102A3D] ${wide ? 'bg-[#F5F7FA]' : 'bg-[#f6f7f9]'}`}>
      <div className={`mx-auto flex min-h-dvh w-full flex-col px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(6.5rem,calc(env(safe-area-inset-bottom)+5.5rem))] ${wide ? 'max-w-[960px]' : 'max-w-xl'}`}>
        {!hideLogo && (
          <div className={dense ? 'mb-5' : 'mb-8'}>
            {logoLinksHome ? (
              <Link to="/" aria-label="GuideXpert home">
                {logo}
              </Link>
            ) : (
              logo
            )}
          </div>
        )}
        {children}
      </div>
    </main>
  );
}
