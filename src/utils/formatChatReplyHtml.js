/**
 * Safe, lightweight markdown → HTML for chat replies.
 * Supports: paragraphs, **bold**, __bold__, *italic*, `code`, -/* bullets, 1. numbered lists.
 */

function escapeHtml(text) {
  if (text == null || typeof text !== 'string') return '';
  return text.replace(/[&<>"']/g, (ch) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[ch];
  });
}

function inlineFormat(escaped) {
  let out = escaped
    .replace(/`([^`]+)`/g, '<code class="gx-chat-code">$1</code>')
    // Bold first (non-greedy so multiple **pairs** work)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="gx-chat-strong">$1</strong>')
    .replace(/__(.+?)__/g, '<strong class="gx-chat-strong">$1</strong>')
    // Italic after bold so we do not eat ** markers
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em class="gx-chat-em">$2</em>')
    .replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, '$1<em class="gx-chat-em">$2</em>');

  // Strip leftover unmatched markdown markers so raw ** never shows
  out = out.replace(/\*\*/g, '').replace(/__/g, '');
  return out;
}

/**
 * @param {string} raw
 * @returns {string} Safe HTML
 */
export function formatChatReplyHtml(raw) {
  if (raw == null || typeof raw !== 'string') return '';
  let text = raw.trim();
  if (!text) return '';

  // Normalize newlines, bullets, and odd asterisk variants models sometimes emit
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/\u2022/g, '-')
    .replace(/［/g, '[')
    .replace(/］/g, ']')
    .replace(/＊/g, '*');

  const lines = text.split('\n');
  const parts = [];
  let i = 0;

  const flushParagraph = (buffer) => {
    const body = buffer.join(' ').replace(/\s+/g, ' ').trim();
    if (!body) return;
    parts.push(`<p class="gx-chat-p">${inlineFormat(escapeHtml(body))}</p>`);
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
      parts.push(`<${isNumbered ? 'ol' : 'ul'} class="gx-chat-list ${isNumbered ? 'gx-chat-ol' : 'gx-chat-ul'}">`);
      items.forEach((item) => {
        parts.push(`<li class="gx-chat-li">${item}</li>`);
      });
      parts.push(isNumbered ? '</ol>' : '</ul>');
      continue;
    }

    // Heading-like **Title** alone on a line
    const headingOnly = trimmed.match(/^\*\*(.+?)\*\*:?\s*$/);
    if (headingOnly) {
      parts.push(`<p class="gx-chat-heading">${escapeHtml(headingOnly[1].replace(/\*\*/g, ''))}</p>`);
      i += 1;
      continue;
    }

    const para = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t) break;
      if (/^([-*•]|\d+[.)])\s+/.test(t)) break;
      if (/^\*\*.+?\*\*:?\s*$/.test(t)) break;
      para.push(t);
      i += 1;
    }
    flushParagraph(para);
  }

  return parts.join('') || `<p class="gx-chat-p">${inlineFormat(escapeHtml(text))}</p>`;
}
