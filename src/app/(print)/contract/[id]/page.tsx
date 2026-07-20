import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { moneyExact, money, shortDate } from "@/lib/format";
import { COMPANY_KEYS, getSettings } from "@/lib/settings";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

// The contract: company block from Admin settings, scope per system,
// standard exclusions ("Not Included", seeded from the Access masters and
// editable in Admin), totals, signature blocks. Same rule as the quote:
// dollars at system/plan level only.

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const plan = db.prepare("SELECT * FROM plans WHERE id = ?").get(Number(id)) as
    | {
        id: number;
        plan_nbr: string;
        builder_name: string;
        proj_name: string;
        total: number;
        created_by: number | null;
        deleted_at: string | null;
        inclusions: string;
      }
    | undefined;
  if (!plan) notFound();
  if (plan.deleted_at) notFound();
  if (user.role !== "admin" && plan.created_by !== user.id) notFound();

  const s = getSettings(COMPANY_KEYS);
  const exclusions = s.contract_exclusions.split("\n").map((x) => x.trim()).filter(Boolean);

  const lines = db
    .prepare("SELECT house_nbr, system_nbr, house_type, part_nbr, final_total FROM plan_lines WHERE plan_id = ? ORDER BY house_nbr, system_nbr")
    .all(plan.id) as { house_nbr: string; system_nbr: string; house_type: string; part_nbr: string; final_total: number }[];
  const partDesc = db.prepare("SELECT description FROM parts WHERE part_nbr = ?");
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="mx-auto max-w-3xl px-10 py-10 text-[13px] leading-relaxed text-black">
      <style>{`@media print { .no-print { display: none } @page { margin: 0.6in } } body { background: #fff !important; }`}</style>
      <div className="no-print mb-8 flex justify-end gap-3">
        <a href={`/plans/${plan.id}`} className="border border-black px-4 py-1.5 text-sm">← Back to plan</a>
        <a href={`/api/pdf/contract/${plan.id}`} className="border border-black px-4 py-1.5 text-sm">Download PDF</a>
        <PrintButton />
      </div>

      <header className="border-b-2 border-black pb-5 text-center">
        <div className="text-2xl font-bold tracking-tight">{s.company_name}</div>
        <div className="mt-0.5 text-sm">
          {s.company_address1} · {s.company_address2} · {s.company_phone}
          {s.company_fax ? ` · Fax ${s.company_fax}` : ""}
        </div>
        {s.company_license ? <div className="text-sm">{s.company_license}</div> : null}
        <div className="mt-3 text-lg font-bold uppercase tracking-wide">HVAC Contract</div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-8 text-sm">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider">Contract with</div>
          <div className="mt-1 font-semibold">{plan.builder_name}</div>
          {plan.proj_name ? <div>{plan.proj_name}</div> : null}
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-bold">{plan.plan_nbr}</div>
          <div>{today}</div>
        </div>
      </section>

      <section className="mt-6">
        <div className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-1">Scope of work</div>
        <table className="mt-2 w-full">
          <tbody>
            {lines.map((l, i) => {
              const equip = l.part_nbr
                ? ((partDesc.get(l.part_nbr) as { description: string } | undefined)?.description || l.part_nbr)
                : "";
              return (
                <tr key={i} className="border-b border-black/20">
                  <td className="py-1.5 pr-3 font-mono">{l.house_nbr}-{l.system_nbr}</td>
                  <td className="py-1.5 pr-3">
                    <span className="font-semibold">{l.house_type || `System ${i + 1}`}</span>
                    {equip ? <span className="text-black/70"> — {equip}, complete ductwork and accessories per plan</span> : null}
                  </td>
                  <td className="py-1.5 text-right font-mono">{moneyExact(l.final_total)}</td>
                </tr>
              );
            })}
            <tr>
              <td />
              <td className="py-2 text-right font-bold uppercase tracking-wide">Contract total</td>
              <td className="py-2 text-right font-mono text-lg font-bold">{money(plan.total)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {(plan.inclusions ?? "").trim() ? (
        <section className="mt-6">
          <div className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-1">Included</div>
          <ul className="mt-2">
            {plan.inclusions.split("\n").map((x) => x.trim()).filter(Boolean).map((x, i) => (
              <li key={i} className="py-0.5">— {x}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {exclusions.length ? (
        <section className="mt-6">
          <div className="text-[11px] font-bold uppercase tracking-wider border-b border-black pb-1">Not included</div>
          <ul className="mt-2 grid grid-cols-2 gap-x-8">
            {exclusions.map((x, i) => (
              <li key={i} className="py-0.5">— {x}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 text-[12px]">
        <p>{s.quote_terms}</p>
      </section>

      <section className="mt-10 grid grid-cols-2 gap-12">
        {[s.company_name, plan.builder_name].map((party, i) => (
          <div key={i}>
            <div className="border-b border-black pb-8 text-[11px] font-bold uppercase tracking-wider">{party}</div>
            <div className="mt-1 flex justify-between text-[11px] text-black/70">
              <span>Signature</span>
              <span>Date</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
