/**
 * Regenerates every icon the site references, from app/icon.png.
 *
 * The previous version of this script read ./public/logo-temp.png and deleted
 * it on the way out, so it could only ever run once - and it never produced
 * the two sizes app/manifest.ts asks for, which is why /icon-192.png returned
 * 404 for anyone who installed the site or whose browser fetched the manifest.
 *
 * Source is app/icon.png (1024x1026), the largest artwork in the repo. It is
 * two pixels off square, so every output is cover-fitted rather than stretched.
 *
 * Run: node scripts/create-favicons.js
 */
const sharp = require('sharp');

const SOURCE = 'app/icon.png';

// Every size here must stay in step with app/manifest.ts and the icon files
// Next.js picks up by convention.
const OUTPUTS = [
  { file: 'public/favicon.ico', size: 32 },
  { file: 'public/icon.png', size: 512 },
  { file: 'public/apple-icon.png', size: 180 },
  { file: 'public/icon-192.png', size: 192 }, // app/manifest.ts
  { file: 'public/icon-512.png', size: 512 }, // app/manifest.ts
];

async function main() {
  for (const { file, size } of OUTPUTS) {
    await sharp(SOURCE)
      .resize(size, size, { fit: 'cover', position: 'centre' })
      .png({ compressionLevel: 9 })
      .toFile(file);
    console.log(`wrote ${file} (${size}x${size})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
