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
        proposed_at: string | null;
        contracted_at: string | null;
        edited_at: string;
      }
    | undefined;
  if (!plan) notFound();

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
          <h1 className="font-mono-data text-2xl font-bold tracking-tight">{plan.plan_nbr}</h1>
          <div className="font-mono-data text-2xl font-semibold">{money(plan.total)}</div>
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
        const sm = Number(raw.SM_CST ?? 0);
        const smLbs = Number(raw.SM_LBSTOT ?? 0);
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
