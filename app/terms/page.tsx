export default function TermsPage() {
  return (
    <div className="max-w-[800px]">
      <h1 className="text-[18px] font-bold text-fm-green mb-4">Terms of Service</h1>
      <p className="text-[10px] text-fm-text-light mb-6">Last updated: April 6, 2025</p>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">Acceptance of Terms</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          By accessing or using freshcrate.ai, you agree to be bound by these Terms of Service. If you
          do not agree, do not use the service.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">The Service</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          freshcrate is a directory of open source packages, tools, and frameworks. We index publicly
          available data from GitHub, arXiv, and HuggingFace to help users discover software. Think of
          us as a search engine for open source agent packages.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">API Usage</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          API access is subject to rate limits. Abuse of the API — including excessive requests, scraping,
          or circumventing rate limits — will result in revocation of your API key. We reserve the right
          to revoke any API key at any time for any reason.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">User Submissions</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          By submitting a package to freshcrate, you confirm that you have the right to do so and that
          the submission does not violate any third-party rights. We reserve the right to remove any
          submission at our discretion.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">Intellectual Property</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          Package names, descriptions, READMEs, and other repository content belong to their respective
          authors and are subject to their respective licenses. freshcrate displays this information as
          a directory service, similar to a search engine. We do not claim ownership of any third-party content.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">No Warranty</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          freshcrate is provided &quot;as-is&quot; and &quot;as-available&quot; without warranties of any kind, express or
          implied. We do not guarantee the accuracy, completeness, or timeliness of any data displayed
          on the site.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">DMCA / Takedown Requests</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          If you are a copyright holder and believe your content is being displayed on freshcrate without
          authorization, email{" "}
          <a href="mailto:dmca@freshcrate.ai" className="text-fm-link hover:underline">dmca@freshcrate.ai</a>{" "}
          with details of the content in question. We will respond within 48 hours.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">Limitation of Liability</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          To the fullest extent permitted by law, freshcrate and its operators shall not be liable for
          any indirect, incidental, special, consequential, or punitive damages arising from your use of
          the service.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">Governing Law</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          These terms shall be governed by and construed in accordance with applicable law. Jurisdiction
          to be determined.
        </p>
      </section>

      <section className="mb-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-1">Contact</h2>
        <p className="text-[11px] text-fm-text leading-relaxed">
          For legal inquiries, email{" "}
          <a href="mailto:legal@freshcrate.ai" className="text-fm-link hover:underline">legal@freshcrate.ai</a>.
        </p>
      </section>
    </div>
  );
}
