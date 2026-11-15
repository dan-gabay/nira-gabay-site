// Only the live site counts.
//
// Every Vercel preview deployment (one per pull request) runs with the same
// Supabase credentials as production, so a reviewer opening a preview link
// wrote real rows into site_events. A preview link has no referrer and its
// cookies live on a *.vercel.app host, so the owner's "don't count me" switch
// (lib/ownerOptOut.ts) does not reach it either: on 8 Nov 2026, 6 of the 7
// "direct" visits on /manage/analytics were reviews of the not-yet-merged
// landing pages under /lp/.
//
// Vercel sets VERCEL_ENV to "production", "preview" or "development". Off
// Vercel (a local `npm run dev` pointed at the real database) it is unset, and
// NODE_ENV decides instead, so a local build is not counted either.

export function isCountableDeployment(
  env: { VERCEL_ENV?: string; NODE_ENV?: string } = process.env,
): boolean {
  if (env.VERCEL_ENV) return env.VERCEL_ENV === 'production';
  return env.NODE_ENV === 'production';
}
