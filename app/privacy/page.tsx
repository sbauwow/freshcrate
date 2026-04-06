export default function PrivacyPage() {
  return (
    <div className="max-w-[800px]">
      <h1 className="text-[18px] font-bold text-fm-green mb-4">Privacy Policy</h1>
      <p className="text-[10px] text-fm-text-light mb-6">Last updated: April 6, 2025</p>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">What We Collect</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          freshcrate collects the following data in the course of operating the service:
        </p>
        <ul className="text-[11px] text-fm-text list-disc ml-4 mt-1 space-y-0.5">
          <li><strong>Package metadata from GitHub</strong> — names, descriptions, star counts, licenses, and README content. This is all publicly available data.</li>
          <li><strong>IP addresses</strong> — logged in our <code>request_log</code> table when you make API requests.</li>
          <li><strong>API key usage</strong> — we track which API key was used for each request for rate limiting purposes.</li>
        </ul>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">What We Don&apos;t Collect</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          We do not use cookies, tracking pixels, analytics services, or any form of behavioral tracking.
          There are no personal accounts or user profiles. We don&apos;t collect names, email addresses, or any
          personally identifiable information beyond IP addresses in API logs.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">IP Address Retention</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          IP addresses are stored in our <code>request_log</code> table and automatically pruned after 30 days.
          They are used solely for rate limiting and abuse prevention.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">GitHub Data</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          We index publicly available repository metadata from GitHub, including repository names, descriptions,
          star counts, licenses, and README files. All of this data is already publicly accessible on GitHub.
          We function as a directory and search engine for open source packages.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">API Keys</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          API keys are created voluntarily by users. Keys are hashed with SHA-256 before storage — we only
          store the hash and a visible prefix (e.g., <code>fc_abc1...</code>). We cannot recover your full key
          after creation. Keys are not automatically collected.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">Third-Party Services</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          We use the following external APIs to index data:
        </p>
        <ul className="text-[11px] text-fm-text list-disc ml-4 mt-1 space-y-0.5">
          <li><strong>GitHub API</strong> — for package and repository metadata</li>
          <li><strong>arXiv API</strong> — for research paper metadata</li>
          <li><strong>HuggingFace API</strong> — for model and paper metadata</li>
        </ul>
        <p className="text-[11px] text-fm-text leading-relaxed mt-1">
          We do not share your data with any third parties.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">GDPR &amp; Data Deletion</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          IP logs are automatically pruned after 30 days. If you want to request deletion of any data
          associated with you, contact us at{" "}
          <a href="mailto:privacy@freshcrate.ai" className="text-fm-link hover:underline">privacy@freshcrate.ai</a>.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">Children</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          freshcrate is not directed at children under 13. We do not knowingly collect data from children.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">Contact</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          For privacy-related inquiries, email{" "}
          <a href="mailto:privacy@freshcrate.ai" className="text-fm-link hover:underline">privacy@freshcrate.ai</a>.
        </p>
      </section>
    </div>
  );
}
