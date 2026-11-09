// Tests for Nira's stated qualifications.
//
// The list in lib/credentials.ts was checked against the certificates. These
// tests keep every surface that repeats it (About Markdown, Person JSON-LD,
// llms.txt) in step with that list, and keep out the two claims that were
// wrong before: healthy sexuality as a qualification, and DBT as a separate
// certificate.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CREDENTIALS, credentialLine, DIRECTORY_PROFILES, BUSINESS_LISTINGS } from '@/lib/credentials';
import { personSchema, practiceSchema } from '@/lib/identitySchema';
import { aboutMarkdown, homeMarkdown } from '@/lib/agent/markdown';
import { SERVICES } from '@/lib/services';
import { TOPICS } from '@/lib/topics';

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

test('healthy sexuality is never presented as a training, certification or specialisation', () => {
  const banned = [/התמחות[^.]{0,20}מיניות/, /הכשרה[^.]{0,25}מיניות/, /הסמכה ב[^.]{0,15}מיניות/, /specialisation in healthy sexuality/i];
  const surfaces: Record<string, string> = {
    'llms.txt': read('public/llms.txt'),
    'about page': read('app/about/page.tsx'),
    'about layout': read('app/about/layout.tsx'),
    'about.md': aboutMarkdown(),
    'home.md': homeMarkdown([]),
    'person schema': JSON.stringify(personSchema),
    'practice schema': JSON.stringify(practiceSchema),
    services: JSON.stringify(SERVICES),
    topics: JSON.stringify(TOPICS),
  };
  for (const [name, text] of Object.entries(surfaces)) {
    for (const re of banned) assert.ok(!re.test(text), `${name} matches ${re}`);
  }
});

test('no street address or house number in the identity schema', () => {
  const text = JSON.stringify([personSchema, practiceSchema]);
  assert.ok(!text.includes('streetAddress'));
  assert.ok(!/שואבה \d/.test(text));
});
