import { Link } from 'react-router-dom';
import { LuArrowRight, LuBadgeCheck, LuUsers, LuBriefcase } from 'react-icons/lu';
import { LAYOUT } from './careers360Theme';
import './studentsSectionMotion.css';

const HIGHLIGHTS = [
  {
    icon: LuUsers,
    title: 'Guide real student journeys',
    text: 'Help families navigate exams, colleges, and career choices with clarity.',
  },
  {
    icon: LuBadgeCheck,
    title: 'Train with GuideXpert',
    text: 'Get structured playbooks, tools, and certification to counsel confidently.',
  },
  {
    icon: LuBriefcase,
    title: 'Build a professional practice',
    text: 'Grow as a trusted advisor with PAN-India reach and strong earning potential.',
  },
];

export default function Careers360BecomeCounsellorSection() {
  return (
    <section
      className={`${LAYOUT.section} bg-[#f5f7fa]`}
      aria-labelledby="become-counsellor-heading"
    >
      <div className={LAYOUT.container}>
        <div className="relative overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
          <div
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(ellipse_at_70%_40%,rgba(242,121,33,0.12),transparent_60%),linear-gradient(135deg,#0f172a_0%,#1a2332_55%,#0c3a42_100%)] lg:block"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-10 top-8 hidden h-40 w-40 rounded-full border border-white/10 lg:block gx-anim-float"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-10 right-[18%] hidden h-24 w-24 rounded-full bg-[#f27921]/25 blur-2xl lg:block gx-anim-pulse"
            aria-hidden
          />

          <div className="relative grid gap-0 lg:grid-cols-2">
            <div className="px-6 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f27921]">
                For professionals
              </p>
              <h2
                id="become-counsellor-heading"
                className="mt-3 max-w-md text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl"
              >
                Guide students as a GuideXpert counsellor
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-[#666]">
                If you want to shape careers—not just give advice—join GuideXpert as a certified
                counsellor and help students choose the right path with confidence.
              </p>

              <ul className="mt-8 space-y-5">
                {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
                  <li key={title} className="flex gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff4ed] text-[#f27921]">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#1a1a1a]">{title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-[#666]">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-9">
                <Link
                  to="/become-counsellor"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f27921] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#e06810]"
                >
                  Become a counsellor
                  <LuArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>

            <div className="relative flex min-h-[260px] items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1a2332] to-[#0c3a42] px-6 py-12 sm:px-10 sm:py-14 lg:min-h-0 lg:bg-none lg:px-12 lg:py-14">
              <div className="relative w-full max-w-md text-center text-white">
                <p className="gx-shiny-label text-[11px] font-semibold uppercase tracking-[0.2em]">
                  Professional path
                </p>
                <p className="gx-shiny-text mt-4 text-xl font-bold leading-snug tracking-tight sm:text-2xl sm:leading-snug">
                  Turn expertise into impact for every student you guide.
                </p>
                <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-white/70">
                  Explore training, tools, and how GuideXpert counsellors work—then apply to join.
                </p>
                <Link
                  to="/become-counsellor"
                  className="mt-7 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white/95 transition hover:text-[#f27921]"
                >
                  View counsellor programme
                  <LuArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
