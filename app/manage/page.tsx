import { redirect } from 'next/navigation';

// The admin opens on the home screen: what is waiting for a decision first,
// then the few figures that say how the site is doing.
//
// History: on 2026-09-11 the owner moved the landing screen to the numbers
// (/manage/analytics), so that opening /manage answered "what happened since I
// last looked". The home screen now answers that too, with this week's key
// figures under the to-do list, while the full analytics stay one tap away -
// and new enquiries, comments and drafts are no longer hidden behind them.
//
// This also covers the login flow, which sends an authenticated session to
// /manage when there is no saved destination (app/manage/login/page.tsx).
export default function ManageIndex() {
  redirect('/manage/overview');
}
