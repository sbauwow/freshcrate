import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import NavClock from "./components/nav-clock";

export const metadata: Metadata = {
  title: "freshcrate - The Latest Open Source Agent Packages",
  description: "freshcrate is the Web's largest index of open source agent software, tools, and frameworks. Discover the latest releases from agents, for agents.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* Logo + ad area (like OG freshmeat) */}
        <div className="bg-white">
          <div className="max-w-[1100px] mx-auto px-4 py-2 flex items-center justify-center">
            <Link href="/" className="no-underline">
              <Image src="/logo.png" alt="freshcrate" width={300} height={300} priority className="w-[300px] h-auto" />
            </Link>
          </div>
        </div>

        {/* Top gray rule */}
        <div className="h-[1px] bg-[#6f6f6f]" />

        {/* Nav bar - gray like OG */}
        <div className="bg-[#dddddd] border-b border-[#6f6f6f]">
          <div className="max-w-[1100px] mx-auto px-4 py-1.5 flex items-center justify-between">
            <nav className="flex flex-wrap gap-1 text-[11px] font-bold">
              <Link href="/" className="text-black hover:text-fm-link no-underline">home</Link>
              <span className="text-[#999]">|</span>
              <Link href="/browse" className="text-black hover:text-fm-link no-underline">browse</Link>
              <span className="text-[#999]">|</span>
              <Link href="/research" className="text-black hover:text-fm-link no-underline">research</Link>
              <span className="text-[#999]">|</span>
              <Link href="/submit" className="text-black hover:text-fm-link no-underline">submit</Link>
              <span className="text-[#999]">|</span>
              <Link href="/compare" className="text-black hover:text-fm-link no-underline">compare</Link>
              <span className="text-[#999]">|</span>
              <Link href="/api" className="text-black hover:text-fm-link no-underline">api</Link>
              <span className="text-[#999]">|</span>
              <Link href="/stats" className="text-black hover:text-fm-link no-underline">stats</Link>
            </nav>
            <NavClock />
          </div>
        </div>

        {/* Search bar - light blue like OG */}
        <div className="bg-[#bbddff] border-b border-[#6f6f6f]">
          <div className="max-w-[1100px] mx-auto px-4 py-1.5 flex flex-wrap items-center gap-2">
            <label className="text-[11px] font-bold text-black">Search for</label>
            <form action="/search" method="GET" className="flex items-center gap-1">
              <input
                type="text"
                name="q"
                className="px-1.5 py-0.5 text-[11px] text-black border border-[#999] w-[160px] outline-none bg-white"
              />
              <button
                type="submit"
                className="text-[11px] font-bold px-2 py-0.5 border border-[#999] bg-[#dddddd] text-black cursor-pointer hover:bg-[#cccccc]"
              >
                Go
              </button>
            </form>
          </div>
        </div>

        {/* Content */}
        <main className="max-w-[1100px] mx-auto px-4 py-4">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-fm-border mt-8 py-4 text-center text-[10px] text-fm-text-light">
          <div className="max-w-[1100px] mx-auto px-4">
            🥩 freshmeat is dead. long live freshcrate 📦
            <br />
            <Link href="/api" className="text-fm-text-light hover:text-fm-link">API</Link>
            {" | "}
            <Link href="/submit" className="text-fm-text-light hover:text-fm-link">Submit a Package</Link>
            {" | "}
            <Link href="/privacy" className="text-fm-text-light hover:text-fm-link">Privacy</Link>
            {" | "}
            <Link href="/terms" className="text-fm-text-light hover:text-fm-link">Terms</Link>
          </div>
        </footer>
        {/* Page view beacon — 1x1 transparent GIF, no JS, no cookies */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/api/beacon" alt="" width={1} height={1} className="absolute" aria-hidden="true" />
      </body>
    </html>
  );
}
