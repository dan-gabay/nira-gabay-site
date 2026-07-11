import Link from 'next/link';
import { PhoneCall } from 'lucide-react';
import { serviceForTags } from '@/lib/services';

// Article -> service internal link (SEO audit: funnel article authority into
// the commercial pages). Renders nothing when the article's tags don't map
// to an existing service page.
export default function ServiceCtaBanner({ tags }: { tags: string[] }) {
  const service = serviceForTags(tags);
  if (!service) return null;

  return (
    <div className="bg-gradient-to-br from-amber-50 to-stone-50 border border-amber-200 rounded-2xl p-6 md:p-8 my-12">
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <PhoneCall className="w-6 h-6 text-amber-700" />
        </div>
        <div className="flex-1 text-center sm:text-right">
          <h3 className="text-lg font-bold text-stone-800 mb-1">
            המאמר נגע במשהו שמעסיק אתכם בבית?
          </h3>
          <p className="text-stone-600 text-sm">
            אני מציעה שיחת היכרות טלפונית של 15 דקות, ללא עלות וללא התחייבות.
          </p>
        </div>
        <Link
          href={`/services/${service.slug}`}
          className="bg-stone-800 hover:bg-stone-900 text-white font-medium px-6 py-3 rounded-xl transition-colors whitespace-nowrap"
        >
          עוד על {service.name}
        </Link>
      </div>
    </div>
  );
}
