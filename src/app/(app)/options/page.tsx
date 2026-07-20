import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { moneyExact } from "@/lib/format";

export const dynamic = "force-dynamic";

// The Options & Standards book: company masters plus builder/project
// overrides, straight from the Access hierarchy. Reference for now; walker
// integration comes later.

export default async function OptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const me = await requireUser();
  if (me.role !== "admin") redirect("/");
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const rows = (
    query
      ? db
          .prepare(
            `SELECT * FROM options
             WHERE description LIKE $q OR ref_code LIKE $q OR option_number = $exact
             ORDER BY level = 'master' DESC, ref_code, CAST(option_number AS INT) LIMIT 300`,
          )
          .all({ q: `%${query}%`, exact: query })
      : db
          .prepare("SELECT * FROM options WHERE level = 'master' ORDER BY CAST(option_number AS INT)")
          .all()
  ) as {
    id: number;
    level: string;
    ref_code: string;
    option_number: string;
    description: string;
    std_price: number | null;
    opt_price: number | null;
    pwk_price: number | null;
  }[];

  const counts = db
    .prepare("SELECT level, COUNT(*) AS n FROM options GROUP BY level")
    .all() as { level: string; n: number }[];
  const countStr = counts.map((c) => `${c.n} ${c.level}`).join(" · ") || "empty — run the options import";

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Options &amp; Standards</h1>
          <p className="mt-1 text-[14px] text-faint">{countStr}. Search shows builder/project overrides too.</p>
        </div>
        <form method="get" className="w-72">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search option, builder code, #…"
            className="w-full border border-input bg-card px-3 py-1.5 text-[14px]"
          />
        </form>
      </div>

      <table className="mt-6 w-full text-[14px]">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="label-caps w-14 py-2 pr-4 font-semibold">#</th>
            <th className="label-caps py-2 pr-4 font-semibold">Option</th>
            <th className="label-caps w-28 py-2 pr-4 font-semibold">Level</th>
            <th className="label-caps w-24 py-2 pr-4 text-right font-semibold">Std</th>
            <th className="label-caps w-24 py-2 pr-4 text-right font-semibold">Option</th>
            <th className="label-caps w-24 py-2 text-right font-semibold">PWK</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-b border-line-faint hover:bg-row-tint">
              <td className="py-1.5 pr-4 font-mono-data">{o.option_number}</td>
              <td className="py-1.5 pr-4">{o.description || "—"}</td>
              <td className="py-1.5 pr-4">
                {o.level === "master" ? (
                  <span className="chip chip-muted">master</span>
                ) : (
                  <span className="font-mono-data text-[13px]">{o.ref_code}</span>
                )}
              </td>
              <td className="py-1.5 pr-4 text-right font-mono-data">{o.std_price === null ? "—" : moneyExact(o.std_price)}</td>
              <td className="py-1.5 pr-4 text-right font-mono-data">{o.opt_price === null ? "—" : moneyExact(o.opt_price)}</td>
              <td className="py-1.5 text-right font-mono-data">{o.pwk_price === null ? "—" : moneyExact(o.pwk_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="mt-8 text-[14px] text-faint">Nothing matches “{query}”.</p> : null}
    </div>
  );
}
