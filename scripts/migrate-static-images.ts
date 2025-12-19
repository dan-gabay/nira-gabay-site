import { put } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';

const images = [
  {
    name: 'logo.png',
    url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939893ccce1b9a0f8ccda5e/e2d28bde5_Screenshot2025-12-11at1546BackgroundRemoved19.png'
  },
  {
    name: 'hero-desktop.png',
    url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939893ccce1b9a0f8ccda5e/e176dba49_gemini-cleaned-aph4ywt.png'
  },
  {
    name: 'hero-mobile.png',
    url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939893ccce1b9a0f8ccda5e/9addc0feb_Screenshot2025-12-14at01854.png'
  },
  {
    name: 'profile.png',
    url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6939893ccce1b9a0f8ccda5e/8fa23344b_nano_banana_removed.png'
  }
];

async function migrateImages() {
  console.log('🚀 Starting image migration to Vercel Blob...\n');

  const results: { [key: string]: string } = {};

  for (const image of images) {
    try {
      console.log(`📥 Downloading: ${image.name}`);
      console.log(`   From: ${image.url.substring(0, 60)}...`);

      // Download image
      const response = await fetch(image.url);
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log(`   Size: ${(blob.size / 1024).toFixed(2)} KB`);

      // Upload to Vercel Blob
      console.log(`   ⬆️  Uploading to Vercel Blob...`);
      const vercelBlob = await put(image.name, blob, {
        access: 'public',
        addRandomSuffix: false,
      });

      console.log(`   ✅ Success!`);
      console.log(`   New URL: ${vercelBlob.url}\n`);

      results[image.url] = vercelBlob.url;

    } catch (err) {
      console.error(`   ❌ Error:`, err);
    }
  }

  console.log('='.repeat(70));
  console.log('\n📋 Migration Results:\n');
  
  console.log('Copy these URLs to update your code:\n');
  for (const [oldUrl, newUrl] of Object.entries(results)) {
    console.log(`Old: ${oldUrl.substring(0, 60)}...`);
    console.log(`New: ${newUrl}\n`);
  }

  // Save to file for reference
  const mappingPath = path.join(process.cwd(), 'image-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 URL mapping saved to: ${mappingPath}`);
  
  console.log('\n' + '='.repeat(70));
  console.log('\n✨ Migration complete!');
}

migrateImages();
