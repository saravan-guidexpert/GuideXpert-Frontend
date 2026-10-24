import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  contactInitials,
  contactStatusLabel,
  filterContacts,
  formatContactPhone,
  orderContacts,
  validateContactDraft,
  visibleContacts,
} from './contactsModel.js';

const root = path.dirname(fileURLToPath(import.meta.url));

const rows = [
  { id: 'a', name: 'Anita Rao', phone: '9000011111', email: '', role: 'Owner', status: 'active' },
  { id: 'b', name: 'Ravi Menon', phone: null, email: 'ravi.menon@example.com', role: 'Counsellor', status: 'active' },
  { id: 'c', name: 'Old Lead', phone: '9000099999', email: 'old.lead@example.com', role: '', status: 'inactive' },
];

test('contact labels, initials and phone display come from the record', () => {
  assert.equal(contactInitials('Anita Rao'), 'AR');
  assert.equal(contactInitials('Ravi'), 'RA');
  assert.equal(contactInitials('   '), '?');
  assert.equal(contactStatusLabel('active'), 'Active');
  assert.equal(contactStatusLabel('inactive'), 'Inactive');
  assert.equal(contactStatusLabel(''), 'Unknown');
  assert.equal(formatContactPhone('9000011111'), '90000 11111');
  assert.equal(formatContactPhone('+91 90000 11111'), '+91 90000 11111');
  assert.equal(formatContactPhone(null), '');
});

test('contact search and filters use name, email, phone, status and primary id', () => {
  assert.deepEqual(filterContacts(rows, { query: 'ravi' }).map((row) => row.id), ['b']);
  assert.deepEqual(filterContacts(rows, { query: '90000 11111' }).map((row) => row.id), ['a']);
  assert.deepEqual(filterContacts(rows, { query: 'old.lead' }).map((row) => row.id), ['c']);
  assert.deepEqual(filterContacts(rows, { status: 'inactive' }).map((row) => row.id), ['c']);
  assert.deepEqual(filterContacts(rows, { kind: 'primary', primaryId: 'a' }).map((row) => row.id), ['a']);
  assert.deepEqual(filterContacts(rows, { kind: 'other', primaryId: 'a' }).map((row) => row.id), ['b', 'c']);
  assert.deepEqual(visibleContacts(rows, { primaryId: 'b' }).map((row) => row.id), ['b', 'a', 'c']);
  assert.deepEqual(orderContacts(rows, '').map((row) => row.id), ['a', 'b', 'c']);
  const copy = [...rows];
  filterContacts(copy, { query: 'anita' });
  assert.equal(copy.length, 3);
});

test('contact drafts follow the repository name and phone rules', () => {
  const missing = validateContactDraft({ name: 'A', phone: '', email: '', role: '' });
  assert.equal(missing.ok, false);
  assert.equal(missing.errors.name, 'Name must be 2–200 characters.');
  assert.equal(missing.errors.contact, 'A contact needs a mobile number or an email address.');

  const badPhone = validateContactDraft({ name: 'Anita Rao', phone: '12345', email: '' });
  assert.equal(badPhone.ok, false);
  assert.match(badPhone.errors.phone, /Indian mobile number/);
  assert.equal(badPhone.errors.contact, undefined);

  const emailOnly = validateContactDraft({ name: '  Ravi   Menon ', phone: '  ', email: ' ravi@example.com ', role: 'Counsellor' });
  assert.equal(emailOnly.ok, true);
  assert.equal(emailOnly.value.name, 'Ravi Menon');
  assert.equal(emailOnly.value.phone, '');
  assert.equal(emailOnly.value.email, 'ravi@example.com');

  const phone = validateContactDraft({ name: 'Anita Rao', phone: '+91 90000 11111', email: '' });
  assert.equal(phone.ok, true);
  assert.equal(phone.value.phone, '9000011111');
});

test('the contacts tab keeps the existing contact commands and drops the stretched list', () => {
  const page = fs.readFileSync(path.join(root, '../ConsultancyProfilePage.jsx'), 'utf8');
  const panel = fs.readFileSync(path.join(root, 'ConsultancyContacts.jsx'), 'utf8');
  assert.match(page, /ConsultancyContacts/);
  assert.match(panel, /createContact/);
  assert.match(panel, /updateContact/);
  assert.match(panel, /deactivateContact/);
  assert.doesNotMatch(panel, /className="gx-list"/);
  assert.doesNotMatch(panel, /tone="on"/);
});
