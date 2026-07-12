import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SERVICES, getService } from '@/lib/services';
import ServicePageTemplate, { type RelatedArticle } from '@/components/services/ServicePageTemplate';
import { supabaseServer } from '@/lib/supabaseServer';

// Article links refresh hourly; the page copy itself is static config.
export const revalidate = 3600;

// The service list is compile-time config - unknown slugs must 404 at the
// router level. (Next 16 serves prerendered fallback shells with HTTP 200
// even when the page calls notFound(), so dynamicParams=true would leave
// soft-404s; the articles route still has that variant open.)
export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return {
    title: { absolute: service.metaTitle },
    description: service.metaDescription,
    alternates: {
      canonical: `https://www.niragabay.com/services/${service.slug}`,
    },
    openGraph: {
      title: service.metaTitle,
      description: service.metaDescription,
      url: `https://www.niragabay.com/services/${service.slug}`,
      type: 'website',
    },
  };
}

// Latest published articles carrying the service's topic tag (same CSV tags
// convention as app/sitemap.ts and the topic hubs).
async function getRelatedArticles(tag: string): Promise<RelatedArticle[]> {
  try {
    const supabase = supabaseServer();
    const { data } = await supabase
      .from('articles')
      .select('slug, title, tags, created_date')
      .eq('is_published', true)
      .order('created_date', { ascending: false });
    return (data || [])
      .filter((a) =>
        (a.tags || '')
          .split(',')
          .map((t: string) => t.trim())
          .includes(tag),
      )
      .slice(0, 3)
      .map(({ slug, title }) => ({ slug, title }));
  } catch {
    return [];
  }
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const relatedArticles = await getRelatedArticles(service.topicTag);
  return <ServicePageTemplate service={service} relatedArticles={relatedArticles} />;
}
