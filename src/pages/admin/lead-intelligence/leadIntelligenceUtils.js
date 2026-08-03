export const PANEL_CLASS =
  'rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-100';
export const PANEL_HEADER_CLASS = 'px-5 py-4 border-b border-slate-200/80';
export const SECTION_TITLE_CLASS = 'text-[15px] font-semibold text-slate-900 tracking-tight';
export const SECTION_SUBTITLE_CLASS = 'text-xs text-slate-500 mt-0.5';

export const STAGE_TONE = {
  hot: 'bg-red-100 text-red-800 border-red-200',
  warm: 'bg-orange-100 text-orange-800 border-orange-200',
  cold: 'bg-blue-100 text-blue-800 border-blue-200',
};

export function getStageTone(stage) {
  const key = String(stage || '').trim().toLowerCase();
  return STAGE_TONE[key] || 'bg-gray-100 text-gray-700 border-gray-200';
}

export function formatLeadDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return String(value);
  }
}

export function formatConfidence(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Math.round(Number(value) * 100)}%`;
}

export function flattenRecentEvents(recentEvents = []) {
  const rows = [];
  for (const eventDoc of recentEvents) {
    const createdAt = eventDoc?.createdAt || null;
    const nested = Array.isArray(eventDoc?.events) ? eventDoc.events : [];
    for (const event of nested) {
      rows.push({
        type: event?.type || '—',
        value: event?.value || '—',
        confidence: event?.confidence,
        createdAt,
      });
    }
  }
  return rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export function isValidPhone10(value) {
  return /^\d{10}$/.test(String(value || '').trim());
}

export function formatLeadProfileSummary(row = {}) {
  const tags = [];
  if (row.exam) tags.push(row.exam);
  if (row.handoffRequested) tags.push('Handoff');
  if (row.demoInterested) tags.push('Demo');
  if (row.priceSensitive) tags.push('Price');
  if (row.languagePreference) tags.push(row.languagePreference);
  return tags;
}

/** Humanize no-reply duration in ms (e.g. "12m", "2h 5m", "1d 3h"). */
export function formatNoReplyDuration(ms) {
  if (ms == null || !Number.isFinite(Number(ms)) || Number(ms) < 0) return '—';
  const totalSec = Math.floor(Number(ms) / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.floor(totalSec / 60);
  if (totalMin < 60) return `${totalMin}m`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours < 24) return mins ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  return remH ? `${days}d ${remH}h` : `${days}d`;
}

export function formatChatTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return String(value);
  }
}
