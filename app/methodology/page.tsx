import { HEALTH_RUBRIC } from "@/lib/health";

export const metadata = {
  title: "Methodology — freshcrate",
  description: "How freshcrate computes health and trust scores.",
};

export default function MethodologyPage() {
  const totalWeight = HEALTH_RUBRIC.reduce((s, f) => s + f.weight, 0);

  return (
    <div className="max-w-3xl">
      <h2 className="text-[18px] font-bold text-fm-green mb-3 border-b-2 border-fm-green pb-2">
        Scoring Methodology
      </h2>

      <section className="mb-6 text-[12px] text-fm-text leading-relaxed">
        <p className="mb-2">
          Every package gets a <strong>health score</strong> between 0 and 100. The score is a
          weighted average of independent factors. Missing signals don&rsquo;t penalize — they just
          drop out of the average, so packages with fewer signals get a score from fewer factors
          rather than a silently-depressed number.
        </p>
        <p>
          Scores are recomputed on a schedule. No subjective input. The rubric below is the entire
          algorithm.
        </p>
      </section>

      <h3 className="text-[14px] font-bold text-fm-green mb-2">Factors</h3>
      <table className="w-full text-[11px] mb-6">
        <thead>
          <tr className="text-left text-fm-text-light border-b border-fm-border">
            <th className="py-2 font-bold">Factor</th>
            <th className="py-2 font-bold">Weight</th>
            <th className="py-2 font-bold">Rule</th>
          </tr>
        </thead>
        <tbody>
          {HEALTH_RUBRIC.map((f) => (
            <tr key={f.name} className="border-b border-fm-border/30 align-top">
              <td className="py-2 font-bold">{f.label}</td>
              <td className="py-2 font-mono">{(f.weight * 100).toFixed(0)}%</td>
              <td className="py-2">{f.explain}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="py-2 text-fm-text-light">Total</td>
            <td className="py-2 font-mono text-fm-text-light">{(totalWeight * 100).toFixed(0)}%</td>
            <td className="py-2 text-fm-text-light">
              Remaining weight is reserved for factors still being rolled out (security advisories,
              dependency audit, maintainer responsiveness).
            </td>
          </tr>
        </tfoot>
      </table>

      <h3 className="text-[14px] font-bold text-fm-green mb-2">Disputes</h3>
      <p className="text-[12px] text-fm-text leading-relaxed">
        If a score looks wrong, it&rsquo;s because of a signal the rubric saw — open an issue on
        the repo and include the package name. The underlying checks are public and fixable.
      </p>
    </div>
  );
}
