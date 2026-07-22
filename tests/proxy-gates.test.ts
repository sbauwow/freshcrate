import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy, shouldReturnGone, scopedRedirectTarget } from "@/proxy";

describe("proxy gone-path gates", () => {
  it("returns gone for any multi-segment /projects/<x>/<y> phantom path", () => {
    expect(shouldReturnGone("/projects/foo/docs/readme")).toBe(true);
    expect(shouldReturnGone("/projects/foo/.github/workflows/ci.yml")).toBe(true);
    expect(shouldReturnGone("/projects/foo/README-install")).toBe(true);
    // README-relative leaks observed in production logs:
    expect(shouldReturnGone("/projects/docs/mc-square.md")).toBe(true);
    expect(shouldReturnGone("/projects/examples/multimodal_chat.py")).toBe(true);
    expect(shouldReturnGone("/projects/js/packages/phoenix-mcp/README.md")).toBe(true);
    expect(shouldReturnGone("/projects/foo.yaml.example")).toBe(true);
  });

  it("returns gone for hostile scanner probe paths (incl. non-root)", () => {
    expect(shouldReturnGone("/.env")).toBe(true);
    expect(shouldReturnGone("/.env.production")).toBe(true);
    expect(shouldReturnGone("/app/.env")).toBe(true);
    expect(shouldReturnGone("/.git/config")).toBe(true);
    expect(shouldReturnGone("/wp-admin/install.php")).toBe(true);
    expect(shouldReturnGone("/wp-login.php")).toBe(true);
    expect(shouldReturnGone("/xmlrpc.php")).toBe(true);
    expect(shouldReturnGone("/adminer.php")).toBe(true);
    // Newly covered: arbitrary PHP, wp-config, /var/www, deep .env
    expect(shouldReturnGone("/x.php")).toBe(true);
    expect(shouldReturnGone("/var/www/html/wp-config.php")).toBe(true);
    expect(shouldReturnGone("/wp-content/plugins/hellopress/wp_filemanager.php")).toBe(true);
    expect(shouldReturnGone("/this_is_a_new_hello_world.php")).toBe(true);
  });

  it("does not catch legitimate app routes", () => {
    expect(shouldReturnGone("/")).toBe(false);
    expect(shouldReturnGone("/browse")).toBe(false);
    expect(shouldReturnGone("/search")).toBe(false);
    expect(shouldReturnGone("/projects/jcodemunch-mcp")).toBe(false);
    expect(shouldReturnGone("/projects/foo.md")).toBe(false);
    // Project names that merely contain probe-ish substrings must survive:
    expect(shouldReturnGone("/projects/xmlrpc-client")).toBe(false);
    expect(shouldReturnGone("/projects/adminer-ui")).toBe(false);
    expect(shouldReturnGone("/projects/wp-config-helper")).toBe(false);
    expect(shouldReturnGone("/author/N2")).toBe(false);
    expect(shouldReturnGone("/tag/typescript")).toBe(false);
  });
});

describe("scoped-name canonicalization", () => {
  it("maps raw-slash scoped names to the encoded single segment", () => {
    expect(scopedRedirectTarget("/projects/@vercel/detect-agent")).toBe(
      "/projects/%40vercel%2Fdetect-agent",
    );
    expect(scopedRedirectTarget("/projects/@nodeloom/sdk")).toBe("/projects/%40nodeloom%2Fsdk");
  });

  it("ignores non-scoped and deeper paths", () => {
    expect(scopedRedirectTarget("/projects/plain-name")).toBeNull();
    expect(scopedRedirectTarget("/projects/@scope/pkg/extra")).toBeNull();
  });

  it("proxy 308-redirects raw scoped names before the phantom gate", () => {
    const res = proxy(
      new NextRequest("https://www.freshcrate.ai/projects/@vercel/detect-agent", {
        headers: { "user-agent": "Mozilla/5.0", accept: "text/html" },
      }),
    );
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toContain("/projects/%40vercel%2Fdetect-agent");
  });
});

describe("markdown alternate Link header", () => {
  const CHROME = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    accept: "text/html",
    "sec-ch-ua": '"Chromium";v="133"',
    "sec-fetch-mode": "navigate",
  };

  it("advertises /projects/<name>.md on crate pages", () => {
    const res = proxy(new NextRequest("https://www.freshcrate.ai/projects/vllm", { headers: CHROME }));
    expect(res.headers.get("link")).toBe('</projects/vllm.md>; rel="alternate"; type="text/markdown"');
  });

  it("does not set it on the .md route itself or non-crate pages", () => {
    const md = proxy(new NextRequest("https://www.freshcrate.ai/projects/vllm.md", { headers: CHROME }));
    expect(md.headers.get("link")).toBeNull();
    const home = proxy(new NextRequest("https://www.freshcrate.ai/browse", { headers: CHROME }));
    expect(home.headers.get("link")).toBeNull();
  });
});

describe("proxy spoofed-chrome gate", () => {
  const SPOOFED_UA = "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36";

  it("429s chrome UAs that send neither sec-ch-ua nor sec-fetch headers", () => {
    const res = proxy(
      new NextRequest("https://www.freshcrate.ai/projects/foo", {
        headers: { "user-agent": SPOOFED_UA, accept: "text/html" },
      }),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("x-fc-gate")).toBe("spoofed-ua");
  });

  it("passes real chrome traffic that sends client hints", () => {
    const res = proxy(
      new NextRequest("https://www.freshcrate.ai/projects/foo", {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
          accept: "text/html",
          "accept-language": "en-US,en;q=0.9",
          "sec-ch-ua": '"Chromium";v="133", "Not(A:Brand";v="24"',
          "sec-fetch-mode": "navigate",
        },
      }),
    );
    expect(res.status).not.toBe(429);
  });
});
