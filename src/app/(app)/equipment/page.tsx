import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { moneyExact } from "@/lib/format";

export const dynamic = "force-dynamic";

// Equipment — the Part price table. Each part number is either a component
// model or a bundle code (bundles explode via eqcomp on the detail page).

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const rows = (
    query
      ? db
          .prepare(
            `SELECT p.*, (SELECT COUNT(*) FROM eqcomp e WHERE e.part_nbr = p.part_nbr) AS comps
             FROM parts p
             WHERE p.part_nbr LIKE $q OR p.description LIKE $q OR p.category LIKE $q
             ORDER BY p.part_nbr LIMIT 300`,
          )
          .all({ q: `%${query}%` })
      : db
          .prepare(
            `SELECT p.*, (SELECT COUNT(*) FROM eqcomp e WHERE e.part_nbr = p.part_nbr) AS comps
             FROM parts p ORDER BY p.part_nbr LIMIT 300`,
          )
          .all()
  ) as {
    part_nbr: string;
    description: string;
    cost: number | null;
    a_cost: number | null;
    category: string;
    seer: string;
    eqp_type: string;
    afue: string;
    comps: number;
  }[];

  const count = (db.prepare("SELECT COUNT(*) AS n FROM parts").get() as { n: number }).n;
  const bundles = (db.prepare("SELECT COUNT(DISTINCT part_nbr) AS n FROM eqcomp").get() as { n: number }).n;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipment</h1>
          <p className="mt-1 text-[13px] text-faint">
            {count} priced parts · {bundles} bundle codes in the component map
          </p>
        </div>
        <form method="get" className="w-72">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search part #, description, category…"
            className="w-full border border-input bg-card px-3 py-1.5 text-[13px]"
          />
        </form>
      </div>

      <table className="mt-6 w-full text-[13px]">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="label-caps py-2 pr-4 font-semibold">Part #</th>
            <th className="label-caps py-2 pr-4 font-semibold">Description</th>
            <th className="label-caps py-2 pr-4 font-semibold">Type</th>
            <th className="label-caps py-2 pr-4 text-right font-semibold">SEER</th>
            <th className="label-caps py-2 pr-4 text-right font-semibold">Cost</th>
            <th className="label-caps py-2 text-right font-semibold">Bundle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.part_nbr} className="border-b border-line-faint hover:bg-row-tint">
              <td className="py-2 pr-4">
                <Link
                  href={`/equipment/${encodeURIComponent(p.part_nbr)}`}
                  className="font-mono-data font-semibold hover:underline"
                >
                  {p.part_nbr}
                </Link>
              </td>
              <td className="max-w-72 truncate py-2 pr-4">{p.description || "—"}</td>
              <td className="py-2 pr-4 text-muted-foreground">{p.eqp_type || p.category || "—"}</td>
              <td className="py-2 pr-4 text-right font-mono-data text-faint">{p.seer || "—"}</td>
              <td className="py-2 pr-4 text-right">
                {isAdmin ? (
                  <form action="/api/pricing/update" method="post" className="inline">
                    <input type="hidden" name="kind" value="part" />
                    <input type="hidden" name="part_nbr" value={p.part_nbr} />
                    <input type="hidden" name="field" value="cost" />
                    <input type="hidden" name="back" value={`/equipment${query ? `?q=${encodeURIComponent(query)}` : ""}`} />
                    <input
                      name="value"
                      defaultValue={p.cost === null ? "" : p.cost.toFixed(2)}
                      className="w-24 border border-transparent bg-transparent px-1 py-0.5 text-right font-mono-data hover:border-input focus:border-ink"
                      inputMode="decimal"
                    />
                  </form>
                ) : (
                  <span className="font-mono-data">{p.cost === null ? "—" : moneyExact(p.cost)}</span>
                )}
              </td>
              <td className="py-2 text-right font-mono-data text-faint">{p.comps > 0 ? `${p.comps} comp` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="mt-8 text-[13px] text-faint">No parts match “{query}”.</p> : null}
    </div>
  );
}
