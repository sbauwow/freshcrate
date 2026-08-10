"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Locale } from "@/lib/i18n";

export default function LocaleSwitcher({
  locale,
  label,
  englishLabel,
  chineseLabel,
}: {
  locale: Locale;
  label: string;
  englishLabel: string;
  chineseLabel: string;
}) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const query = searchParams?.toString();
  const redirect = query ? `${pathname}?${query}` : pathname;

  const itemClass = (target: Locale) =>
    `px-1 py-0.5 rounded ${locale === target ? "bg-fm-btn-bg text-fm-btn-text border border-fm-nav-border" : "text-fm-link hover:text-fm-link-hover"}`;

  // Plain <a>, NOT next/link. The locale lives in the fc_lang cookie and every
  // page reads it server-side, so switching needs a full document load.
  // next/link would make this a soft navigation: the router fetches
  // /api/locale as RSC, the cookie lands, but the already-rendered layout and
  // page stay in the old language — the UI ends up one click behind and looks
  // stuck. A plain anchor is a real navigation, so SSR re-runs with the new
  // cookie. It also keeps the switcher working without JS, so agents and
  // crawlers can follow it.
  return (
    <div className="flex items-center gap-1 text-[10px]">
      <span className="text-fm-text-light">{label}:</span>
      <a href={`/api/locale?lang=en&redirect=${encodeURIComponent(redirect)}`} className={itemClass("en")}>
        {englishLabel}
      </a>
      <span className="text-fm-text-light">/</span>
      <a href={`/api/locale?lang=zh-CN&redirect=${encodeURIComponent(redirect)}`} className={itemClass("zh-CN")}>
        {chineseLabel}
      </a>
    </div>
  );
}
