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
            <div className="text-[10px] text-fm-text-light mb-2">Each project now includes provenance fields: <code className="font-mono">source_type</code>, <code className="font-mono">source_package_id</code>, <code className="font-mono">canonical_key</code>, <code className="font-mono">provenance_json</code>, <code className="font-mono">imported_at</code>.</div>
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
          <h3 className="text-[12px] font-bold text-fm-green mb-2">Hosted Agent Edition Installer</h3>
          <div className="bg-white border border-fm-border rounded p-3">
            <code className="text-[11px] text-fm-green font-mono font-bold">GET /api/install/agent-edition</code>
            <div className="text-[10px] text-fm-text-light mt-1 mb-2">Returns a single-file shell installer suitable for <code className="font-mono">curl | bash</code> for freshcrate Agent Edition.</div>
            <div className="text-[10px] text-fm-text-light mb-2">Default release lane is <code className="font-mono">stable</code>. Installer arguments support deterministic bundle/mode/channel selection.</div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl -fsSL https://freshcrate.ai/api/install/agent-edition | bash -s -- --bundle solo-builder-core --mode headless --channel stable`}</pre>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[12px] font-bold text-fm-green mb-2">Workbench Recommendation</h3>
          <div className="bg-white border border-fm-border rounded p-3">
            <code className="text-[11px] text-fm-green font-mono font-bold">GET /api/workbench/recommend</code>
            <div className="text-[10px] text-fm-text-light mt-1 mb-2">Returns the recommended Agent Edition bundle plus alternatives for a persona/task combination.</div>
            <div className="text-[10px]">
              <span className="font-bold">Parameters:</span>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li><code className="font-mono">persona</code> (optional) - solo-dev, research, automation, security, local-models</li>
                <li><code className="font-mono">task</code> (optional) - free-form intent like <code className="font-mono">audit logs and isolate tooling</code></li>
              </ul>
            </div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl "https://freshcrate.ai/api/workbench/recommend?persona=security&task=audit+logs+and+isolate+tooling"`}</pre>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[12px] font-bold text-fm-green mb-2">Workbench Manifest</h3>
          <div className="bg-white border border-fm-border rounded p-3">
            <code className="text-[11px] text-fm-green font-mono font-bold">GET /api/workbench/manifest</code>
            <div className="text-[10px] text-fm-text-light mt-1 mb-2">Returns a machine-readable Agent Edition manifest with normalized bundle/mode/channel, versioned release lane, commands, package list, and verification checks.</div>
            <div className="text-[10px]">
              <span className="font-bold">Parameters:</span>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li><code className="font-mono">bundle</code> (optional) - e.g. <code className="font-mono">security-ops-node</code></li>
                <li><code className="font-mono">mode</code> (optional) - <code className="font-mono">headless</code> or <code className="font-mono">light-desktop</code></li>
                <li><code className="font-mono">channel</code> (optional) - <code className="font-mono">stable</code>, <code className="font-mono">beta</code>, or <code className="font-mono">nightly</code></li>
                <li><code className="font-mono">download</code> (optional) - <code className="font-mono">1</code> to force attachment download</li>
              </ul>
            </div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl -OJ "https://freshcrate.ai/api/workbench/manifest?bundle=security-ops-node&mode=headless&channel=stable&download=1"`}</pre>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[12px] font-bold text-fm-green mb-2">Cloud Images / VM Images</h3>
          <div className="bg-white border border-fm-border rounded p-3 space-y-3">
            <div>
              <code className="text-[11px] text-fm-green font-mono font-bold">GET /api/workbench/image-build</code>
              <div className="text-[10px] text-fm-text-light mt-1">Returns a versioned image-build manifest for Packer/cloud-image pipelines. Supports <code className="font-mono">bundle</code>, <code className="font-mono">mode</code>, <code className="font-mono">channel</code>, <code className="font-mono">image</code>, and <code className="font-mono">download=1</code>. Concrete starter templates live under <code className="font-mono">images/*.pkr.hcl</code>, and local builds run through <code className="font-mono">scripts/build-agent-edition-image.sh</code> or <code className="font-mono">npm run image:build -- --image ...</code>.</div>
            </div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl -OJ "https://freshcrate.ai/api/workbench/image-build?bundle=automation-node&mode=headless&channel=beta&image=aws-ami-builder&download=1"`}</pre>
            </div>
            <div>
              <code className="text-[11px] text-fm-green font-mono font-bold">GET /api/workbench/cloud-init</code>
              <div className="text-[10px] text-fm-text-light mt-1">Returns a cloud-init seed YAML using the same Agent Edition bundle/mode/channel contract. Supports <code className="font-mono">download=1</code> for attachment delivery.</div>
            </div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl -OJ "https://freshcrate.ai/api/workbench/cloud-init?bundle=research-node&mode=light-desktop&channel=stable&download=1"`}</pre>
            </div>
            <div className="text-[10px] text-fm-text-light">Roadmap cards still live on <code className="font-mono">/workbench#cloud-images</code> and <code className="font-mono">/install/agent-edition#cloud-images</code>.</div>
          </div>
        </section>

        <section>
          <h3 className="text-[12px] font-bold text-fm-green mb-2">Workbench</h3>
          <div className="bg-white border border-fm-border rounded p-3">
            <code className="text-[11px] text-fm-green font-mono font-bold">GET /api/workbench</code>
            <div className="text-[10px] text-fm-text-light mt-1 mb-2">Returns freshcrate Agent Edition bundles, install modes, and the minimal-agentic-substrate playbook.</div>
            <div className="text-[10px]">
              <span className="font-bold">Parameters:</span>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li><code className="font-mono">persona</code> (optional) - solo-dev, research, automation, security, local-models</li>
                <li><code className="font-mono">target</code> (optional) - currently <code className="font-mono">ubuntu-24.04-x86_64</code></li>
                <li><code className="font-mono">mode</code> (optional) - <code className="font-mono">headless</code> or <code className="font-mono">light-desktop</code></li>
                <li><code className="font-mono">q</code> (optional) - keyword search across philosophy, packages, checks, and anti-goals</li>
              </ul>
            </div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl "https://freshcrate.ai/api/workbench?persona=automation&mode=headless"`}</pre>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[12px] font-bold text-fm-green mb-2">Orchestra</h3>
          <div className="bg-white border border-fm-border rounded p-3">
            <code className="text-[11px] text-fm-green font-mono font-bold">GET /api/orchestra</code>
            <div className="text-[10px] text-fm-text-light mt-1 mb-2">Returns freshcrate's opinionated patterns, anti-patterns, and operator playbook for orchestrating agents.</div>
            <div className="text-[10px]">
              <span className="font-bold">Parameters:</span>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li><code className="font-mono">theme</code> (optional) - e.g. delegation, supervision, review, grounding</li>
                <li><code className="font-mono">stage</code> (optional) - prototype, team, production</li>
                <li><code className="font-mono">q</code> (optional) - keyword search across titles, summaries, best practices, and anti-patterns</li>
              </ul>
            </div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl "https://freshcrate.ai/api/orchestra?theme=delegation&stage=production"`}</pre>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[12px] font-bold text-fm-green mb-2">Legislation Tracker</h3>
          <div className="bg-white border border-fm-border rounded p-3">
            <code className="text-[11px] text-fm-green font-mono font-bold">GET /api/legislation</code>
            <div className="text-[10px] text-fm-text-light mt-1 mb-2">Returns AI governance instruments, issue watchlist, and an operator playbook by optional filters.</div>
            <div className="text-[10px]">
              <span className="font-bold">Parameters:</span>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li><code className="font-mono">region</code> (optional) - e.g. Europe, North America, Asia-Pacific</li>
                <li><code className="font-mono">status</code> (optional) - in_force, approved_not_effective, in_negotiation, proposed</li>
                <li><code className="font-mono">theme</code> (optional) - filter by policy theme</li>
                <li><code className="font-mono">q</code> (optional) - keyword search across jurisdiction, instrument, summary, themes, and issues</li>
              </ul>
            </div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl https://freshcrate.ai/api/legislation?region=Europe&status=in_force`}</pre>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[12px] font-bold text-fm-green mb-2">Agent Decision: Recommend</h3>
          <div className="bg-white border border-fm-border rounded p-3">
            <code className="text-[11px] text-fm-green font-mono font-bold">GET /api/agent/recommend?task=...</code>
            <div className="text-[10px] text-fm-text-light mt-1 mb-2">Returns ranked package recommendations for an agent task with rationale and score.</div>
            <div className="text-[10px]">
              <span className="font-bold">Parameters:</span>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li><code className="font-mono">task</code> (required) - natural-language task intent</li>
                <li><code className="font-mono">category</code> (optional) - preferred category</li>
                <li><code className="font-mono">language</code> (optional) - preferred language</li>
                <li><code className="font-mono">runtime</code> (optional) - <code className="font-mono">local</code> or <code className="font-mono">cloud</code></li>
                <li><code className="font-mono">risk_tolerance</code> (optional) - <code className="font-mono">low</code>, <code className="font-mono">medium</code>, <code className="font-mono">high</code></li>
                <li><code className="font-mono">verified_only</code> (optional) - <code className="font-mono">true</code>/<code className="font-mono">1</code> to hard-filter verified projects</li>
                <li><code className="font-mono">limit</code> (optional, default 10, max 50)</li>
              </ul>
            </div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl "https://freshcrate.ai/api/agent/recommend?task=mcp+security+policy&category=MCP%20Servers&language=TypeScript&runtime=local&risk_tolerance=low&verified_only=true"`}</pre>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[12px] font-bold text-fm-green mb-2">Agent Decision: Compare</h3>
          <div className="bg-white border border-fm-border rounded p-3">
            <code className="text-[11px] text-fm-green font-mono font-bold">GET /api/agent/compare?a=...&b=...</code>
            <div className="text-[10px] text-fm-text-light mt-1 mb-2">Scores two packages under the same context and returns winner + score delta.</div>
            <div className="text-[10px]">
              <span className="font-bold">Parameters:</span>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li><code className="font-mono">a</code> (required) - first package name</li>
                <li><code className="font-mono">b</code> (required) - second package name</li>
                <li><code className="font-mono">task</code> / <code className="font-mono">category</code> / <code className="font-mono">language</code> (optional context)</li>
              </ul>
            </div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl "https://freshcrate.ai/api/agent/compare?a=langchain&b=llama-index&task=rag+pipeline"`}</pre>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[12px] font-bold text-fm-green mb-2">Agent Decision: Preflight</h3>
          <div className="bg-white border border-fm-border rounded p-3">
            <code className="text-[11px] text-fm-green font-mono font-bold">GET /api/agent/preflight?name=...</code>
            <div className="text-[10px] text-fm-text-light mt-1 mb-2">Runs readiness checks before an agent commits to a package.</div>
            <div className="text-[10px]">
              <span className="font-bold">Parameters:</span>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li><code className="font-mono">name</code> (required) - package name</li>
              </ul>
            </div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl "https://freshcrate.ai/api/agent/preflight?name=langchain"`}</pre>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[12px] font-bold text-fm-green mb-2">Agent Decision: Composite Endpoint</h3>
          <div className="bg-white border border-fm-border rounded p-3">
            <code className="text-[11px] text-fm-green font-mono font-bold">POST /api/agent/decision</code>
            <div className="text-[10px] text-fm-text-light mt-1 mb-2">Single endpoint for recommend, compare, and preflight decisions.</div>
            <div className="text-[10px]">
              <span className="font-bold">Body:</span>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li><code className="font-mono">mode</code> (required) - <code className="font-mono">recommend</code> | <code className="font-mono">compare</code> | <code className="font-mono">preflight</code></li>
                <li><code className="font-mono">task/category/language/runtime/risk_tolerance/verified_only/limit</code> (optional context)</li>
                <li><code className="font-mono">a</code>, <code className="font-mono">b</code> for compare mode</li>
                <li><code className="font-mono">name</code> for preflight mode</li>
              </ul>
            </div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl -X POST https://freshcrate.ai/api/agent/decision \\
  -H "Content-Type: application/json" \\
  -d '{"mode":"recommend","task":"mcp security","runtime":"local","risk_tolerance":"low","verified_only":true,"limit":5}'`}</pre>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[12px] font-bold text-fm-green mb-2">Agent Accountability Manifest</h3>
          <div className="bg-white border border-fm-border rounded p-3 space-y-3">
            <div>
              <code className="text-[11px] text-fm-green font-mono font-bold">POST /api/agents/register-manifest</code>
              <div className="text-[10px] text-fm-text-light mt-1">Register or upsert a signed accountable agent manifest.</div>
            </div>
            <div>
              <code className="text-[11px] text-fm-green font-mono font-bold">POST /api/agents/verify-manifest</code>
              <div className="text-[10px] text-fm-text-light mt-1">Verify signature/expiry/revocation status for a manifest.</div>
            </div>
            <div>
              <code className="text-[11px] text-fm-green font-mono font-bold">POST /api/agents/revoke-manifest</code>
              <div className="text-[10px] text-fm-text-light mt-1">Revoke a manifest with reason (auth required when API keys are enabled).</div>
            </div>
            <div>
              <code className="text-[11px] text-fm-green font-mono font-bold">GET /api/agents/:agent_id/attestations</code>
              <div className="text-[10px] text-fm-text-light mt-1">List attestation history for an agent identity.</div>
            </div>
            <div>
              <code className="text-[11px] text-fm-green font-mono font-bold">POST /api/agents/receipt</code>
              <div className="text-[10px] text-fm-text-light mt-1">Append immutable action receipt tied to an active manifest.</div>
            </div>
            <div className="mt-2 bg-fm-bg rounded p-2">
              <pre className="text-[10px] font-mono text-fm-text whitespace-pre-wrap">{`curl -X POST https://freshcrate.ai/api/agents/verify-manifest \\
  -H "Content-Type: application/json" \\
  -d '{"manifest_id":"mfst_example_123456"}'`}</pre>
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
              <span className="font-bold mt-2 block">Headers:</span>
              <ul className="ml-4 mt-1 space-y-0.5">
                <li><code className="font-mono">x-manifest-id</code> (required for high-risk categories: Security, Infrastructure)</li>
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
