// Shared auth for the /manage admin area. A single password (MANAGE_PASSWORD
// env var) gates everything; the session cookie stores a SHA-256 of the
// password so the raw secret never lives in the browser. Web Crypto is used
// (not node:crypto) so the same code runs in the proxy (edge) and API routes.

const SALT = 'nira-manage-v1';

export const MANAGE_COOKIE = 'manage_session';

// The owner logs in once on her phone and stays logged in: the cookie lasts
// a year and every visit to a /manage page renews it (see proxy.ts), so only
// a year without opening the admin, a new phone or a password change asks for
// the password again. Browsers cap cookie lifetimes at 400 days.
export const MANAGE_SESSION_MAX_AGE = 60 * 60 * 24 * 365;

export function manageCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MANAGE_SESSION_MAX_AGE,
  };
}

export async function manageSessionToken(): Promise<string | null> {
  const password = process.env.MANAGE_PASSWORD;
  if (!password) return null;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${SALT}:${password}`),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function isManageAuthorized(
  cookieValue: string | undefined,
): Promise<boolean> {
  if (!cookieValue) return false;
  const token = await manageSessionToken();
  return !!token && cookieValue === token;
}
