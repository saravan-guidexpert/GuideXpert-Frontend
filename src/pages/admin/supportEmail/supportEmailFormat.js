export const SUPPORT_EMAIL_LAYOUT = {
  page: 'mx-auto w-full max-w-6xl space-y-4 px-3 py-4 sm:px-4 md:px-6',
  stats: 'grid grid-cols-2 gap-3 lg:grid-cols-4',
  table: 'hidden md:block overflow-x-auto',
  cards: 'space-y-3 md:hidden',
  panel: 'rounded-lg border border-slate-200 bg-white'
};

export function supportEmailQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const EMPTY_COPY = 'Nothing matches these filters.';
export const ERROR_COPY = 'The support dashboard could not be loaded.';
export const LOADING_COPY = 'Loading support email data';
