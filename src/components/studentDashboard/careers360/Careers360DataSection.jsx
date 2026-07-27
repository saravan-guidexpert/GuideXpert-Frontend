import { Link } from 'react-router-dom';
import { LuArrowRight, LuMapPin } from 'react-icons/lu';
import { DATA_STATS, SECTION_COPY } from './careers360HomeData';
import { LAYOUT } from './careers360Theme';
import { TRENDING_COLLEGES } from '../landing/landingPageData';
import CollegeCampusImage from '../landing/CollegeCampusImage';

export function Careers360DataSection() {
  const { title, description } = SECTION_COPY.data;
  // Images only on the top featured set — keep the rest text-only
  const withImages = TRENDING_COLLEGES.slice(0, 3);
  const textOnly = TRENDING_COLLEGES.slice(3, 7);

  return (
    <section className={`${LAYOUT.section} bg-[#f7f8fa]`}>
      <div className={LAYOUT.container}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f27921]">
              Directory
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl">
              {title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#666]">{description}</p>
          </div>
          <Link
            to="/students/college-predictor"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563eb] transition hover:underline"
          >
            Explore predictor <LuArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mb-10 grid grid-cols-2 overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white sm:grid-cols-4">
          {DATA_STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`px-5 py-6 text-center sm:px-6 sm:py-7 ${
                i % 2 === 1 ? 'border-l border-[#eef0f3]' : ''
              } ${i >= 2 ? 'border-t border-[#eef0f3] sm:border-t-0' : ''} ${
                i >= 1 ? 'sm:border-l sm:border-[#eef0f3]' : ''
              }`}
            >
              <p className="text-2xl font-bold tracking-tight text-[#1a1a1a] sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1.5 text-xs font-medium leading-snug text-[#666] sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-[#1a1a1a]">Featured colleges</h3>
            <p className="mt-1 text-sm text-[#666]">
              Institutes students explore most often when building shortlists.
            </p>
          </div>
          <Link
            to="/students/college-predictor"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-[#2563eb] hover:underline sm:inline-flex"
          >
            See all <LuArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ul className="grid gap-4 sm:grid-cols-3">
          {withImages.map((college) => (
            <li key={college.id}>
              <Link
                to={college.to}
                className="group block overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white transition hover:border-[#f27921]/40"
              >
                <div className="aspect-[16/10] overflow-hidden bg-[#eef2f7]">
                  <CollegeCampusImage
                    id={college.id}
                    name={college.name}
                    src={college.image}
                    className="h-full w-full"
                    imgClassName="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="px-4 py-4">
                  <p className="font-semibold text-[#1a1a1a] transition group-hover:text-[#f27921]">
                    {college.name}
                  </p>
                  {college.location ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#888]">
                      <LuMapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {college.location}
                    </p>
                  ) : null}
                  {college.placement ? (
                    <p className="mt-2 text-xs font-medium text-[#555]">{college.placement}</p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {textOnly.length > 0 ? (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {textOnly.map((college) => (
              <li key={college.id}>
                <Link
                  to={college.to}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3.5 transition hover:border-[#f27921]/35"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1a1a1a] transition group-hover:text-[#f27921]">
                      {college.name}
                    </p>
                    {college.location ? (
                      <p className="mt-0.5 text-xs text-[#888]">{college.location}</p>
                    ) : null}
                  </div>
                  <LuArrowRight
                    className="h-3.5 w-3.5 shrink-0 text-[#ccc] transition group-hover:text-[#f27921]"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
