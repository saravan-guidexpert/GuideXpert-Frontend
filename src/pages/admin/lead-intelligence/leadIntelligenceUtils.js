/** Premium messaging UI tokens (8pt spacing, Intercom/Slack-style). */
export const LI = {
  bg: 'bg-[#F8FAFC]',
  text: 'text-[#111827]',
  muted: 'text-[#6B7280]',
  border: 'border-[#E5E7EB]',
  primary: 'text-[#2563EB]',
  primaryBg: 'bg-[#2563EB]',
  card: 'rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]',
  cardHover: 'transition-all duration-200 hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(0,0,0,0.05)]',
  input:
    'rounded-[10px] border border-[#E5E7EB] bg-white text-[#111827] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20',
  scrollbar:
    '[scrollbar-width:thin] [scrollbar-color:rgba(60,60,67,0.3)_transparent] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(60,60,67,0.3)] hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(60,60,67,0.45)]',
  /** Same thin iOS overlay style (kept for call sites that used wide before). */
  scrollbarWide:
    '[scrollbar-width:thin] [scrollbar-color:rgba(60,60,67,0.3)_transparent] [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(60,60,67,0.3)] hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(60,60,67,0.45)]',
  /** Shared column header height for inbox / chat / details baseline. */
  panelHeader:
    'flex h-14 shrink-0 items-center border-b border-[#E5E7EB] bg-white px-3',
};

export const PANEL_CLASS =
  'overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]';
export const PANEL_HEADER_CLASS = 'px-4 py-3 border-b border-[#E5E7EB]';
export const SECTION_TITLE_CLASS = 'text-[14px] font-semibold uppercase tracking-wide text-[#6B7280]';
export const SECTION_SUBTITLE_CLASS = 'text-[13px] text-[#6B7280] mt-0.5';

export const STAGE_TONE = {
  hot: 'bg-red-50 text-red-700 border-red-100',
  warm: 'bg-orange-50 text-orange-700 border-orange-100',
  cold: 'bg-blue-50 text-blue-700 border-blue-100',
  unscored: 'bg-gray-50 text-[#6B7280] border-[#E5E7EB]',
};

export function getStageTone(stage) {
  const key = String(stage || '').trim().toLowerCase();
  if (!key || key === 'unknown' || key === 'null') {
    return STAGE_TONE.unscored;
  }
  return STAGE_TONE[key] || STAGE_TONE.unscored;
}

export function getStageLabel(stage) {
  const key = String(stage || '').trim().toLowerCase();
  if (!key || key === 'unknown' || key === 'null') {
    return 'Unscored';
  }
  return key;
}

export function formatPhoneDisplay(phone) {
  const digits = String(phone || '').replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) return phone || '—';
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function formatLeadShortDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return String(value);
  }
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

export function formatChatDateLabel(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return String(value);
  }
}

export function groupMessagesByDate(messages = []) {
  const groups = [];
  let currentKey = null;
  for (const message of messages) {
    const key = message?.at ? new Date(message.at).toDateString() : 'unknown';
    if (key !== currentKey) {
      currentKey = key;
      groups.push({ type: 'date', key, label: formatChatDateLabel(message.at) });
    }
    groups.push({ type: 'message', message });
  }
  return groups;
}
