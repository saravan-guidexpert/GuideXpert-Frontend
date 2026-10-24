import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  OTP_REQUEST_SUBMITTED_MESSAGE,
  OTP_REQUEST_FAILED_MESSAGE,
  OTP_ENTRY_INSTRUCTION,
} from './otpUserMessages.js';

const here = path.dirname(fileURLToPath(import.meta.url));

describe('OTP user-facing copy', () => {
  it('describes submission, not confirmed SMS delivery', () => {
    assert.match(OTP_REQUEST_SUBMITTED_MESSAGE, /submitted/i);
    assert.match(OTP_REQUEST_SUBMITTED_MESSAGE, /SMS/i);
    assert.doesNotMatch(OTP_REQUEST_SUBMITTED_MESSAGE, /whatsapp/i);
    assert.doesNotMatch(OTP_REQUEST_SUBMITTED_MESSAGE, /sent successfully/i);
    assert.match(OTP_REQUEST_FAILED_MESSAGE, /unable to send otp/i);
    assert.match(OTP_ENTRY_INSTRUCTION, /SMS/i);
    assert.doesNotMatch(OTP_ENTRY_INSTRUCTION, /whatsapp/i);
  });

  it('Apply section uses SMS wording and does not claim WhatsApp delivery', () => {
    const source = fs.readFileSync(
      path.join(here, '../components/Sections/ApplySection.jsx'),
      'utf8'
    );
    assert.match(source, /OTP_REQUEST_SUBMITTED_MESSAGE/);
    assert.match(source, /OTP_REQUEST_FAILED_MESSAGE/);
    assert.match(source, /OTP_ENTRY_INSTRUCTION/);
    assert.match(source, /Mobile Number \(for SMS OTP\)/);
    assert.doesNotMatch(source, /sent to your WhatsApp/i);
    assert.doesNotMatch(source, /OTP sent successfully/i);
    assert.doesNotMatch(source, /WhatsApp Mobile Number/);
  });
});
