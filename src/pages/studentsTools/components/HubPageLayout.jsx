import { Link } from 'react-router-dom';
import { FiHome, FiChevronRight } from 'react-icons/fi';
import { LuArrowRight } from 'react-icons/lu';
import { LAYOUT } from '../../../components/studentDashboard/careers360/careers360Theme';
import { swHubCard, swLinkCta, swPageShell } from './studentWorkspaceUi';

export default function HubPageLayout({
  eyebrow,
  title,
  subtitle,
  cards,
  gridClassName = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
  trustBadge = 'Trusted by 500K+ students',
  homeTo = '/',
}) {
  return (
    <main className={`${swPageShell} !bg-[#f7f8fc]`}>
      <section className="sw-gx-tool-hero-band relative overflow-hidden">
        <div className={`relative ${LAYOUT.container} pb-10 pt-8 sm:pb-12 sm:pt-10 lg:pb-12 lg:pt-10`}>
          <nav
            className="sw-fade-up mb-6 flex flex-wrap items-center gap-1.5 text-[13px] text-[#667085] sm:mb-8"
            aria-label="Breadcrumb"
          >
            <Link
              to={homeTo}
              className="inline-flex items-center gap-1 text-[#667085] transition hover:text-[#f27921]"
            >
              <FiHome className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Home</span>
            </Link>
            <FiChevronRight className="h-3.5 w-3.5 opacity-40" aria-hidden />
            <span className="font-medium text-[#041e30]">{title}</span>
          </nav>

          <header className="sw-fade-up grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)] lg:items-end lg:gap-8">
            <div className="max-w-3xl">
              <p className="font-sw-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f27921]">
                GuideXpert
              </p>
              {eyebrow ? (
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a94a0]">
                  {eyebrow}
                </p>
              ) : null}
              <div className="mt-3 flex gap-3 sm:gap-4">
                <span
                  className="mt-1.5 h-[2.5rem] w-1 shrink-0 rounded-full bg-[#f27921] sm:h-[3rem]"
                  aria-hidden
                />
                <div className="min-w-0">
                  <h1 className="font-sw-display text-[1.65rem] font-bold leading-[1.15] tracking-tight text-[#041e30] sm:text-3xl lg:text-[2.15rem]">
                    {title}
                  </h1>
                  {subtitle ? (
                    <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#5a6570] sm:text-base">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {trustBadge ? (
              <p className="max-w-xs text-sm leading-snug text-[#5a6570] lg:justify-self-end lg:text-right">
                <span className="font-semibold text-[#041e30]">{trustBadge}</span>
                <span className="mt-1 block text-[13px] text-[#667085]">
                  Pick a tool to get started
                </span>
              </p>
            ) : null}
          </header>

          <section className={`${gridClassName} sw-fade-up sw-fade-up-delay-1 mt-8 lg:mt-10`}>
            {cards.map((card, index) => (
              <Link
                key={card.to}
                to={card.to}
                className={`${swHubCard} rounded-2xl shadow-[0_12px_28px_-20px_rgba(15,23,42,0.25)]`}
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  {card.icon ? (
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconClass}`}
                    >
                      <card.icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </div>
                  ) : (
                    <span className="font-sw-display text-xl font-bold tabular-nums text-[#f27921]/70">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  )}
                  <span className="font-sw-display text-sm font-bold tabular-nums text-[#d0d7e1]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h2 className="font-sw-display text-lg font-bold tracking-tight text-[#041e30]">
                  {card.title}
                </h2>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-[#5a6570]">{card.description}</p>
                <span className={swLinkCta}>
                  {card.cta || 'Open tool'} <LuArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </Link>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
