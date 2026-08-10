import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import NavClock from "./components/nav-clock";
import PageViewBeacon from "./components/page-view-beacon";
import TrackedForm from "./components/tracked-form";
import LocaleSwitcher from "./components/locale-switcher";
import ThemeSwitcher from "./components/theme-switcher";
import { getCopy, LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n";
import { THEME_COOKIE, normalizeTheme } from "@/lib/theme";
import { recordPageRequest } from "@/lib/page-request";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.freshcrate.ai"),
  title: "freshcrate — fresh releases from the agent ecosystem",
  description:
    "freshcrate tracks fresh releases from the agent ecosystem: MCP servers, orchestration frameworks, coding agents, research tooling, infrastructure, and operator playbooks. A global open source package directory for AI agents and labs.",
  keywords: [
    "AI agents",
    "MCP servers",
    "agent frameworks",
    "open source AI",
    "AI labs",
    "global AI tooling",
    "Chinese AI labs",
  ],
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "freshcrate",
    title: "freshcrate — fresh releases from the agent ecosystem",
    description:
      "Fresh releases from the agent ecosystem: MCP servers, orchestration frameworks, coding agents, research tooling, infrastructure, and operator playbooks. A global open source package directory for AI agents and labs.",
    url: "https://www.freshcrate.ai",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "freshcrate" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "freshcrate — fresh releases from the agent ecosystem",
    description:
      "Fresh releases from the agent ecosystem: MCP servers, orchestration frameworks, coding agents, research tooling, infrastructure, and operator playbooks. A global open source package directory for AI agents and labs.",
    images: ["/og-default.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await recordPageRequest();
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const theme = normalizeTheme(cookieStore.get(THEME_COOKIE)?.value);
  const t = getCopy(locale);


  return (
    <html lang={locale === "zh-CN" ? "zh-CN" : "en"} translate="yes" data-theme={theme}>
      <body>
        {/* Logo + ad area (like OG freshmeat) */}
        <div className="bg-fm-bg">
          <div className="max-w-[1100px] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-4 py-2 flex items-center justify-center">
            <Link href="/" className="no-underline">
              <Image src="/logo.png" alt="freshcrate" width={300} height={300} priority className="w-[300px] h-auto" />
            </Link>
          </div>
        </div>

        {/* Top rule */}
        <div className="h-[1px] bg-fm-nav-border" />

        {/* Nav bar */}
        <div className="bg-fm-nav-bg border-b border-fm-nav-border">
          <div className="max-w-[1100px] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-4 py-1.5 flex flex-wrap items-center justify-between gap-y-1.5 gap-x-3">
            <nav className="flex flex-wrap gap-1 text-[11px] font-bold">
              <Link href="/" className="text-fm-text hover:text-fm-link no-underline">{t.nav.home}</Link>
              <span className="text-fm-border">|</span>
              <Link href="/browse" className="text-fm-text hover:text-fm-link no-underline">{t.nav.browse}</Link>
              <span className="text-fm-border">|</span>
              <Link href="/research" className="text-fm-text hover:text-fm-link no-underline">{t.nav.research}</Link>
              <span className="text-fm-border">|</span>
              <Link href="/security" className="text-fm-text hover:text-fm-link no-underline">{t.nav.security}</Link>
              <span className="text-fm-border">|</span>
              <Link href="/agent-edition" className="text-fm-text hover:text-fm-link no-underline">{t.nav.agentEdition}</Link>
              <span className="text-fm-border">|</span>
              <Link href="/orchestra" className="text-fm-text hover:text-fm-link no-underline">{t.nav.orchestra}</Link>
              <span className="text-fm-border">|</span>
              <Link href="/legislation" className="text-fm-text hover:text-fm-link no-underline">{t.nav.legislation}</Link>
              <span className="text-fm-border">|</span>
              <Link href="/languages" className="text-fm-text hover:text-fm-link no-underline">{t.nav.languages}</Link>
              <span className="text-fm-border">|</span>
              <Link href="/dependencies" className="text-fm-text hover:text-fm-link no-underline">{t.nav.deps}</Link>
              <span className="text-fm-border">|</span>
              <Link href="/submit" className="text-fm-text hover:text-fm-link no-underline">{t.nav.submit}</Link>
              <span className="text-fm-border">|</span>
              <Link href="/compare" className="text-fm-text hover:text-fm-link no-underline">{t.nav.compare}</Link>
              <span className="text-fm-border">|</span>
              <Link href="/api" className="text-fm-text hover:text-fm-link no-underline">{t.nav.api}</Link>
              <span className="text-fm-border">|</span>
              <Link href="/mcp" className="text-fm-text hover:text-fm-link no-underline">{t.nav.mcp}</Link>
              <span className="text-fm-border">|</span>
              <Link href="/stats" className="text-fm-text hover:text-fm-link no-underline">{t.nav.stats}</Link>
              <span className="text-fm-border">|</span>
              <Link href="/learn" className="text-fm-text hover:text-fm-link no-underline">{t.nav.learn}</Link>
            </nav>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <ThemeSwitcher theme={theme} label={t.themeLabel} modernLabel={t.themeModern} retroLabel={t.themeRetro} />
              <LocaleSwitcher locale={locale} label={t.localeLabel} englishLabel={t.localeEnglish} chineseLabel={t.localeChinese} />
              <NavClock />
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="bg-fm-search-bg border-b border-fm-nav-border">
          <div className="max-w-[1100px] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-4 py-1.5 flex flex-wrap items-center gap-2">
            <label className="text-[11px] font-bold text-fm-text">{t.searchLabel}</label>
            <TrackedForm event="search" eventTarget="search:header" action="/search" method="GET" className="flex items-center gap-1">
              <input
                type="text"
                name="q"
                className="px-1.5 py-0.5 text-[11px] text-fm-text border border-fm-border w-[160px] outline-none bg-fm-bg rounded-fm-sm"
              />
              <button
                type="submit"
                className="text-[11px] font-bold px-2 py-0.5 border border-fm-nav-border bg-fm-btn-bg text-fm-btn-text cursor-pointer hover:opacity-90 rounded-fm-sm"
              >
                {t.searchButton}
              </button>
            </TrackedForm>
          </div>
        </div>

        {/* Content */}
        <main className="max-w-[1100px] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-4 py-4">
          {children}
        </main>

        {/* Footer */}
        <footer
          className="mt-8 py-5 text-center text-[10px] border-t border-fm-border"
          style={{ background: "var(--fm-footer-bg)" }}
        >
          <div className="max-w-[1100px] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-4">
            <span style={{ color: "var(--fm-footer-text-strong)" }}>
              {t.footerBadge}
            </span>
            <br />
            <span className="text-[10px]" style={{ color: "var(--fm-footer-text)" }}>
              {t.footerNote}
            </span>
            <br />
            <span className="inline-flex flex-wrap justify-center gap-0 mt-1">
              <Link href="/api" className="hover:text-fm-link" style={{ color: "var(--fm-footer-text)" }}>API</Link>
              <span style={{ color: "var(--fm-footer-text)" }}>{" | "}</span>
              <Link href="/submit" className="hover:text-fm-link" style={{ color: "var(--fm-footer-text)" }}>{t.footerSubmit}</Link>
              <span style={{ color: "var(--fm-footer-text)" }}>{" | "}</span>
              <Link href="/learn" className="hover:text-fm-link" style={{ color: "var(--fm-footer-text)" }}>{t.footerLearn}</Link>
              <span style={{ color: "var(--fm-footer-text)" }}>{" | "}</span>
              <Link href="/resources" className="hover:text-fm-link" style={{ color: "var(--fm-footer-text)" }}>Resources</Link>
              <span style={{ color: "var(--fm-footer-text)" }}>{" | "}</span>
              <Link href="/agent-edition" className="hover:text-fm-link" style={{ color: "var(--fm-footer-text)" }}>Agent Edition</Link>
              <span style={{ color: "var(--fm-footer-text)" }}>{" | "}</span>
              <Link href="/orchestra" className="hover:text-fm-link" style={{ color: "var(--fm-footer-text)" }}>Orchestra</Link>
              <span style={{ color: "var(--fm-footer-text)" }}>{" | "}</span>
              <Link href="/legislation" className="hover:text-fm-link" style={{ color: "var(--fm-footer-text)" }}>{t.nav.legislation}</Link>
              <span style={{ color: "var(--fm-footer-text)" }}>{" | "}</span>
              <Link href="/security" className="hover:text-fm-link" style={{ color: "var(--fm-footer-text)" }}>{t.nav.security}</Link>
              <span style={{ color: "var(--fm-footer-text)" }}>{" | "}</span>
              <Link href="/privacy" className="hover:text-fm-link" style={{ color: "var(--fm-footer-text)" }}>{t.footerPrivacy}</Link>
              <span style={{ color: "var(--fm-footer-text)" }}>{" | "}</span>
              <Link href="/terms" className="hover:text-fm-link" style={{ color: "var(--fm-footer-text)" }}>{t.footerTerms}</Link>
            </span>
          </div>
        </footer>
        {/* Page view beacon — tiny client helper so path attribution is exact */}
        <Suspense fallback={null}>
          <PageViewBeacon />
        </Suspense>
      </body>
    </html>
  );
}
