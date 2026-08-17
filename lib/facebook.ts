// Facebook app id, used by the article Share Dialog and the fb:app_id meta
// tag. An app id is public by design - it ships in client-side SDK calls and
// in the page's own meta tags. The app SECRET is the sensitive half and is
// not used anywhere in this project.
//
// NEXT_PUBLIC_FACEBOOK_APP_ID overrides it without a code change.
export const FACEBOOK_APP_ID =
  process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '1074221428646284';
