import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { moneyExact } from "@/lib/format";

export const dynamic = "force-dynamic";

// Bundle detail: an equipment code exploded into its component models via
// eqcomp, with known component prices joined from parts.

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ part: string }>;
}) {
  const { part } = await params;
  const partNbr = decodeURIComponent(part);

  const info = db.prepare("SELECT * FROM parts WHERE part_nbr = ?").get(partNbr) as
    | {
        part_nbr: string;
        description: string;
        cost: number | null;
        a_cost: number | null;
        category: string;
        seer: string;
        eqp_type: string;
        afue: string;
      }
    | undefined;

  const comps = db
    .prepare(
      `SELECT e.comp_nbr, p.description, p.cost
       FROM eqcomp e LEFT JOIN parts p ON p.part_nbr = e.comp_nbr
       WHERE e.part_nbr = ? ORDER BY e.comp_nbr`,
    )
    .all(partNbr) as { comp_nbr: string; description: string | null; cost: number | null }[];

  const usedIn = db
    .prepare("SELECT part_nbr FROM eqcomp WHERE comp_nbr = ? ORDER BY part_nbr LIMIT 40")
    .all(partNbr) as { part_nbr: string }[];

  if (!info && comps.length === 0 && usedIn.length === 0) notFound();

  const compTotal = comps.reduce((s, c) => s + (c.cost ?? 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/equipment" className="text-[12px] text-faint hover:text-ink">
          ← Equipment
        </Link>
        <div className="mt-2 flex items-baseline justify-between">
          <h1 className="font-mono-data text-2xl font-bold tracking-tight">{partNbr}</h1>
          {info?.cost != null ? (
            <div className="font-mono-data text-2xl font-semibold">{moneyExact(info.cost)}</div>
          ) : null}
        </div>
        {info ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 border-y border-divider py-4 text-[13px] sm:grid-cols-4">
            <Meta k="Description" v={info.description || "—"} />
            <Meta k="Type" v={info.eqp_type || info.category || "—"} />
            <Meta k="SEER" v={info.seer || "—"} />
            <Meta k="AFUE" v={info.afue || "—"} />
          </dl>
        ) : (
          <p className="mt-2 text-[13px] text-faint">Not in the current Part price table.</p>
        )}
      </div>

      {comps.length ? (
        <section>
          <h2 className="label-caps">Bundle components</h2>
          <table className="mt-2 w-full text-[13px]">
            <tbody>
              {comps.map((c) => (
                <tr key={c.comp_nbr} className="border-b border-line-faint last:border-0">
                  <td className="w-56 py-1.5 pr-4">
                    <Link
                      href={`/equipment/${encodeURIComponent(c.comp_nbr)}`}
                      className="font-mono-data hover:underline"
                    >
                      {c.comp_nbr}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-4">{c.description ?? <span className="text-faint">model only — no current price row</span>}</td>
                  <td className="w-28 py-1.5 text-right font-mono-data">
                    {c.cost === null ? "—" : moneyExact(c.cost)}
                  </td>
                </tr>
              ))}
              {compTotal > 0 ? (
                <tr>
                  <td className="py-1.5 pr-4 font-semibold" colSpan={2}>
                    Component total
                  </td>
                  <td className="py-1.5 text-right font-mono-data font-semibold">{moneyExact(compTotal)}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : null}

      {usedIn.length ? (
        <section>
          <h2 className="label-caps">Used in bundles</h2>
          <p className="mt-2 flex flex-wrap gap-2 text-[13px]">
            {usedIn.map((u) => (
              <Link
                key={u.part_nbr}
                href={`/equipment/${encodeURIComponent(u.part_nbr)}`}
                className="font-mono-data border border-border px-2 py-0.5 hover:border-ink"
              >
                {u.part_nbr}
              </Link>
            ))}
          </p>
        </section>
      ) : null}
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="label-caps">{k}</dt>
      <dd className="mt-0.5">{v}</dd>
    </div>
  );
}
