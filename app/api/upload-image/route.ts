import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

/**
 * The blob key an uploaded image is stored under.
 *
 * This used to be `file.name` verbatim, which is whatever the browser handed
 * over - so an image dragged straight out of ChatGPT was stored, and served
 * forever, as `ChatGPT Image Dec 19, 2025 at 11_16_50 PM.png`. 26 of the 33
 * article images carry names like that or a bare camera UUID. A descriptive
 * file name is one of the few image-SEO signals Google documents, and it costs
 * nothing to get right at upload time.
 *
 * The article's slug is the name we want: it is already ASCII, lowercase and
 * hyphenated (the project forbids raw Hebrew slugs), and it describes the
 * subject better than any file name a tool would generate. The original file
 * name is only a fallback, sanitised the same way, for uploads that happen
 * before a slug has been typed.
 */
function blobName(slug: string | null, fileName: string): string {
  const ext = (fileName.match(/\.([a-zA-Z0-9]{1,5})$/)?.[1] || 'png').toLowerCase();

  const clean = (value: string) =>
    value
      .replace(/\.[a-zA-Z0-9]{1,5}$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

  // A slug that survives cleaning is always preferred. Falling back to the file
  // name keeps the upload working; falling back to 'image' keeps it working even
  // for a name that is entirely Hebrew or entirely punctuation, which cleans to
  // an empty string.
  const base = clean(slug || '') || clean(fileName) || 'image';
  return `${base}.${ext}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const slug = formData.get('slug');

    if (!file) {
      return NextResponse.json(
        { error: 'לא נבחר קובץ' },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'יש להעלות קובץ תמונה בלבד' },
        { status: 400 }
      );
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'גודל הקובץ חייב להיות עד 5MB' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob. addRandomSuffix stays on: it is what keeps two
    // uploads for the same slug from overwriting each other, and it does not
    // affect the readable part of the name.
    const blob = await put(blobName(typeof slug === 'string' ? slug : null, file.name), file, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'שגיאה בהעלאת התמונה' },
      { status: 500 }
    );
  }
}
