import Link from "next/link";
import { db } from "@/lib/db";
import { money, monthLabel, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// Sales overview — the landing page. All figures come straight from the
// imported Access bidsheets (2025 onward). Type and rules, no cards.

export default async function OverviewPage() {
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS plans, COALESCE(SUM(total),0) AS value,
              COALESCE(AVG(NULLIF(total,0)),0) AS avg
       FROM plans`,
    )
    .get() as { plans: number; value: number; avg: number };

  const contracted = db
    .prepare("SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS v FROM plans WHERE contracted_at >= '2025-01-01'")
    .get() as { n: number; v: number };

  const last90 = db
    .prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS v FROM plans
       WHERE edited_at >= datetime('now','-90 days')`,
    )
    .get() as { n: number; v: number };

  const monthly = db
    .prepare(
      `SELECT substr(edited_at, 1, 7) AS ym, COUNT(*) AS n, COALESCE(SUM(total),0) AS v
       FROM plans WHERE edited_at >= '2025-01-01'
       GROUP BY ym ORDER BY ym`,
    )
    .all() as { ym: string; n: number; v: number }[];
  const maxMonth = Math.max(1, ...monthly.map((m) => m.v));

  const topBuilders = db
    .prepare(
      `SELECT builder_name, COUNT(*) AS n, COALESCE(SUM(total),0) AS v
       FROM plans WHERE builder_name != ''
       GROUP BY builder_name ORDER BY v DESC LIMIT 8`,
    )
    .all() as { builder_name: string; n: number; v: number }[];

  const recent = db
    .prepare(
      `SELECT id, plan_nbr, builder_name, proj_name, house_types, total, edited_at, contracted_at
       FROM plans ORDER BY edited_at DESC LIMIT 10`,
    )
    .all() as {
    id: number;
    plan_nbr: string;
    builder_name: string;
    proj_name: string;
    house_types: string;
    total: number;
    edited_at: string;
    contracted_at: string | null;
  }[];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales Overview</h1>
        <p className="mt-1 text-[13px] text-faint">
          Live from the bid history, 2025 to today.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-x-10 gap-y-6 border-y border-divider py-6 sm:grid-cols-4">
        <Stat label="Bid value, 2025→" value={money(totals.value)} sub={`${totals.plans} plans`} />
        <Stat label="Contracted" value={money(contracted.v)} sub={`${contracted.n} plans`} />
        <Stat label="Last 90 days" value={money(last90.v)} sub={`${last90.n} plans`} />
        <Stat label="Avg per plan" value={money(totals.avg)} sub="all bids" />
      </section>

      <section>
        <h2 className="label-caps">Bid value by month</h2>
        <table className="mt-3 w-full text-[13px]">
          <tbody>
            {monthly.map((m) => (
              <tr key={m.ym} className="border-b border-line-faint last:border-0">
                <td className="w-20 py-1.5 font-mono-data text-faint">{monthLabel(m.ym)}</td>
                <td className="py-1.5">
                  <div
                    className="h-3 bg-ink"
                    style={{ width: `${Math.max(1, (m.v / maxMonth) * 100)}%` }}
                  />
                </td>
                <td className="w-28 py-1.5 text-right font-mono-data">{money(m.v)}</td>
                <td className="w-16 py-1.5 text-right font-mono-data text-faint">{m.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="label-caps">Top builders by bid value</h2>
          <table className="mt-3 w-full text-[13px]">
            <tbody>
              {topBuilders.map((b) => (
                <tr key={b.builder_name} className="border-b border-line-faint last:border-0">
                  <td className="py-1.5 pr-4">{b.builder_name}</td>
                  <td className="w-24 py-1.5 text-right font-mono-data">{money(b.v)}</td>
                  <td className="w-12 py-1.5 text-right font-mono-data text-faint">{b.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="label-caps">Recent plans</h2>
            <Link href="/plans" className="text-[12px] text-faint hover:text-ink">
              View all →
            </Link>
          </div>
          <table className="mt-3 w-full text-[13px]">
            <tbody>
              {recent.map((p) => (
                <tr key={p.id} className="border-b border-line-faint last:border-0">
                  <td className="py-1.5 pr-3">
                    <Link href={`/plans/${p.id}`} className="font-mono-data font-semibold hover:underline">
                      {p.plan_nbr}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{p.builder_name || "—"}</td>
                  <td className="w-24 py-1.5 text-right font-mono-data">{money(p.total)}</td>
                  <td className="w-16 py-1.5 text-right font-mono-data text-faint">{shortDate(p.edited_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="label-caps">{label}</div>
      <div className="mt-1 font-mono-data text-[22px] font-semibold tracking-tight">{value}</div>
      <div className="text-[12px] text-faint">{sub}</div>
    </div>
  );
}
