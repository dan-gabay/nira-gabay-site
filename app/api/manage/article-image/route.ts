import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { supabaseServer } from '@/lib/supabaseServer';
import { MANAGE_COOKIE, isManageAuthorized } from '@/lib/manageAuth';
import { isOwnBlobUrl } from '@/lib/articleImage';

export const runtime = 'nodejs';

// Article cover images live in Vercel Blob.
//
// POST hands the browser a short-lived token so it uploads the file straight
// to Blob. The file used to go through a function here, and Vercel caps a
// function's request body at 4.5MB - a generated PNG is often bigger, and the
// upload then died before reaching any code of ours.
//
// DELETE removes an image that was replaced, once nothing points at it.
//
// The proxy already gates /api/manage/*; the checks below are defense in depth.

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

async function unauthorized(req: NextRequest): Promise<boolean> {
  return !(await isManageAuthorized(req.cookies.get(MANAGE_COOKIE)?.value));
}

export async function POST(req: NextRequest) {
  if (await unauthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/*'],
        maximumSizeInBytes: MAX_IMAGE_BYTES,
        addRandomSuffix: true,
      }),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('article image upload token failed:', error);
    return NextResponse.json({ error: 'שגיאה בהעלאת התמונה' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (await unauthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let url: unknown;
  try {
    ({ url } = await req.json());
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  // Only ever our own store - never an arbitrary URL handed in by the client.
  if (typeof url !== 'string' || !isOwnBlobUrl(url)) {
    return NextResponse.json({ deleted: false, reason: 'not a site image' });
  }

  // The same file can be the cover of more than one article (an image reused
  // by hand). Keep it while any article still points at it.
  const { count, error } = await supabaseServer()
    .from('articles')
    .select('id', { count: 'exact', head: true })
    .eq('image_url', url);
  if (error) {
    console.error('article image usage check failed:', error.message);
    return NextResponse.json({ error: 'check failed' }, { status: 500 });
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json({ deleted: false, reason: 'still in use' });
  }

  try {
    await del(url);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('article image delete failed:', err);
    return NextResponse.json({ error: 'delete failed' }, { status: 500 });
  }
}
