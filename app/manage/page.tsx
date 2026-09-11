import { redirect } from 'next/navigation';

// The admin's landing screen is the numbers, not the to-do board.
//
// Owner decision, 2026-09-11: opening /manage should answer "what happened
// since I last looked". The to-do dashboard still exists, and its counts are
// on the nav badges from every screen anyway, so nothing is hidden by putting
// it one click away at /manage/overview.
//
// This also covers the login flow, which sends an authenticated session to
// /manage when there is no saved destination (app/manage/login/page.tsx).
export default function ManageIndex() {
  redirect('/manage/analytics');
}
