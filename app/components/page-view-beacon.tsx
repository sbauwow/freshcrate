"use client";

import { usePathname, useSearchParams } from "next/navigation";

export default function PageViewBeacon() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const query = searchParams?.toString();
  const fullPath = query ? `${pathname}?${query}` : pathname;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/beacon?p=${encodeURIComponent(fullPath)}`}
      alt=""
      width={1}
      height={1}
      className="absolute"
      aria-hidden="true"
    />
  );
}
