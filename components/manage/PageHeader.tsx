import type { ReactNode } from 'react';

// One page header for every admin screen: the title, a line saying what the
// screen is for, and the screen's one or two actions at the end.
export default function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 mb-5 md:mb-7">
      <div className="min-w-0">
        <h1 className="text-[22px] md:text-[28px] font-bold text-stone-900 leading-tight tracking-tight">{title}</h1>
        {sub && <p className="text-[13px] md:text-sm text-stone-500 mt-1">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
