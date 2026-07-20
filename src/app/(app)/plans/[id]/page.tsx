import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { money, moneyExact, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// Labels for the Bidsheet kit QTY/COS pairs worth surfacing per line.
const KIT_FIELDS: [string, string][] = [
  ["BAEX", "Bath exhaust"],
  ["BAFN", "Bath fan"],
  ["KIEX", "Kitchen exhaust"],
  ["DRVT", "Dryer vent"],
  ["REG", "Registers"],
  ["GRILL", "Grills"],
  ["REFLN", "Refrigerant line"],
  ["CONWIR", "Control wiring"],
  ["CONDP", "Condensate pump"],
  ["SLAB", "Slab"],
  ["SERV", "Service"],
];

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = db.prepare("SELECT * FROM plans WHERE id = ?").get(Number(id)) as
    | {
        id: number;
        plan_nbr: string;
        builder_name: string;
        builder_code: string;
        proj_name: string;
        proj_code: string;
        total: number;
        status: string;
        proposed_at: string | null;
        contracted_at: string | null;
        edited_at: string;
      }
    | undefined;
  if (!plan) notFound();
  const STATUSES = ["draft", "proposed", "contracted", "lost"] as const;
  const chipFor = (s: string) =>
    s === "contracted" ? "chip-ok" : s === "lost" ? "chip-danger" : s === "proposed" ? "chip-warn" : "chip-muted";

  const detailRows = db
    .prepare(
      `SELECT house_nbr, system_nbr, category, code, label, qty, unit_cost, feet, height, width, insulated
       FROM plan_line_details WHERE plan_id = ? ORDER BY category, id`,
    )
    .all(plan.id) as {
    house_nbr: string;
    system_nbr: string;
    category: string;
    code: string;
    label: string;
    qty: number;
    unit_cost: number;
    feet: number;
    height: number;
    width: number;
    insulated: number;
  }[];

  const lines = db
    .prepare(
      `SELECT * FROM plan_lines WHERE plan_id = ? ORDER BY house_nbr, system_nbr, work_nbr`,
    )
    .all(plan.id) as {
    id: number;
    house_nbr: string;
    system_nbr: string;
    work_nbr: string;
    house_type: string;
    part_nbr: string;
    part_cost: number;
    labor_hours: number;
    labor_cost: number;
    factor: number;
    selling: number;
    final_total: number;
    edit_date: string | null;
    data: string;
  }[];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/plans" className="text-[12px] text-faint hover:text-ink">
          ← Plans
        </Link>
        <div className="mt-2 flex items-baseline justify-between">
          <h1 className="font-mono-data text-2xl font-bold tracking-tight">
            {plan.plan_nbr}
            {plan.status ? <span className={`chip ${chipFor(plan.status)} ml-3 align-middle`}>{plan.status}</span> : null}
          </h1>
          <div className="flex items-baseline gap-4">
            <Link href={`/plans/${plan.id}/edit`} className="text-[13px] text-faint underline-offset-4 hover:text-ink hover:underline">
              Edit
            </Link>
            <div className="font-mono-data text-2xl font-semibold">{money(plan.total)}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="label-caps">Mark:</span>
          {STATUSES.filter((st) => st !== plan.status).map((st) => (
            <form key={st} action={`/api/plans/${plan.id}/status`} method="post" className="inline">
              <input type="hidden" name="status" value={st} />
              <button className={`chip ${chipFor(st)} cursor-pointer`} type="submit">
                {st}
              </button>
            </form>
          ))}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 border-y border-divider py-4 text-[13px] sm:grid-cols-4">
          <Meta k="Builder" v={plan.builder_name || plan.builder_code || "—"} />
          <Meta k="Project" v={plan.proj_name || plan.proj_code || "—"} />
          <Meta k="Proposed" v={shortDate(plan.proposed_at)} />
          <Meta k="Contracted" v={shortDate(plan.contracted_at)} />
        </dl>
      </div>

      {lines.map((line) => {
        const raw = JSON.parse(line.data) as Record<string, string>;
        const kits = KIT_FIELDS.map(([code, label]) => ({
          label,
          qty: Number(raw[`${code}_QTY`] ?? 0),
          cost: Number(raw[`${code}_COS`] ?? 0),
        })).filter((k) => k.qty > 0 || k.cost > 0);
        // App-created lines carry their kit picks explicitly.
        if (raw.APP_KIT_ITEMS) {
          try {
            const appKits = JSON.parse(raw.APP_KIT_ITEMS) as { label: string; qty: number; unitPrice: number }[];
            for (const k of appKits) kits.push({ label: k.label, qty: k.qty, cost: k.qty * k.unitPrice });
          } catch {}
        }
        const sm = Number(raw.SM_CST ?? 0);
        const smLbs = Number(raw.SM_LBSTOT ?? 0);
        let overrides: { what: string; book: number | null; used: number }[] = [];
        if (raw.APP_OVERRIDES) {
          try {
            overrides = JSON.parse(raw.APP_OVERRIDES);
          } catch {}
        }
        const comp = detailRows.filter(
          (d) => d.house_nbr === line.house_nbr && d.system_nbr === line.system_nbr,
        );
        const compGroups = new Map<string, typeof comp>();
        for (const d of comp) {
          const g = compGroups.get(d.category) ?? [];
          g.push(d);
          compGroups.set(d.category, g);
        }
        return (
          <section key={line.id} className="border border-border bg-card">
            <div className="flex items-baseline justify-between border-b border-divider px-5 py-3">
              <div>
                <span className="label-caps">
                  House {line.house_nbr} · System {line.system_nbr} · Work {line.work_nbr}
                </span>
                <h2 className="mt-0.5 text-[15px] font-semibold">{line.house_type || "—"}</h2>
              </div>
              <div className="font-mono-data text-lg font-semibold">{moneyExact(line.final_total)}</div>
            </div>
            <div className="grid gap-x-10 gap-y-4 px-5 py-4 text-[13px] sm:grid-cols-2">
              <table className="w-full">
                <tbody>
                  <Row k="Equipment" v={line.part_nbr || "—"} mono />
                  <Row k="Equipment cost" v={moneyExact(line.part_cost)} mono right />
                  {sm > 0 ? <Row k={`Sheet metal (${smLbs} lbs)`} v={moneyExact(sm)} mono right /> : null}
                  <Row
                    k={`Labor (${line.labor_hours || "—"} hrs)`}
                    v={moneyExact(line.labor_cost)}
                    mono
                    right
                  />
                  <Row k="Factor" v={String(line.factor || "—")} mono right />
                  <Row k="Selling" v={moneyExact(line.selling)} mono right />
                </tbody>
              </table>
              <table className="w-full self-start">
                <tbody>
                  {kits.length ? (
                    kits.map((k) => (
                      <Row key={k.label} k={`${k.label} × ${k.qty}`} v={moneyExact(k.cost)} mono right />
                    ))
                  ) : (
                    <tr>
                      <td className="py-1 text-faint">No kit line items</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {comp.length ? (
              <details className="border-t border-divider px-5 py-3">
                <summary className="label-caps cursor-pointer select-none">
                  Composition — {comp.length} lines from the original bid walk
                </summary>
                <div className="mt-3 grid gap-x-10 gap-y-4 sm:grid-cols-2">
                  {[...compGroups.entries()].map(([cat, rows]) => (
                    <div key={cat}>
                      <div className="label-caps">{cat}</div>
                      <table className="mt-1 w-full text-[12px]">
                        <tbody>
                          {rows.map((d, di) => (
                            <tr key={di} className="border-b border-line-faint last:border-0">
                              <td className="py-1 pr-3">
                                {d.height > 0
                                  ? `${d.feet} ft × ${d.height}×${d.width}${d.insulated ? " · insulated" : ""}`
                                  : d.label || (d.code ? `${d.code}"` : "—")}
                              </td>
                              <td className="w-20 py-1 text-right font-mono-data">
                                {d.height > 0 ? "" : `× ${d.qty}${d.feet ? ` +${d.feet}ft` : ""}`}
                              </td>
                              <td className="w-20 py-1 text-right font-mono-data text-faint">
                                {d.unit_cost ? (d.qty * d.unit_cost).toFixed(2) : ""}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
            {overrides.length ? (
              <div className="border-t border-divider px-5 py-3">
                <span className="label-caps">Off-book pricing on this system</span>
                <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-[12px]">
                  {overrides.map((o, oi) => (
                    <span key={oi}>
                      {o.what}:{" "}
                      <span className="font-mono-data">
                        {o.book === null ? "no book price" : moneyExact(o.book)} → <strong>{moneyExact(o.used)}</strong>
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
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

function Row({ k, v, mono, right }: { k: string; v: string; mono?: boolean; right?: boolean }) {
  return (
    <tr className="border-b border-line-faint last:border-0">
      <td className="py-1 pr-4 text-muted-foreground">{k}</td>
      <td className={`py-1 ${right ? "text-right" : ""} ${mono ? "font-mono-data" : ""}`}>{v}</td>
    </tr>
  );
}
