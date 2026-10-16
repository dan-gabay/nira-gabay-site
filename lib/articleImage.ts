import { upload } from '@vercel/blob/client';

// Article cover images: upload from the /manage editor, and clean-up of the
// file an article no longer uses. Server side lives in
// app/api/manage/article-image/route.ts.

const ENDPOINT = '/api/manage/article-image';

/** True for a file in Vercel Blob (the only place the editor uploads to). */
export function isOwnBlobUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

/** Uploads the file straight from the browser to Blob and returns its public URL. */
export async function uploadArticleImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('יש להעלות קובץ תמונה בלבד');
  }
  try {
    const blob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: ENDPOINT,
      contentType: file.type,
    });
    return blob.url;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('שגיאה בהעלאת התמונה, נסו שוב');
  }
}

/**
 * Asks the server to delete an image that is no longer used. Best effort: a
 * failure leaves an unused file in storage, never a broken article, so it is
 * logged and not shown. The server refuses while any article still uses it.
 */
export async function deleteArticleImage(url: string | null | undefined): Promise<void> {
  if (!url || !isOwnBlobUrl(url)) return;
  try {
    const res = await fetch(ENDPOINT, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) console.error('Old image was not deleted:', res.status);
  } catch (error) {
    console.error('Old image was not deleted:', error);
  }
}
