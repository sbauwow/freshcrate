/**
 * Server-safe HTML sanitizer for README content.
 * No external dependencies — works in Next.js SSR, Turbopack, and Node.js.
 *
 * Defense-in-depth strategy:
 * 1. Scripts are stripped at ingestion time (populate.mjs / enrich.mjs)
 * 2. This function strips again at render time (belt and suspenders)
 * 3. CSP headers block inline script execution as a final layer
 */

const DANGEROUS_TAGS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
  /<object\b[^>]*>[\s\S]*?<\/object>/gi,
  /<embed\b[^>]*\/?>/gi,
  /<applet\b[^>]*>[\s\S]*?<\/applet>/gi,
  /<form\b[^>]*>[\s\S]*?<\/form>/gi,
  /<input\b[^>]*\/?>/gi,
  /<textarea\b[^>]*>[\s\S]*?<\/textarea>/gi,
  /<button\b[^>]*>[\s\S]*?<\/button>/gi,
  /<select\b[^>]*>[\s\S]*?<\/select>/gi,
  /<link\b[^>]*\/?>/gi,
  /<meta\b[^>]*\/?>/gi,
  /<base\b[^>]*\/?>/gi,
  /<style\b[^>]*>[\s\S]*?<\/style>/gi,
];

const DANGEROUS_ATTRS = [
  /\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,    // event handlers
  /\bstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,     // inline styles (can exfiltrate via url())
  /\bsrcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,    // iframe srcdoc
  /\bformaction\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, // form hijack
];

const DANGEROUS_PROTOCOLS = [
  /href\s*=\s*["']?\s*javascript:/gi,
  /src\s*=\s*["']?\s*javascript:/gi,
  /href\s*=\s*["']?\s*data:(?!image\/)/gi,
  /src\s*=\s*["']?\s*data:(?!image\/)/gi,
  /href\s*=\s*["']?\s*vbscript:/gi,
];

/**
 * Sanitize HTML content for safe rendering.
 * Strips dangerous tags, event handlers, dangerous protocols, and inline styles.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";

  let clean = dirty;

  // Strip dangerous tags
  for (const pattern of DANGEROUS_TAGS) {
    clean = clean.replace(pattern, "");
  }

  // Strip dangerous attributes
  for (const pattern of DANGEROUS_ATTRS) {
    clean = clean.replace(pattern, "");
  }

  // Strip dangerous protocols
  for (const pattern of DANGEROUS_PROTOCOLS) {
    clean = clean.replace(pattern, 'href="');
  }

  return clean;
}
