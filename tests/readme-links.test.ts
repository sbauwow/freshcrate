import { describe, expect, it } from "vitest";
import { resolveReadmeLinks } from "@/lib/readme-links";

const REPO = "https://github.com/acme/widget";

describe("readme relative link resolution", () => {
  it("rewrites repo-relative hrefs to github blob URLs", () => {
    expect(resolveReadmeLinks('<a href="BENCHMARK.md">bench</a>', REPO)).toBe(
      '<a href="https://github.com/acme/widget/blob/HEAD/BENCHMARK.md">bench</a>',
    );
    expect(resolveReadmeLinks('<a href="./docs/setup.md">setup</a>', REPO)).toContain(
      "blob/HEAD/docs/setup.md",
    );
    expect(resolveReadmeLinks('<a href="/CONTRIBUTING.md">contrib</a>', REPO)).toContain(
      "blob/HEAD/CONTRIBUTING.md",
    );
  });

  it("rewrites relative image srcs to raw.githubusercontent URLs", () => {
    expect(resolveReadmeLinks('<img src="assets/logo.png">', REPO)).toBe(
      '<img src="https://raw.githubusercontent.com/acme/widget/HEAD/assets/logo.png">',
    );
  });

  it("leaves absolute URLs, anchors, and mailto untouched", () => {
    const cases = [
      '<a href="https://example.com/x">x</a>',
      '<a href="//cdn.example.com/x">x</a>',
      '<a href="#usage">usage</a>',
      '<a href="mailto:a@b.c">mail</a>',
    ];
    for (const html of cases) {
      expect(resolveReadmeLinks(html, REPO)).toBe(html);
    }
  });

  it("re-anchors relative links for gitlab repos to /-/blob and /-/raw", () => {
    expect(resolveReadmeLinks('<a href="docs/x.md">x</a>', "https://gitlab.com/acme/widget")).toBe(
      '<a href="https://gitlab.com/acme/widget/-/blob/HEAD/docs/x.md">x</a>',
    );
    expect(resolveReadmeLinks('<img src="logo.png">', "https://gitlab.com/acme/widget.git")).toBe(
      '<img src="https://gitlab.com/acme/widget/-/raw/HEAD/logo.png">',
    );
  });

  it("re-anchors against any other repo host so links never hit our origin", () => {
    const out = resolveReadmeLinks('<a href="docs/x.md">x</a>', "https://codeberg.org/acme/widget");
    expect(out).toContain("codeberg.org/acme/widget/docs/x.md");
    expect(out).not.toContain("/projects/");
  });

  it("falls back to homepage_url when repo_url is missing", () => {
    const out = resolveReadmeLinks('<a href="guide.md">g</a>', "", "https://widget.example.com/");
    expect(out).toBe('<a href="https://widget.example.com/guide.md">g</a>');
  });

  it("makes relative links inert when there is no usable base", () => {
    // No repo, no homepage: the link must not survive as an origin-relative href/src.
    const href = resolveReadmeLinks('<a href="docs/x.md">x</a>', null);
    expect(href).not.toContain('href="docs/x.md"');
    expect(href).toContain("data-fc-rel");
    const img = resolveReadmeLinks('<img src="logo.png">', "");
    expect(img).not.toContain('src="logo.png"');
    expect(img).not.toContain('src=""');
  });

  it("strips .git suffix from the repo url", () => {
    expect(resolveReadmeLinks('<a href="x.md">x</a>', "https://github.com/acme/widget.git")).toContain(
      "github.com/acme/widget/blob/HEAD/x.md",
    );
  });
});
