export function emptyOtpDigits() {
  return ['', '', '', '', '', ''];
}

export function applyOtpInput(digits, index, rawValue) {
  const clean = String(rawValue || '').replace(/\D/g, '');
  if (!clean) {
    const next = digits.slice();
    next[index] = '';
    return { digits: next, focusIndex: index };
  }
  if (clean.length > 1) return applyOtpPaste(clean);
  const next = digits.slice();
  next[index] = clean;
  return { digits: next, focusIndex: Math.min(index + 1, 5) };
}

export function applyOtpPaste(rawValue) {
  const clean = String(rawValue || '').replace(/\D/g, '').slice(0, 6);
  const digits = emptyOtpDigits();
  clean.split('').forEach((char, index) => {
    digits[index] = char;
  });
  return { digits, focusIndex: Math.min(Math.max(clean.length, 1) - 1, 5) };
}

export function applyOtpBackspace(digits, index) {
  const next = digits.slice();
  if (next[index]) {
    next[index] = '';
    return { digits: next, focusIndex: index };
  }
  if (index > 0) {
    next[index - 1] = '';
    return { digits: next, focusIndex: index - 1 };
  }
  return { digits: next, focusIndex: 0 };
}

export function otpValue(digits) {
  return digits.join('');
}
