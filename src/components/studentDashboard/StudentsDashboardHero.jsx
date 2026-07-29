import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiSearch, FiX } from 'react-icons/fi';
import {
  HOME_TAGLINE,
  HOME_TAGLINE_LEAD,
  HOME_TAGLINE_PREFIX,
  HOME_TAGLINE_ROTATING,
  HERO_TRUST_STATS,
  POPULAR_PREDICTORS,
} from './careers360/careers360HomeData';
import { LAYOUT } from './careers360/careers360Theme';
import { useCountUp } from './landing/useCountUp';
import { fadeUp, staggerContainer, defaultViewport, smoothTransition } from './landing/motion';
import HeroLiveActivityToasts from './HeroLiveActivityToasts';
import OneOnOneSessionBookingForm from '../oneOnOneSession/OneOnOneSessionBookingForm';

function HeroRotatingWord({ words, interval = 2100 }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, interval);
    return () => window.clearInterval(timer);
  }, [words, interval]);

  return (
    <span className="relative inline-block align-baseline" aria-hidden>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[index]}
          className="inline-block whitespace-nowrap font-normal text-[#f27921]"
          initial={{ opacity: 0, y: '0.3em' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '-0.3em' }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function HeroStatItem({ stat, index }) {
  const { ref, display } = useCountUp(stat.value, {
    suffix: stat.suffix,
    duration: 1800 + index * 180,
  });

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      transition={smoothTransition}
      className="relative min-w-0 rounded-xl border border-[#e6e9f0] bg-white/80 px-2.5 py-3 text-center shadow-[0_8px_24px_-18px_rgba(30,40,80,0.35)] backdrop-blur-sm sm:rounded-2xl sm:px-5 sm:py-5"
    >
      <div
        className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#f27921]/55 to-transparent sm:inset-x-5"
        aria-hidden
      />
      <p className="font-sw-display text-lg font-bold tracking-tight text-[#1a1a1a] sm:text-[1.75rem]">
        {display}
      </p>
      <p className="mt-1 text-[10px] font-medium leading-snug text-[#667085] sm:mt-1.5 sm:text-xs">
        {stat.label}
      </p>
    </motion.div>
  );
}

function HeroTrustStats() {
  return (
    <motion.div
      className="grid grid-cols-3 gap-2 sm:gap-3.5"
      initial="hidden"
      whileInView="visible"
      viewport={defaultViewport}
      variants={staggerContainer}
      aria-label="GuideXpert impact stats"
    >
      {HERO_TRUST_STATS.map((stat, index) => (
        <HeroStatItem key={stat.label} stat={stat} index={index} />
      ))}
    </motion.div>
  );
}

function HeroCounsellingForm() {
  return (
    <motion.div
      className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)]"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={smoothTransition}
    >
      <div className="border-b border-[#e8eaed] bg-[#fbfcfe] px-4 py-3.5 sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f27921]">
          Free session
        </p>
        <h2 className="mt-1 text-base font-bold text-[#0F172A] sm:text-lg">
          Book free IITian 1-on-1 counselling
        </h2>
      </div>
      <div className="max-h-[min(28rem,62vh)] overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
        <OneOnOneSessionBookingForm showIntro={false} />
      </div>
    </motion.div>
  );
}

export default function StudentsDashboardHero({
  searchTerm,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  suggestions,
  showSuggestions,
  onSuggestionPick,
  onClearSearch,
}) {
  const popular = POPULAR_PREDICTORS.filter((p) => p.popular).slice(0, 2);

  return (
    <section
      className="relative overflow-hidden border-b border-[#e8eaed]"
      style={{
        background:
          'linear-gradient(165deg, #f3f0f8 0%, #eef1f8 42%, #f7f8fc 72%, #ffffff 100%)',
      }}
    >
      <div className={`${LAYOUT.container} relative py-6 sm:py-10 lg:py-12`}>
        <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-2 lg:items-start lg:gap-10 xl:gap-12">
          <div className="order-1 min-w-0">
            <motion.h1
              className="max-w-xl text-[1.65rem] font-bold leading-[1.2] tracking-tight text-[#1a1a1a] sm:text-4xl sm:leading-[1.15] lg:text-[2.5rem] lg:leading-[1.12]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={smoothTransition}
            >
              <span className="sr-only">{HOME_TAGLINE}</span>
              <span aria-hidden>
                {HOME_TAGLINE_LEAD}
                <br />
                {HOME_TAGLINE_PREFIX}{' '}
                <HeroRotatingWord words={HOME_TAGLINE_ROTATING} />
              </span>
            </motion.h1>

            <motion.div
              className="relative mt-5 max-w-xl sm:mt-7"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...smoothTransition, delay: 0.06 }}
            >
              <input
                type="search"
                value={searchTerm}
                onFocus={onSearchFocus}
                onBlur={onSearchBlur}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search Colleges, Exams, Courses & more"
                aria-label="Search Colleges, Exams, Courses & more"
                className="w-full rounded-full border border-[#d8dce6] bg-white py-3 pl-4 pr-11 text-sm text-[#333] shadow-[0_2px_12px_rgba(30,40,80,0.06)] placeholder:text-[#9aa0ae] focus:border-[#f27921] focus:outline-none focus:ring-2 focus:ring-[#f27921]/20 sm:py-3.5 sm:pl-5 sm:pr-12 sm:text-[15px]"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#555] sm:right-4"
                  aria-label="Clear search"
                >
                  <FiX className="h-5 w-5" />
                </button>
              ) : (
                <FiSearch className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8b90a0] sm:right-4" />
              )}
              {showSuggestions && suggestions.length > 0 ? (
                <ul className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white py-1 shadow-lg">
                  {suggestions.map((sug) => (
                    <li key={sug}>
                      <button
                        type="button"
                        onMouseDown={() => onSuggestionPick(sug)}
                        className="w-full px-5 py-2.5 text-left text-sm text-[#444] hover:bg-[#fff4ed]"
                      >
                        {sug}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </motion.div>

            <motion.div
              className="mt-4 flex flex-wrap gap-x-2.5 gap-y-3 pt-2 sm:mt-6 sm:gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...smoothTransition, delay: 0.1 }}
            >
              {popular.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="relative inline-flex items-center rounded-full border border-[#d8dce6] bg-white px-3.5 py-2 text-[13px] font-medium text-[#333] shadow-sm transition hover:border-[#f27921]/50 hover:text-[#f27921] sm:px-4 sm:text-sm"
                >
                  <span className="absolute -top-2 left-3 rounded bg-[#f27921] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white">
                    Popular
                  </span>
                  {item.label}
                </Link>
              ))}
            </motion.div>

            {/* Desktop: stats under popular in left column */}
            <div className="mt-9 hidden lg:block">
              <HeroTrustStats />
            </div>
          </div>

          {/* Mobile/tablet: form directly after popular chips; desktop: right column */}
          <div className="order-2 min-w-0 w-full lg:order-2 lg:max-w-none">
            <HeroCounsellingForm />
          </div>

          {/* Mobile/tablet: stats after the booking form */}
          <div className="order-3 min-w-0 lg:hidden">
            <HeroTrustStats />
          </div>
        </div>

        <div className="relative mt-6 min-h-[3.25rem] sm:mt-10 sm:min-h-[3.5rem]">
          <HeroLiveActivityToasts />
        </div>
      </div>
    </section>
  );
}
