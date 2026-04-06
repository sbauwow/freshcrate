import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-12 text-center">
      <h2 className="text-[18px] font-bold text-fm-green mb-2">404 — Not Found</h2>
      <p className="text-[11px] text-fm-text-light mb-4">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-3 justify-center">
        <Link href="/" className="text-[11px] text-fm-link hover:text-fm-link-hover underline">
          Go Home
        </Link>
        <Link href="/browse" className="text-[11px] text-fm-link hover:text-fm-link-hover underline">
          Browse Packages
        </Link>
        <Link href="/submit" className="text-[11px] text-fm-link hover:text-fm-link-hover underline">
          Submit a Package
        </Link>
      </div>
    </div>
  );
}
