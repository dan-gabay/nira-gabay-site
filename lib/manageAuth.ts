// Shared auth for the /manage admin area. A single password (MANAGE_PASSWORD
// env var) gates everything; the session cookie stores a SHA-256 of the
// password so the raw secret never lives in the browser. Web Crypto is used
// (not node:crypto) so the same code runs in the proxy (edge) and API routes.

const SALT = 'nira-manage-v1';

export const MANAGE_COOKIE = 'manage_session';

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
