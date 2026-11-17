export const STRONG_MOCK_SCORE = 150;

export function scorePopupKind(obtained) {
  if (typeof obtained !== 'number' || !Number.isFinite(obtained)) return null;
  return obtained >= STRONG_MOCK_SCORE ? 'strong' : 'steady';
}

export function formatScore(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Not available';
  return String(value);
}

export function formatScorePair(obtained, total) {
  const hasTotal = typeof total === 'number' && Number.isFinite(total);
  if (typeof obtained !== 'number' || !Number.isFinite(obtained)) {
    return hasTotal ? `Not available / ${formatScore(total)}` : 'Not available';
  }
  if (!hasTotal) return formatScore(obtained);
  return `${formatScore(obtained)} / ${formatScore(total)}`;
}

export function scorePercentage(obtained, total) {
  if (typeof obtained !== 'number' || typeof total !== 'number') return null;
  if (!Number.isFinite(obtained) || !Number.isFinite(total) || total === 0) return null;
  return Math.round((obtained / total) * 10000) / 100;
}

export function barPercent(percentage) {
  if (typeof percentage !== 'number' || !Number.isFinite(percentage) || percentage <= 0) return 0;
  return Math.min(percentage, 100);
}

export function sectionTimeShare(mcqMinutes, numericalMinutes) {
  if (typeof mcqMinutes !== 'number' || typeof numericalMinutes !== 'number') return null;
  if (!Number.isFinite(mcqMinutes) || !Number.isFinite(numericalMinutes)) return null;
  if (mcqMinutes < 0 || numericalMinutes < 0) return null;
  const total = mcqMinutes + numericalMinutes;
  if (total <= 0) return null;
  const mcq = Math.round((mcqMinutes / total) * 1000) / 10;
  return { mcq, numerical: Math.round((100 - mcq) * 10) / 10 };
}

export function formatPercentage(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const rounded = Math.round(value * 100) / 100;
  return `${rounded}%`;
}

export function formatDuration(minutes) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return 'Not available';
  const totalSeconds = Math.round(minutes * 60);
  if (totalSeconds <= 0) return '0 min';
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const parts = [];
  if (hours) parts.push(`${hours} hr`);
  if (mins) parts.push(`${mins} min`);
  if (secs) parts.push(`${secs} sec`);
  return parts.join(' ') || '0 min';
}

export function formatInvitedOn(iso) {
  if (!iso) return 'Not available';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
