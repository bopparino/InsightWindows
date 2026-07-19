import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import PlanForm, { blankSystem, type KitOption, type PartOption, type PlanInitial, type SystemState } from "@/components/PlanForm";

export const dynamic = "force-dynamic";

// Edit any plan - app-born or imported. Imported lines can't decompose their
// legacy duct/kit columns into Price Book picks, so everything not otherwise
// mapped lands in "Other $" as a residual: the recomputed TOTCOST (and with
// the proven formula, every downstream number) starts penny-identical to the
// stored line. Editing from there is intentional change only.

const f = (r: Record<string, string>, k: string) => {
  const x = Number(r[k] ?? 0);
  return Number.isFinite(x) ? x : 0;
};

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const plan = db.prepare("SELECT * FROM plans WHERE id = ?").get(Number(id)) as
    | { id: number; plan_nbr: string; builder_name: string; proj_name: string }
    | undefined;
  if (!plan) notFound();

  const lines = db
    .prepare("SELECT * FROM plan_lines WHERE plan_id = ? ORDER BY house_nbr, system_nbr, work_nbr")
    .all(plan.id) as { house_type: string; part_nbr: string; part_cost: number; data: string }[];

  const kits = db
    .prepare(
      `SELECT id, code, label, category, price FROM kit_items
       WHERE is_chart = 0 AND category != 'Fixed Prices' ORDER BY category, sort`,
    )
    .all() as KitOption[];
  const parts = db
    .prepare("SELECT part_nbr, description, cost FROM parts ORDER BY part_nbr")
    .all() as PartOption[];
  const partCosts = new Map(parts.map((p) => [p.part_nbr, p.cost]));
  const kitByCode = new Map(kits.map((k) => [k.code, k]));

  const systems: SystemState[] = lines.map((line) => {
    const raw = JSON.parse(line.data) as Record<string, string>;
    const s = blankSystem();
    s.houseType = line.house_type;
    s.partNbr = line.part_nbr;
    const bookCost = partCosts.get(line.part_nbr) ?? null;
    if (line.part_cost !== (bookCost ?? 0)) s.partCostOverride = String(line.part_cost);

    const sm = f(raw, "SM_CST");
    const dbCost = f(raw, "DBTOT");
    s.sheetMetalCost = sm ? String(sm) : "";
    s.ductBoardCost = dbCost ? String(dbCost) : "";

    let kitTotal = 0;
    if (raw.APP_KIT_ITEMS) {
      try {
        const appKits = JSON.parse(raw.APP_KIT_ITEMS) as { code: string; label: string; qty: number; unitPrice: number }[];
        s.kitLines = appKits.map((k) => {
          kitTotal += k.qty * k.unitPrice;
          const book = k.code !== "CUSTOM" ? kitByCode.get(k.code) : undefined;
          return {
            id: book ? String(book.id) : "",
            label: k.label,
            qty: String(k.qty),
            unitPrice: book && book.price === k.unitPrice ? "" : String(k.unitPrice),
          };
        });
      } catch {}
    }

    // Residual keeps the recomputed cost identical to the stored TOTCOST.
    const totCost = f(raw, "TOTCOST");
    const residual = Math.round((totCost - line.part_cost - sm - dbCost - kitTotal) * 100) / 100;
    s.otherCost = residual > 0 ? String(residual) : "";

    const hrs = f(raw, "LABOR_HRS");
    const laborCost = f(raw, "LABOR_COS");
    s.laborHours = hrs ? String(hrs) : "";
    // Historical rate is cost/hours ($86/hr in all 2025+ data); rare
    // hourless labor dollars ride through as a synthetic-hours line.
    if (hrs > 0) s.laborRate = String(Math.round((laborCost / hrs) * 100) / 100);
    else if (laborCost > 0) {
      s.laborHours = String(Math.round((laborCost / 86) * 100) / 100);
      s.laborRate = "86";
    }
    s.factor = String(f(raw, "FACTOR") || 1);
    s.taxPct = String(f(raw, "SALTAX_PCT"));
    const permits = f(raw, "PERMIT_COS") + f(raw, "ELPERM_COS");
    s.permitCost = permits ? String(permits) : "";
    s.serviceCost = raw.SERV_COS ? String(f(raw, "SERV_COS")) : "";
    s.commission = raw.SALCOM_TOT ? String(f(raw, "SALCOM_TOT")) : "";
    return s;
  });

  const initial: PlanInitial = {
    planNbr: plan.plan_nbr,
    builderName: plan.builder_name,
    projName: plan.proj_name,
    systems,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        Edit <span className="font-mono-data">{plan.plan_nbr}</span>
      </h1>
      <p className="mt-1 text-[13px] text-faint">
        Legacy costs that don&apos;t map to Price Book picks sit in “Other $” so totals start exactly as stored.
      </p>
      <div className="mt-6">
        <PlanForm parts={parts} kits={kits} planId={plan.id} initial={initial} />
      </div>
    </div>
  );
}
