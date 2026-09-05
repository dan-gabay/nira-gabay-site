// Site-ownership verification tokens, read from the environment.
//
// Bing Webmaster Tools proves ownership one of three ways: an XML file at the
// site root, a <meta> tag in the homepage <head>, or a CNAME record. Which one
// Dan picks in their UI is not knowable from here, so the token lives in one
// env var and both file and meta methods are served from it. Setting
// BING_SITE_VERIFICATION in Vercel and redeploying satisfies either.
//
// It is a public token by design - it ends up in the page source and in a file
// anyone can fetch - but it stays in the environment rather than the repo so
// that rotating it does not need a commit.
//
// Unset is the normal state until Dan runs the flow: the meta tag is simply not
// emitted and /BingSiteAuth.xml 404s, which is better than serving an empty
// file that would fail verification with a confusing error.

const clean = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const BING_SITE_VERIFICATION = clean(process.env.BING_SITE_VERIFICATION);
