/**
 * Safe, lightweight markdown → HTML for chat replies.
 * Supports: paragraphs, **bold**, *italic*, `code`, -/* bullets, 1. numbered lists.
 */

function escapeHtml(text) {
  if (text == null || typeof text !== 'string') return '';
  return text.replace(/[&<>"']/g, (ch) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[ch];
  });
}

function inlineFormat(escaped) {
  return escaped
    .replace(/`([^`]+)`/g, '<code class="rounded bg-[#f1f5f9] px-1 py-0.5 text-[12px] text-[#0f172a]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-[#041e30]">$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em class="italic text-[#334155]">$2</em>');
}

/**
 * @param {string} raw
 * @returns {string} Safe HTML
 */
export function formatChatReplyHtml(raw) {
  if (raw == null || typeof raw !== 'string') return '';
  let text = raw.trim();
  if (!text) return '';

  // Normalize Windows newlines and common list markers
  text = text.replace(/\r\n/g, '\n').replace(/\u2022/g, '-');

  const lines = text.split('\n');
  const parts = [];
  let i = 0;

  const flushParagraph = (buffer) => {
    const body = buffer.join(' ').replace(/\s+/g, ' ').trim();
    if (!body) return;
    parts.push(
      `<p class="mb-2.5 last:mb-0 text-[13px] leading-relaxed text-[#334155] sm:text-sm">${inlineFormat(escapeHtml(body))}</p>`
    );
  };

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    const bulletMatch = trimmed.match(/^([-*•])\s+(.+)$/);
    const numberMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);

    if (bulletMatch || numberMatch) {
      const isNumbered = Boolean(numberMatch);
      const items = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t) break;
        const b = t.match(/^([-*•])\s+(.+)$/);
        const n = t.match(/^(\d+)[.)]\s+(.+)$/);
        if (isNumbered ? !n : !b) break;
        items.push(inlineFormat(escapeHtml((n || b)[2])));
        i += 1;
      }
      const listClass = isNumbered
        ? 'mb-2.5 list-decimal space-y-1.5 pl-5 last:mb-0'
        : 'mb-2.5 list-disc space-y-1.5 pl-5 last:mb-0';
      parts.push(`<${isNumbered ? 'ol' : 'ul'} class="${listClass}">`);
      items.forEach((item) => {
        parts.push(`<li class="text-[13px] leading-relaxed text-[#334155] sm:text-sm">${item}</li>`);
      });
      parts.push(isNumbered ? '</ol>' : '</ul>');
      continue;
    }

    // Heading-like **Title** alone on a line
    const headingOnly = trimmed.match(/^\*\*(.+)\*\*:?\s*$/);
    if (headingOnly) {
      parts.push(
        `<p class="mb-1.5 mt-3 first:mt-0 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#041e30]">${escapeHtml(headingOnly[1])}</p>`
      );
      i += 1;
      continue;
    }

    const para = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t) break;
      if (/^([-*•]|\d+[.)])\s+/.test(t)) break;
      if (/^\*\*.+\*\*:?\s*$/.test(t)) break;
      para.push(t);
      i += 1;
    }
    flushParagraph(para);
  }

  return parts.join('') || `<p class="text-sm text-[#334155]">${inlineFormat(escapeHtml(text))}</p>`;
}
