import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { moneyExact, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// Price Book — the kit charts from Access, editable in place (admin).
// Geometry charts (lbs/ft, sqft) are calculator inputs, not prices; hidden.

export default async function PricingPage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";

  const items = db
    .prepare(
      `SELECT id, category, code, label, price, per_foot, price_updated
       FROM kit_items WHERE is_chart = 0
       ORDER BY category, sort, code`,
    )
    .all() as {
    id: number;
    category: string;
    code: string;
    label: string;
    price: number | null;
    per_foot: number | null;
    price_updated: string | null;
  }[];

  const groups = new Map<string, typeof items>();
  for (const it of items) {
    const g = groups.get(it.category) ?? [];
    g.push(it);
    groups.set(it.category, g);
  }

  const log = db
    .prepare("SELECT username, target, field, old_value, new_value, changed_at FROM price_log ORDER BY id DESC LIMIT 15")
    .all() as { username: string; target: string; field: string; old_value: number | null; new_value: number | null; changed_at: string }[];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Price Book</h1>
        <p className="mt-1 text-[13px] text-faint">
          {items.length} kit prices from the bid system.{" "}
          {isAdmin ? "Edit a value and press return to save — every change is logged." : "Read-only."}
        </p>
      </div>

      {[...groups.entries()].map(([category, rows]) => (
        <section key={category}>
          <h2 className="label-caps">{category}</h2>
          <table className="mt-2 w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="label-caps w-40 py-1.5 pr-4 font-semibold">Code</th>
                <th className="label-caps py-1.5 pr-4 font-semibold">Description</th>
                <th className="label-caps w-28 py-1.5 pr-4 text-right font-semibold">Price</th>
                <th className="label-caps w-28 py-1.5 pr-4 text-right font-semibold">Per foot</th>
                <th className="label-caps w-24 py-1.5 text-right font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line-faint hover:bg-row-tint">
                  <td className="py-1.5 pr-4 font-mono-data">{r.code}</td>
                  <td className="py-1.5 pr-4">{r.label || "—"}</td>
                  <td className="py-1.5 pr-4 text-right">
                    <PriceCell isAdmin={isAdmin} id={r.id} field="price" value={r.price} />
                  </td>
                  <td className="py-1.5 pr-4 text-right">
                    {r.per_foot !== null || r.category.includes("Runs") ? (
                      <PriceCell isAdmin={isAdmin} id={r.id} field="per_foot" value={r.per_foot} />
                    ) : (
                      <span className="text-ghost">—</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right font-mono-data text-faint">{shortDate(r.price_updated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {log.length ? (
        <section>
          <h2 className="label-caps">Recent price changes</h2>
          <table className="mt-2 w-full text-[13px]">
            <tbody>
              {log.map((l, i) => (
                <tr key={i} className="border-b border-line-faint last:border-0">
                  <td className="w-32 py-1.5 pr-4 font-mono-data text-faint">{l.changed_at.slice(0, 16)}</td>
                  <td className="py-1.5 pr-4">{l.target}</td>
                  <td className="w-20 py-1.5 pr-4 text-faint">{l.field}</td>
                  <td className="w-40 py-1.5 text-right font-mono-data">
                    {l.old_value === null ? "—" : moneyExact(l.old_value)} → {l.new_value === null ? "—" : moneyExact(l.new_value)}
                  </td>
                  <td className="w-24 py-1.5 text-right text-faint">{l.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}

function PriceCell({
  isAdmin,
  id,
  field,
  value,
}: {
  isAdmin: boolean;
  id: number;
  field: "price" | "per_foot";
  value: number | null;
}) {
  if (!isAdmin) {
    return <span className="font-mono-data">{value === null ? "—" : moneyExact(value)}</span>;
  }
  return (
    <form action="/api/pricing/update" method="post" className="inline">
      <input type="hidden" name="kind" value="kit" />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="back" value="/pricing" />
      <input
        name="value"
        defaultValue={value === null ? "" : value.toFixed(2)}
        className="w-24 border border-transparent bg-transparent px-1 py-0.5 text-right font-mono-data hover:border-input focus:border-ink"
        inputMode="decimal"
      />
    </form>
  );
}
