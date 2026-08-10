import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as localeGET } from "@/app/api/locale/route";

describe("locale route", () => {
  it("redirects to the public forwarded host instead of localhost", async () => {
    const req = new NextRequest("http://localhost:8080/api/locale?lang=zh-CN&redirect=%2F", {
      headers: {
        host: "localhost:8080",
        "x-forwarded-host": "www.freshcrate.ai",
        "x-forwarded-proto": "https",
      },
    });

    const res = await localeGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://www.freshcrate.ai/");
    expect(res.cookies.get("fc_lang")?.value).toBe("zh-CN");
  });

  it("switches back to english", async () => {
    const req = new NextRequest("http://localhost:8080/api/locale?lang=en&redirect=%2Fbrowse%3Fx%3D1", {
      headers: {
        host: "localhost:8080",
        "x-forwarded-host": "www.freshcrate.ai",
        "x-forwarded-proto": "https",
        cookie: "fc_lang=zh-CN",
      },
    });

    const res = await localeGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://www.freshcrate.ai/browse?x=1");
    expect(res.cookies.get("fc_lang")?.value).toBe("en");
  });

  it("does not set the locale cookie on a prefetch request", async () => {
    const req = new NextRequest("http://localhost:8080/api/locale?lang=zh-CN&redirect=%2Fagent-edition", {
      headers: {
        host: "localhost:8080",
        "x-forwarded-host": "www.freshcrate.ai",
        "x-forwarded-proto": "https",
        "next-router-prefetch": "1",
      },
    });

    const res = await localeGET(req);

    // Prefetch must be a no-op — otherwise Next's <Link> prefetch silently
    // flips the user's language on page load.
    expect(res.status).toBe(204);
    expect(res.cookies.get("fc_lang")?.value).toBeUndefined();
  });

  it("still sets the cookie on a real (non-prefetch) click", async () => {
    const req = new NextRequest("http://localhost:8080/api/locale?lang=zh-CN&redirect=%2Fagent-edition", {
      headers: {
        host: "localhost:8080",
        "x-forwarded-host": "www.freshcrate.ai",
        "x-forwarded-proto": "https",
      },
    });

    const res = await localeGET(req);

    expect(res.status).toBe(307);
    expect(res.cookies.get("fc_lang")?.value).toBe("zh-CN");
  });
});
