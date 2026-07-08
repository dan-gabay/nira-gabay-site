import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

export const runtime = 'nodejs';

export async function GET() {
  const draft = await draftMode();
  draft.disable();
  redirect('/manage/articles');
}
