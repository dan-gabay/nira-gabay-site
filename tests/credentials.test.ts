// Tests for Nira's stated qualifications.
//
// The list in lib/credentials.ts was checked against the certificates. These
// tests keep every surface that repeats it (About Markdown, Person JSON-LD,
// llms.txt) in step with that list, and keep two things out of the
// structured credentials: healthy sexuality (no certificate) and DBT as a
// separate certificate.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CREDENTIALS, credentialLine, DIRECTORY_PROFILES, BUSINESS_LISTINGS } from '@/lib/credentials';
import { personSchema, practiceSchema } from '@/lib/identitySchema';
import { aboutMarkdown } from '@/lib/agent/markdown';

const ROOT = join(__dirname, '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

test('the verified list has the eight certificates and nothing about sexuality', () => {
  assert.equal(CREDENTIALS.length, 8);
  for (const c of CREDENTIALS) {
    assert.ok(c.title && c.institution && /^\d{4}(-\d{4})?$/.test(c.year), c.title);
    assert.ok(!c.title.includes('מיניות'), 'healthy sexuality is experience, not a credential');
  }
  assert.equal(CREDENTIALS.filter((c) => c.title.includes('DBT')).length, 1, 'DBT only inside the CBT program');
});

test('Person.hasCredential mirrors the verified list, with institution and year', () => {
  assert.equal(personSchema.hasCredential.length, CREDENTIALS.length);
  personSchema.hasCredential.forEach((node, i) => {
    assert.equal(node.name, CREDENTIALS[i].title);
    assert.equal(node.recognizedBy.name, CREDENTIALS[i].institution);
    assert.match(node.dateCreated, /^\d{4}$/);
    if (CREDENTIALS[i].hours) assert.ok(node.description.includes(String(CREDENTIALS[i].hours)));
  });
});

test('sameAs: directory profiles on the Person, business listings on the practice', () => {
  for (const url of DIRECTORY_PROFILES) {
    assert.ok(personSchema.sameAs.includes(url), url);
    assert.match(url, /^https:\/\//);
  }
  for (const url of BUSINESS_LISTINGS) assert.ok(practiceSchema.sameAs.includes(url), url);
});

test('About Markdown and llms.txt list every credential', () => {
  const about = aboutMarkdown();
  const llms = read('public/llms.txt');
  for (const c of CREDENTIALS) {
    assert.ok(about.includes(credentialLine(c)), `about.md: ${c.title}`);
    assert.ok(llms.includes(c.title), `llms.txt: ${c.title}`);
    assert.ok(llms.includes(c.institution), `llms.txt: ${c.institution}`);
  }
  for (const url of [...DIRECTORY_PROFILES, ...BUSINESS_LISTINGS]) assert.ok(llms.includes(url), url);
});

test('healthy sexuality is prose only, never a credential node', () => {
  assert.ok(!JSON.stringify(personSchema.hasCredential).includes('מיניות'));
});

test('no street address or house number in the identity schema', () => {
  const text = JSON.stringify([personSchema, practiceSchema]);
  assert.ok(!text.includes('streetAddress'));
  assert.ok(!/שואבה \d/.test(text));
});
