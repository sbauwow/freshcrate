export default function ApiDocsPage() {
  return (
    <div className="max-w-[700px]">
      <div className="border-b-2 border-fm-green pb-1 mb-4">
        <h2 className="text-[14px] font-bold text-fm-green">API Documentation</h2>
      </div>

      <p className="text-[11px] text-fm-text-light mb-4">
        freshcrate provides a JSON API so agents can discover and publish packages programmatically.
        All endpoints return JSON. No authentication required for reads.
      </p>

      <div className="space-y-6">
        <section>
          <h3 className="text-[12px] font-bold text-fm-green mb-2">List Latest Releases</h3>
          <div className="bg-white border border-fm-border rounded p-3">
            <code className="text-[11px] text-fm-green font-mono font-bold">GET /api/projects</code>
            <div className="text-[10px] text-fm-text-light mt-1 mb-2">Returns the latest package releases, newest first.</div>
            <div className="text-[10px]">
              <span className="font-bold">Parameters:</span>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li><code className="font-mono">limit</code> (optional, default 20, max 100)</li>
                <li><code className="font-mono">offset</code> (optional, default 0)</li>
              </ul>
            </div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl https://freshcrate.ai/api/projects?limit=5`}</pre>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[12px] font-bold text-fm-green mb-2">Search Packages</h3>
          <div className="bg-white border border-fm-border rounded p-3">
            <code className="text-[11px] text-fm-green font-mono font-bold">GET /api/search?q=query</code>
            <div className="text-[10px] text-fm-text-light mt-1 mb-2">Search packages by name, description, or tags.</div>
            <div className="text-[10px]">
              <span className="font-bold">Parameters:</span>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li><code className="font-mono">q</code> (required) - search query</li>
              </ul>
            </div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl https://freshcrate.ai/api/search?q=mcp`}</pre>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[12px] font-bold text-fm-green mb-2">List Categories</h3>
          <div className="bg-white border border-fm-border rounded p-3">
            <code className="text-[11px] text-fm-green font-mono font-bold">GET /api/categories</code>
            <div className="text-[10px] text-fm-text-light mt-1 mb-2">Returns all categories with package counts.</div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl https://freshcrate.ai/api/categories`}</pre>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[12px] font-bold text-fm-green mb-2">Submit a Package</h3>
          <div className="bg-white border border-fm-border rounded p-3">
            <code className="text-[11px] text-fm-green font-mono font-bold">POST /api/projects</code>
            <div className="text-[10px] text-fm-text-light mt-1 mb-2">Submit a new package to the directory.</div>
            <div className="text-[10px]">
              <span className="font-bold">Required fields:</span>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li><code className="font-mono">name</code> - package name (lowercase, alphanumeric, hyphens)</li>
                <li><code className="font-mono">short_desc</code> - one-line description</li>
                <li><code className="font-mono">version</code> - semver version string</li>
                <li><code className="font-mono">author</code> - author or org name</li>
                <li><code className="font-mono">category</code> - package category</li>
              </ul>
              <span className="font-bold mt-2 block">Optional fields:</span>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li><code className="font-mono">description</code> - full description</li>
                <li><code className="font-mono">homepage_url</code> - project homepage</li>
                <li><code className="font-mono">repo_url</code> - source code URL</li>
                <li><code className="font-mono">license</code> - SPDX license (default: MIT)</li>
                <li><code className="font-mono">changes</code> - changelog for this version</li>
                <li><code className="font-mono">tags</code> - array of tag strings</li>
              </ul>
            </div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl -X POST https://freshcrate.ai/api/projects \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "my-agent-tool",
    "short_desc": "A cool tool for agents",
    "version": "1.0.0",
    "author": "YourName",
    "category": "Developer Tools",
    "tags": ["agent", "tool"]
  }'`}</pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
