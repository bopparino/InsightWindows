import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import PlanForm, { type KitOption, type PartOption } from "@/components/PlanForm";

export const dynamic = "force-dynamic";

export default async function NewPlanPage() {
  await requireUser();
  const parts = db
    .prepare("SELECT part_nbr, description, cost FROM parts ORDER BY part_nbr")
    .all() as PartOption[];
  const builders = (
    db
      .prepare(
        `SELECT name FROM (
           SELECT DISTINCT builder_name AS name FROM plans WHERE builder_name != ''
           UNION SELECT DISTINCT name FROM builders
         ) ORDER BY name`,
      )
      .all() as { name: string }[]
  ).map((b) => b.name);
  const kits = db
    .prepare(
      `SELECT id, code, label, category, price FROM kit_items
       WHERE is_chart = 0 AND category != 'Fixed Prices'
       ORDER BY category, sort`,
    )
    .all() as KitOption[];

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">New Plan</h1>
      <p className="mt-1 text-[14px] text-faint">
        Prices come from the live Price Book and Equipment tables; totals use the verified bid math.
      </p>
      <div className="mt-6">
        <PlanForm parts={parts} kits={kits} builders={builders} />
      </div>
    </div>
  );
}
