import { put } from '@vercel/blob';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function migrateImages() {
  console.log('🚀 Starting image migration to Vercel Blob...\n');

  // Get all articles with images
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, image_url')
    .not('image_url', 'is', null);

  if (error) {
    console.error('Error fetching articles:', error);
    return;
  }

  console.log(`📊 Found ${articles?.length} articles with images\n`);

  let migratedCount = 0;
  let errorCount = 0;

  for (const article of articles || []) {
    try {
      console.log(`\n📝 Processing: ${article.title}`);
      console.log(`   Old URL: ${article.image_url}`);

      // Download image from Supabase
      const response = await fetch(article.image_url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const blob = await response.blob();
      const filename = article.image_url.split('/').pop() || `${article.id}.jpg`;

      // Upload to Vercel Blob
      console.log(`   ⬆️  Uploading to Vercel Blob...`);
      const vercelBlob = await put(filename, blob, {
        access: 'public',
        addRandomSuffix: false,
      });

      console.log(`   New URL: ${vercelBlob.url}`);

      // Update article in database
      const { error: updateError } = await supabase
        .from('articles')
        .update({ image_url: vercelBlob.url })
        .eq('id', article.id);

      if (updateError) {
        throw updateError;
      }

      console.log(`   ✅ Updated successfully!`);
      migratedCount++;

    } catch (err) {
      console.error(`   ❌ Error:`, err);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n✨ Migration complete!`);
  console.log(`   ✅ Migrated: ${migratedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log('\n' + '='.repeat(50));
}

migrateImages();
