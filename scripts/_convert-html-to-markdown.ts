#!/usr/bin/env tsx
// One-shot: converts HTML content in articles to Markdown and updates Supabase.
// Targets only articles whose content starts with '<'.

import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Lines that are pure source artifacts - remove entirely
const REMOVE_LINES = [
  'נירה גבאי', 'יועצת חינוכית', 'ממכון אדלר', 'מיניות בריאה',
  'email-protection', '__cf_email__', 'data-cfemail',
  'נייד :', 'טל :', 'פקס :',
];

function htmlToMarkdown(html: string): string {
  let s = html;

  // Normalise line endings
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strip attributes from block tags (align="RIGHT", dir="RTL", etc.)
  s = s.replace(/<(p|h[1-6]|div|span)\s[^>]*>/gi, '<$1>');

  // <br> → newline
  s = s.replace(/<br\s*\/?>/gi, '\n');

  // <h2>text</h2> → ## text
  s = s.replace(/<h2>([\s\S]*?)<\/h2>/gi, (_, t) => `\n## ${strip(t)}\n`);

  // <p><strong>text</strong></p> acting as section heading (standalone bold paragraph)
  s = s.replace(/<p><strong>([\s\S]*?)<\/strong>\s*<\/p>/gi, (_, t) => {
    const text = strip(t).trim();
    if (!text) return '';
    // Skip known artifact lines
    if (REMOVE_LINES.some(r => text.includes(r))) return '';
    return `\n## ${text}\n`;
  });

  // Remaining <strong> → **bold**
  s = s.replace(/<strong>([\s\S]*?)<\/strong>/gi, (_, t) => {
    const text = strip(t).trim();
    return text ? `**${text}**` : '';
  });

  // <em> / <i> → *italic*
  s = s.replace(/<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/gi, (_, t) => {
    const text = strip(t).trim();
    return text ? `*${text}*` : '';
  });

  // <p>text</p> → text + blank line
  s = s.replace(/<p>([\s\S]*?)<\/p>/gi, (_, t) => {
    const text = strip(t).replace(/\n+/g, ' ').trim();
    if (!text) return '';
    if (REMOVE_LINES.some(r => text.includes(r))) return '';
    return `${text}\n\n`;
  });

  // Strip any remaining HTML tags
  s = s.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  s = s.replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");

  // Remove em dash if any snuck through
  s = s.replace(/—/g, '-');

  // Collapse 3+ blank lines to 2
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}

function strip(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, slug, content')
    .like('content', '<%');

  if (error || !articles?.length) {
    console.log('No HTML articles found:', error?.message ?? 'empty');
    return;
  }

  console.log(`Found ${articles.length} articles with HTML content.\n`);

  for (const art of articles) {
    const markdown = htmlToMarkdown(art.content);

    console.log(`[${art.slug}]`);
    console.log(`  HTML chars: ${art.content.length}  ->  Markdown chars: ${markdown.length}`);
    console.log(`  Preview: ${markdown.slice(0, 120).replace(/\n/g, '↵')}`);

    const { error: updateError } = await supabase
      .from('articles')
      .update({ content: markdown, updated_date: new Date().toISOString() })
      .eq('id', art.id);

    if (updateError) {
      console.error(`  ERROR: ${updateError.message}`);
    } else {
      console.log('  OK\n');
    }
  }

  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
