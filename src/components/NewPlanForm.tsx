"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeSystem, type SystemInput } from "@/lib/bidmath";

export type PartOption = { part_nbr: string; description: string; cost: number | null };
export type KitOption = { id: number; code: string; label: string; category: string; price: number | null };

type SystemState = {
  houseType: string;
  partNbr: string;
  partQuery: string;
  sheetMetalCost: string;
  ductBoardCost: string;
  otherCost: string;
  kitLines: { id: string; qty: string }[];
  laborHours: string;
  laborCost: string;
  factor: string;
  taxPct: string;
  permitCost: string;
  serviceCost: string;
  commission: string;
};

const blankSystem = (): SystemState => ({
  houseType: "",
  partNbr: "",
  partQuery: "",
  sheetMetalCost: "",
  ductBoardCost: "",
  otherCost: "",
  kitLines: [],
  laborHours: "",
  laborCost: "",
  factor: "0.6",
  taxPct: "0.06",
  permitCost: "",
  serviceCost: "",
  commission: "",
});

const n = (v: string) => {
  const x = Number(v.replace(/[$,\s]/g, ""));
  return Number.isFinite(x) ? x : 0;
};

const usd = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export default function NewPlanForm({ parts, kits }: { parts: PartOption[]; kits: KitOption[] }) {
  const router = useRouter();
  const [planNbr, setPlanNbr] = useState("");
  const [builderName, setBuilderName] = useState("");
  const [projName, setProjName] = useState("");
  const [systems, setSystems] = useState<SystemState[]>([blankSystem()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const partIndex = useMemo(() => new Map(parts.map((p) => [p.part_nbr, p])), [parts]);
  const kitIndex = useMemo(() => new Map(kits.map((k) => [String(k.id), k])), [kits]);
  const kitCategories = useMemo(() => {
    const m = new Map<string, KitOption[]>();
    for (const k of kits) {
      const g = m.get(k.category) ?? [];
      g.push(k);
      m.set(k.category, g);
    }
    return [...m.entries()];
  }, [kits]);

  const toInput = (s: SystemState): SystemInput => ({
    houseType: s.houseType,
    partNbr: s.partNbr,
    partCost: partIndex.get(s.partNbr)?.cost ?? 0,
    sheetMetalCost: n(s.sheetMetalCost),
    ductBoardCost: n(s.ductBoardCost),
    otherCost: n(s.otherCost),
    kitLines: s.kitLines
      .filter((k) => n(k.qty) > 0 && kitIndex.has(k.id))
      .map((k) => ({
        code: k.id,
        label: kitIndex.get(k.id)!.label,
        qty: n(k.qty),
        unitPrice: kitIndex.get(k.id)!.price ?? 0,
      })),
    laborHours: n(s.laborHours),
    laborCost: n(s.laborCost),
    factor: n(s.factor) || 1,
    taxPct: n(s.taxPct),
    permitCost: n(s.permitCost),
    serviceCost: n(s.serviceCost),
    commission: n(s.commission),
  });

  const totals = systems.map((s) => computeSystem(toInput(s)));
  const planTotal = totals.reduce((sum, t) => sum + t.finalTotal, 0);

  const patch = (i: number, p: Partial<SystemState>) =>
    setSystems((prev) => prev.map((s, j) => (j === i ? { ...s, ...p } : s)));

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planNbr,
        builderName,
        projName,
        systems: systems.map((s) => {
          const input = toInput(s);
          return {
            houseType: input.houseType,
            partNbr: input.partNbr,
            sheetMetalCost: input.sheetMetalCost,
            ductBoardCost: input.ductBoardCost,
            otherCost: input.otherCost,
            kitLines: input.kitLines.map((k) => ({ id: Number(k.code), qty: k.qty })),
            laborHours: input.laborHours,
            laborCost: input.laborCost,
            factor: input.factor,
            taxPct: input.taxPct,
            permitCost: input.permitCost,
            serviceCost: input.serviceCost,
            commission: input.commission,
          };
        }),
      }),
    });
    if (!res.ok) {
      setError(await res.text());
      setSaving(false);
      return;
    }
    const { id } = (await res.json()) as { id: number };
    router.push(`/plans/${id}`);
  }

  const inputCls = "w-full border border-input bg-card px-2 py-1.5 text-[13px]";
  const numCls = "w-24 border border-input bg-card px-2 py-1 text-right font-mono-data text-[13px]";

  return (
    <div className="space-y-8">
      <section className="grid gap-4 border-y border-divider py-5 sm:grid-cols-3">
        <div>
          <label className="label-caps">Plan #</label>
          <input className={`${inputCls} font-mono-data`} value={planNbr} onChange={(e) => setPlanNbr(e.target.value)} placeholder="AC101F26" />
        </div>
        <div>
          <label className="label-caps">Builder</label>
          <input className={inputCls} value={builderName} onChange={(e) => setBuilderName(e.target.value)} placeholder="D.R. HORTON" />
        </div>
        <div>
          <label className="label-caps">Project</label>
          <input className={inputCls} value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="RENN QUARTER" />
        </div>
      </section>

      {systems.map((s, i) => {
        const part = partIndex.get(s.partNbr);
        const t = totals[i];
        const matches =
          s.partQuery.length >= 2
            ? parts.filter(
                (p) =>
                  p.part_nbr.toUpperCase().includes(s.partQuery.toUpperCase()) ||
                  p.description.toUpperCase().includes(s.partQuery.toUpperCase()),
              ).slice(0, 8)
            : [];
        return (
          <section key={i} className="border border-border bg-card">
            <div className="flex items-baseline justify-between border-b border-divider px-5 py-3">
              <span className="label-caps">System {i + 1}</span>
              {systems.length > 1 ? (
                <button
                  type="button"
                  className="text-[12px] text-faint hover:text-destructive"
                  onClick={() => setSystems((prev) => prev.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              ) : null}
            </div>

            <div className="grid gap-x-8 gap-y-4 px-5 py-4 sm:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <label className="label-caps">House type / zone</label>
                  <input className={inputCls} value={s.houseType} onChange={(e) => patch(i, { houseType: e.target.value })} placeholder="HADLEY Z-1 90+" />
                </div>
                <div>
                  <label className="label-caps">Equipment (search part # or description)</label>
                  <input
                    className={`${inputCls} font-mono-data`}
                    value={s.partNbr || s.partQuery}
                    onChange={(e) => patch(i, { partQuery: e.target.value, partNbr: "" })}
                    placeholder="CG9+602.5CP…"
                  />
                  {matches.length && !s.partNbr ? (
                    <div className="mt-1 border border-border bg-card">
                      {matches.map((m) => (
                        <button
                          key={m.part_nbr}
                          type="button"
                          className="flex w-full items-baseline justify-between px-2 py-1 text-left text-[12px] hover:bg-row-tint"
                          onClick={() => patch(i, { partNbr: m.part_nbr, partQuery: "" })}
                        >
                          <span className="font-mono-data font-semibold">{m.part_nbr}</span>
                          <span className="ml-3 truncate text-faint">{m.description}</span>
                          <span className="ml-3 font-mono-data">{m.cost === null ? "—" : usd(m.cost)}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {part ? (
                    <p className="mt-1 text-[12px] text-faint">
                      {part.description || "bundle"} — <span className="font-mono-data">{part.cost === null ? "no cost" : usd(part.cost)}</span>
                    </p>
                  ) : null}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label-caps">Sheet metal $</label>
                    <input className={numCls} value={s.sheetMetalCost} onChange={(e) => patch(i, { sheetMetalCost: e.target.value })} inputMode="decimal" />
                  </div>
                  <div>
                    <label className="label-caps">Duct board $</label>
                    <input className={numCls} value={s.ductBoardCost} onChange={(e) => patch(i, { ductBoardCost: e.target.value })} inputMode="decimal" />
                  </div>
                  <div>
                    <label className="label-caps">Other $</label>
                    <input className={numCls} value={s.otherCost} onChange={(e) => patch(i, { otherCost: e.target.value })} inputMode="decimal" />
                  </div>
                </div>

                <div>
                  <label className="label-caps">Kit items</label>
                  {s.kitLines.map((k, ki) => {
                    const item = kitIndex.get(k.id);
                    return (
                      <div key={ki} className="mt-1 flex items-center gap-2">
                        <select
                          className="min-w-0 flex-1 border border-input bg-card px-1 py-1 text-[12px]"
                          value={k.id}
                          onChange={(e) =>
                            patch(i, { kitLines: s.kitLines.map((x, xi) => (xi === ki ? { ...x, id: e.target.value } : x)) })
                          }
                        >
                          <option value="">— pick item —</option>
                          {kitCategories.map(([cat, items]) => (
                            <optgroup key={cat} label={cat}>
                              {items.map((it) => (
                                <option key={it.id} value={String(it.id)}>
                                  {it.label || it.code} ({it.price === null ? "—" : usd(it.price)})
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <input
                          className="w-14 border border-input bg-card px-1 py-1 text-right font-mono-data text-[12px]"
                          value={k.qty}
                          onChange={(e) =>
                            patch(i, { kitLines: s.kitLines.map((x, xi) => (xi === ki ? { ...x, qty: e.target.value } : x)) })
                          }
                          inputMode="numeric"
                        />
                        <span className="w-20 text-right font-mono-data text-[12px]">
                          {item?.price != null ? usd(n(k.qty) * item.price) : "—"}
                        </span>
                        <button
                          type="button"
                          className="text-[12px] text-faint hover:text-destructive"
                          onClick={() => patch(i, { kitLines: s.kitLines.filter((_, xi) => xi !== ki) })}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="mt-1 text-[12px] text-faint hover:text-ink"
                    onClick={() => patch(i, { kitLines: [...s.kitLines, { id: "", qty: "1" }] })}
                  >
                    + Add kit item
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label-caps">Labor hrs</label>
                    <input className={numCls} value={s.laborHours} onChange={(e) => patch(i, { laborHours: e.target.value })} inputMode="decimal" />
                  </div>
                  <div>
                    <label className="label-caps">Labor $</label>
                    <input className={numCls} value={s.laborCost} onChange={(e) => patch(i, { laborCost: e.target.value })} inputMode="decimal" />
                  </div>
                  <div>
                    <label className="label-caps">Factor</label>
                    <input className={numCls} value={s.factor} onChange={(e) => patch(i, { factor: e.target.value })} inputMode="decimal" />
                  </div>
                  <div>
                    <label className="label-caps">Tax (frac)</label>
                    <input className={numCls} value={s.taxPct} onChange={(e) => patch(i, { taxPct: e.target.value })} inputMode="decimal" />
                  </div>
                  <div>
                    <label className="label-caps">Permits $</label>
                    <input className={numCls} value={s.permitCost} onChange={(e) => patch(i, { permitCost: e.target.value })} inputMode="decimal" />
                  </div>
                  <div>
                    <label className="label-caps">Service $</label>
                    <input className={numCls} value={s.serviceCost} onChange={(e) => patch(i, { serviceCost: e.target.value })} inputMode="decimal" />
                  </div>
                  <div>
                    <label className="label-caps">Commission $</label>
                    <input className={numCls} value={s.commission} onChange={(e) => patch(i, { commission: e.target.value })} inputMode="decimal" />
                  </div>
                </div>

                <table className="w-full text-[13px]">
                  <tbody>
                    <TR k="Kit total" v={usd(t.kitTotal)} />
                    <TR k="Total cost" v={usd(t.totCost)} />
                    <TR k={`Selling (cost ÷ ${s.factor || "?"})`} v={usd(t.totSelling)} />
                    <TR k="Profit" v={usd(t.factorTot)} />
                    <TR k="Sales tax" v={usd(t.salesTax)} />
                    <tr className="border-t border-border">
                      <td className="py-1.5 font-semibold">System total</td>
                      <td className="py-1.5 text-right font-mono-data text-[15px] font-semibold">{usd(t.finalTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        );
      })}

      <div className="flex items-center justify-between">
        <button
          type="button"
          className="text-[13px] text-faint hover:text-ink"
          onClick={() => setSystems((prev) => [...prev, blankSystem()])}
        >
          + Add system / zone
        </button>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="label-caps">Plan total</div>
            <div className="font-mono-data text-xl font-bold">{usd(planTotal)}</div>
          </div>
          <button
            type="button"
            disabled={saving || !planNbr.trim() || !builderName.trim()}
            onClick={save}
            className="btn-glow bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {saving ? "Saving…" : "Create plan"}
          </button>
        </div>
      </div>
      {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
    </div>
  );
}

function TR({ k, v }: { k: string; v: string }) {
  return (
    <tr className="border-b border-line-faint">
      <td className="py-1 text-muted-foreground">{k}</td>
      <td className="py-1 text-right font-mono-data">{v}</td>
    </tr>
  );
}
