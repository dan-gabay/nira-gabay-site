import { MetadataRoute } from 'next'
import { supabaseServer } from '../lib/supabaseServer'
import { getSiteUrls } from '../lib/siteUrls'

// The URL list itself lives in lib/siteUrls.ts, because IndexNow needs the
// same list and a second copy of it would drift. This route is now only the
// projection of that list into the sitemap's shape - the contentKey each entry
// carries is for IndexNow's diffing and has no place in a sitemap.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSiteUrls(supabaseServer())

  return entries.map(({ url, lastModified, changeFrequency, priority }) => ({
    url,
    lastModified,
    changeFrequency,
    priority,
  }))
}
