import { useEffect } from 'react';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import { ApplyModalProvider } from '../../contexts/ApplyModalContext';
import terms from './termsContent.json';

const bodyClass = 'text-base leading-7 text-[#3d3d3d]';

function TermText({ text }) {
  const defined = text.match(/^(“[^”]+”:?)/);
  if (!defined) return text;
  return (
    <>
      <span className="font-semibold text-[#1a1a1a]">{defined[1]}</span>
      {text.slice(defined[1].length)}
    </>
  );
}

function BulletList({ items, nested = false }) {
  return (
    <ul className={nested ? 'mt-2 list-[circle] space-y-2 pl-5' : 'list-disc space-y-2.5 pl-5 marker:text-[#6b6b6b]'}>
      {items.map((item) => (
        <li key={item.text} className={bodyClass}>
          <TermText text={item.text} />
          {item.children?.length ? (
            <BulletList items={item.children.map((child) => ({ text: child }))} nested />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function WindowTable({ headers, rows }) {
  return (
    <div className="my-2 overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse border border-[#e4e4e4] text-left text-sm text-[#3d3d3d]">
        <thead>
          <tr className="bg-[#fafafa]">
            {headers.map((header) => (
              <th key={header} className="border border-[#e4e4e4] px-3 py-2.5 font-semibold text-[#1a1a1a]">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell, index) => (
                <td
                  key={`${cell}-${index}`}
                  className={`border border-[#e4e4e4] px-3 py-2.5 ${index === 0 ? 'font-medium text-[#1a1a1a]' : ''}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TermsAndConditionsPage() {
  useEffect(() => {
    document.title = 'Terms & Conditions | GuideXpert';
    window.scrollTo(0, 0);
  }, []);

  return (
    <ApplyModalProvider>
      <div className="flex min-h-screen flex-col bg-[#f4f5f7] text-[#1a1a1a]">
        <Header standalone />
        <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <article className="mx-auto w-full max-w-7xl rounded-lg border border-[#e6e6e6] bg-white px-6 py-8 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:px-10 sm:py-11 lg:px-14 lg:py-12">
            <header>
              <h1 className="text-balance text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-[#a32020] sm:text-[2.15rem]">
                Terms & Conditions for the Admission Affiliate Referral Program
              </h1>
              <div className="mt-5 border-b border-[#d9d9d9]" />
              <p className="mt-5 text-base font-semibold text-[#1a1a1a]">{terms.effective}</p>
              <p className="mt-1 text-sm text-[#6b6b6b]">
                GuideXpert Referral (NIAT) Program · Andhra Pradesh & Telangana · 2026–2027
              </p>
            </header>

            <div className="mt-6 space-y-4">
              {terms.intro.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className={bodyClass}>
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="mt-10 space-y-9">
              {terms.sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-28">
                  <h2 className="text-lg font-semibold leading-snug text-[#1a1a1a]">
                    {section.number}. {section.title}
                  </h2>
                  <div className="mt-3 space-y-3.5">
                    {section.blocks.map((block, index) => {
                      if (block.type === 'h3') {
                        return (
                          <h3 key={`${section.id}-h-${index}`} className="pt-2 text-base font-semibold text-[#1a1a1a]">
                            {block.text}
                          </h3>
                        );
                      }
                      if (block.type === 'p') {
                        return (
                          <p key={`${section.id}-p-${index}`} className={bodyClass}>
                            {block.text}
                          </p>
                        );
                      }
                      if (block.type === 'ul') {
                        return <BulletList key={`${section.id}-ul-${index}`} items={block.items} />;
                      }
                      if (block.type === 'table') {
                        return <WindowTable key={`${section.id}-t-${index}`} headers={block.headers} rows={block.rows} />;
                      }
                      return null;
                    })}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </main>
        <Footer />
      </div>
    </ApplyModalProvider>
  );
}
