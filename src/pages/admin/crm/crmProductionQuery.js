export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function analyticsParams({ period, from, to, timeZone }) {
  if (period === 'custom') {
    if (!from || !to || from > to) {
      return { error: 'Enter a start date on or before the end date. Nothing is counted until the range is valid.' };
    }
    return { query: { period, from, to, timeZone } };
  }
  return { query: { period, timeZone } };
}

export function calendarParams({ mode, day, month, from, to, page, timeZone }) {
  const query = { timeZone, page: page || 1, limit: 20 };
  if (mode === 'day') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) {
      return { error: 'Choose a valid day.' };
    }
    query.day = day;
  } else if (mode === 'month') {
    if (!/^\d{4}-\d{2}$/.test(month || '')) {
      return { error: 'Choose a valid month.' };
    }
    query.month = month;
  } else {
    if (!from || !to || from > to) {
      return { error: 'Enter a start date on or before the end date. Nothing is counted until the range is valid.' };
    }
    query.from = from;
    query.to = to;
  }
  return { query };
}
