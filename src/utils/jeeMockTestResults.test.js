import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  barPercent,
  formatDuration,
  formatPercentage,
  formatScorePair,
  scorePercentage,
  scorePopupKind,
  sectionTimeShare,
} from './jeeMockTestResultFormat.js';
import { applyOtpBackspace, applyOtpInput, applyOtpPaste, emptyOtpDigits } from './jeeMockTestOtpEntry.js';

test('result formatting keeps zero, negative, and missing values distinct', () => {
  assert.equal(formatScorePair(-5, 300), '-5 / 300');
  assert.equal(formatScorePair(0, 60), '0 / 60');
  assert.equal(formatScorePair(null, 60), 'Not available / 60');
  assert.equal(formatPercentage(-1.67), '-1.67%');
  assert.equal(formatPercentage(0), '0%');
  assert.equal(formatPercentage(null), null);
  assert.equal(formatDuration(48.22), '48 min 13 sec');
  assert.equal(formatDuration(0), '0 min');
  assert.equal(formatDuration(null), 'Not available');
});

test('section percentages and time shares use only recorded numbers', () => {
  assert.equal(scorePercentage(185, 300), 61.67);
  assert.equal(scorePercentage(155, 240), 64.58);
  assert.equal(scorePercentage(0, 300), 0);
  assert.equal(scorePercentage(-5, 300), -1.67);
  assert.equal(scorePercentage(null, 300), null);
  assert.equal(barPercent(-5), 0);
  assert.equal(barPercent(61.67), 61.67);
  assert.equal(barPercent(140), 100);
  assert.deepEqual(sectionTimeShare(72, 24), { mcq: 75, numerical: 25 });
  assert.equal(sectionTimeShare(null, 24), null);
  assert.equal(sectionTimeShare(0, 0), null);
});

test('a score of 150 or more uses the congratulations popup', () => {
  assert.equal(scorePopupKind(185), 'strong');
  assert.equal(scorePopupKind(150), 'strong');
  assert.equal(scorePopupKind(149), 'steady');
  assert.equal(scorePopupKind(0), 'steady');
  assert.equal(scorePopupKind(-5), 'steady');
  assert.equal(scorePopupKind(null), null);
});

test('OTP entry moves focus, accepts a paste, and walks back on backspace', () => {
  const typed = applyOtpInput(emptyOtpDigits(), 0, '4');
  assert.deepEqual(typed.digits, ['4', '', '', '', '', '']);
  assert.equal(typed.focusIndex, 1);

  const pasted = applyOtpPaste('12 34 56 78');
  assert.deepEqual(pasted.digits, ['1', '2', '3', '4', '5', '6']);
  assert.equal(pasted.focusIndex, 5);

  const cleared = applyOtpBackspace(['1', '2', '', '', '', ''], 2);
  assert.deepEqual(cleared.digits, ['1', '', '', '', '', '']);
  assert.equal(cleared.focusIndex, 1);
});
