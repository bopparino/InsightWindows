import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money, moneyExact } from "@/lib/format";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

// The quote: line items only. What's included is listed by name and quantity;
// dollars appear ONLY at the system and plan level - no unit prices, no
// costs, no factor, no tax breakdown, no evidence of any surcharge. The
// salesman block comes from the account of whoever is printing.

const KIT_FIELDS: [string, string][] = [
  ["BAEX", "Bath exhaust run"], ["BAFN", "Bath fan"], ["KIEX", "Kitchen exhaust run"],
  ["DRVT", "Dryer vent run"], ["REG", "Registers"], ["GRILL", "Grills"],
  ["REFLN", "Refrigerant line set"], ["CONWIR", "Control wiring"],
  ["CONDP", "Condensate pump"], ["SLAB", "Equipment pad"], ["SERV", "Service"],
];

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const plan = db.prepare("SELECT * FROM plans WHERE id = ?").get(Number(id)) as
    | { id: number; plan_nbr: string; builder_name: string; proj_name: string; house_types: string; total: number }
    | undefined;
  if (!plan) notFound();
  if ((plan as unknown as { deleted_at: string | null }).deleted_at) notFound();
  if (user.role !== "admin" && (plan as unknown as { created_by: number | null }).created_by !== user.id) notFound();

  const contact = db
    .prepare("SELECT display_name, email, phone FROM users WHERE id = ?")
    .get(user.id) as { display_name: string; email: string; phone: string };

  const lines = db
    .prepare("SELECT * FROM plan_lines WHERE plan_id = ? ORDER BY house_nbr, system_nbr, work_nbr")
    .all(plan.id) as { house_nbr: string; system_nbr: string; house_type: string; part_nbr: string; final_total: number; data: string }[];

  const details = db
    .prepare(
      `SELECT house_nbr, system_nbr, category, label, code, qty FROM plan_line_details
       WHERE plan_id = ? AND qty > 0 AND label != '' ORDER BY category, id`,
    )
    .all(plan.id) as { house_nbr: string; system_nbr: string; category: string; label: string; code: string; qty: number }[];

  const partDesc = db.prepare("SELECT description FROM parts WHERE part_nbr = ?");

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="mx-auto max-w-3xl px-10 py-10 text-[13px] leading-relaxed text-black">
      <style>{`
        @media print { .no-print { display: none } @page { margin: 0.6in } }
        body { background: #fff !important; }
      `}</style>

      <div className="no-print mb-8 flex justify-end gap-3">
        <a href={`/plans/${plan.id}`} className="border border-black px-4 py-1.5 text-sm">
          ← Back to plan
        </a>
        <PrintButton />
      </div>

      <header className="flex items-start justify-between border-b-2 border-black pb-5">
        <div>
          <div className="text-2xl font-bold tracking-tight">W.H. METCALFE &amp; SONS, INC.</div>
          <div className="mt-0.5 text-sm">Heating &amp; Air Conditioning</div>
        </div>
        <div className="text-right text-sm">
          <div className="font-mono text-lg font-bold">{plan.plan_nbr}</div>
          <div>HVAC Proposal</div>
          <div>{today}</div>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-8 text-sm">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider">Prepared for</div>
          <div className="mt-1 font-semibold">{plan.builder_name || "—"}</div>
          {plan.proj_name ? <div>{plan.proj_name}</div> : null}
        </div>
        <div className="text-right">
          <div className="text-[11px] font-bold uppercase tracking-wider">Prepared by</div>
          <div className="mt-1 font-semibold">{contact.display_name}</div>
          {contact.phone ? <div>{contact.phone}</div> : null}
          {contact.email ? <div>{contact.email}</div> : null}
        </div>
      </section>

      {lines.map((line, li) => {
        const raw = JSON.parse(line.data) as Record<string, string>;
        const comp = details.filter((d) => d.house_nbr === line.house_nbr && d.system_nbr === line.system_nbr);
        let items: { label: string; qty: number }[] = [];
        if (comp.length) {
          items = comp.map((d) => ({ label: d.label, qty: d.qty }));
        } else if (raw.APP_KIT_ITEMS) {
          try {
            items = (JSON.parse(raw.APP_KIT_ITEMS) as { label: string; qty: number }[]).map((k) => ({
              label: k.label,
              qty: k.qty,
            }));
          } catch {}
        } else {
          items = KIT_FIELDS.map(([code, label]) => ({ label, qty: Number(raw[`${code}_QTY`] ?? 0) })).filter(
            (k) => k.qty > 0,
          );
        }
        const equip = line.part_nbr
          ? ((partDesc.get(line.part_nbr) as { description: string } | undefined)?.description || line.part_nbr)
          : "";
        const hasDuct = Number(raw.SM_LBSTOT ?? 0) > 0 || Number(raw.SM_CST ?? 0) > 0 || Number(raw.DBTOT ?? 0) > 0;
        return (
          <section key={li} className="mt-6 break-inside-avoid border border-black">
            <div className="flex items-baseline justify-between border-b border-black bg-black px-4 py-2 text-white">
              <span className="text-sm font-bold uppercase tracking-wide">{line.house_type || `System ${li + 1}`}</span>
              <span className="font-mono text-sm font-bold">{moneyExact(line.final_total)}</span>
            </div>
            <div className="px-4 py-3">
              <table className="w-full">
                <tbody>
                  {equip ? (
                    <tr>
                      <td className="py-0.5 font-semibold">{equip}</td>
                      <td className="py-0.5 text-right font-mono">1</td>
                    </tr>
                  ) : null}
                  {hasDuct ? (
                    <tr>
                      <td className="py-0.5">Complete ductwork system, fabricated &amp; installed</td>
                      <td className="py-0.5 text-right font-mono">—</td>
                    </tr>
                  ) : null}
                  {items.map((k, ki) => (
                    <tr key={ki}>
                      <td className="py-0.5">{k.label}</td>
                      <td className="py-0.5 text-right font-mono">{k.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <section className="mt-6 flex items-baseline justify-between border-t-2 border-black pt-4">
        <span className="text-base font-bold uppercase tracking-wide">Total proposal</span>
        <span className="font-mono text-2xl font-bold">{money(plan.total)}</span>
      </section>

      <footer className="mt-8 border-t border-black pt-4 text-[11px] leading-relaxed">
        <p>
          All equipment installed to manufacturer specification and local code. Proposal valid for 30 days
          from the date above. Please contact {contact.display_name.split(" ")[0]} with any questions.
        </p>
      </footer>
    </div>
  );
}
