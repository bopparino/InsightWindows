"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeSystem, type SystemInput } from "@/lib/bidmath";

export type PartOption = { part_nbr: string; description: string; cost: number | null };
export type KitOption = { id: number; code: string; label: string; category: string; price: number | null };

export type SystemState = {
  houseType: string;
  partNbr: string;
  partQuery: string;
  partCostOverride: string; // "" = book price
  sheetMetalCost: string;
  ductBoardCost: string;
  otherCost: string;
  kitLines: { id: string; label: string; qty: string; unitPrice: string }[]; // id "" = custom item
  laborHours: string;
  laborCost: string;
  factor: string;
  taxPct: string;
  permitCost: string;
  serviceCost: string;
  commission: string;
};

export type PlanInitial = {
  planNbr: string;
  builderName: string;
  projName: string;
  systems: SystemState[];
};

export const blankSystem = (): SystemState => ({
  houseType: "",
  partNbr: "",
  partQuery: "",
  partCostOverride: "",
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
const maybe = (v: string): number | null => (v.trim() === "" ? null : n(v));

const usd = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export default function PlanForm({
  parts,
  kits,
  planId,
  initial,
}: {
  parts: PartOption[];
  kits: KitOption[];
  planId?: number;
  initial?: PlanInitial;
}) {
  const router = useRouter();
  const [planNbr, setPlanNbr] = useState(initial?.planNbr ?? "");
  const [builderName, setBuilderName] = useState(initial?.builderName ?? "");
  const [projName, setProjName] = useState(initial?.projName ?? "");
  const [systems, setSystems] = useState<SystemState[]>(initial?.systems?.length ? initial.systems : [blankSystem()]);
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

  const toInput = (s: SystemState): SystemInput => {
    const bookPart = partIndex.get(s.partNbr)?.cost ?? 0;
    return {
      houseType: s.houseType,
      partNbr: s.partNbr,
      partCost: maybe(s.partCostOverride) ?? bookPart,
      sheetMetalCost: n(s.sheetMetalCost),
      ductBoardCost: n(s.ductBoardCost),
      otherCost: n(s.otherCost),
      kitLines: s.kitLines
        .filter((k) => n(k.qty) > 0 && (kitIndex.has(k.id) || (k.id === "" && k.label.trim())))
        .map((k) => {
          const item = kitIndex.get(k.id);
          return {
            code: item?.code ?? "CUSTOM",
            label: item?.label ?? k.label,
            qty: n(k.qty),
            unitPrice: maybe(k.unitPrice) ?? item?.price ?? 0,
          };
        }),
      laborHours: n(s.laborHours),
      laborCost: n(s.laborCost),
      factor: n(s.factor) || 1,
      taxPct: n(s.taxPct),
      permitCost: n(s.permitCost),
      serviceCost: n(s.serviceCost),
      commission: n(s.commission),
    };
  };

  const totals = systems.map((s) => computeSystem(toInput(s)));
  const planTotal = totals.reduce((sum, t) => sum + t.finalTotal, 0);

  const patch = (i: number, p: Partial<SystemState>) =>
    setSystems((prev) => prev.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const patchKit = (i: number, ki: number, p: Partial<SystemState["kitLines"][number]>) =>
    setSystems((prev) =>
      prev.map((s, j) =>
        j === i ? { ...s, kitLines: s.kitLines.map((x, xi) => (xi === ki ? { ...x, ...p } : x)) } : s,
      ),
    );

  async function save() {
    setSaving(true);
    setError("");
    const payload = {
      planNbr,
      builderName,
      projName,
      systems: systems.map((s) => ({
        houseType: s.houseType.trim(),
        partNbr: s.partNbr.trim(),
        partCostOverride: maybe(s.partCostOverride),
        sheetMetalCost: n(s.sheetMetalCost),
        ductBoardCost: n(s.ductBoardCost),
        otherCost: n(s.otherCost),
        kitLines: s.kitLines
          .filter((k) => n(k.qty) > 0)
          .map((k) =>
            k.id !== ""
              ? { id: Number(k.id), qty: n(k.qty), unitPrice: maybe(k.unitPrice) }
              : { label: k.label.trim(), qty: n(k.qty), unitPrice: maybe(k.unitPrice) ?? 0 },
          ),
        laborHours: n(s.laborHours),
        laborCost: n(s.laborCost),
        factor: n(s.factor) || 1,
        taxPct: n(s.taxPct),
        permitCost: n(s.permitCost),
        serviceCost: n(s.serviceCost),
        commission: n(s.commission),
      })),
    };
    const res = await fetch(planId != null ? `/api/plans/${planId}` : "/api/plans", {
      method: planId != null ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError(await res.text());
      setSaving(false);
      return;
    }
    const { id } = (await res.json()) as { id: number };
    router.push(`/plans/${id}`);
    router.refresh();
  }

  const inputCls = "w-full border border-input bg-card px-2 py-1.5 text-[13px]";
  const numCls = "w-24 border border-input bg-card px-2 py-1 text-right font-mono-data text-[13px]";

  return (
    <div className="space-y-8">
      <section className="grid gap-4 border-y border-divider py-5 sm:grid-cols-3">
        <div>
          <label className="label-caps">Plan #</label>
          <input
            className={`${inputCls} font-mono-data`}
            value={planNbr}
            onChange={(e) => setPlanNbr(e.target.value)}
            placeholder="AC101F26"
            disabled={planId != null}
          />
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
        const bookPart = part?.cost ?? null;
        const t = totals[i];
        const matches =
          s.partQuery.length >= 2
            ? parts
                .filter(
                  (p) =>
                    p.part_nbr.toUpperCase().includes(s.partQuery.toUpperCase()) ||
                    p.description.toUpperCase().includes(s.partQuery.toUpperCase()),
                )
                .slice(0, 8)
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
                  {part || s.partNbr ? (
                    <div className="mt-1 flex items-center gap-2 text-[12px] text-faint">
                      <span className="truncate">{part?.description || "—"}</span>
                      <span className="label-caps ml-auto">cost</span>
                      <input
                        className="w-24 border border-input bg-card px-1 py-0.5 text-right font-mono-data text-[12px]"
                        value={s.partCostOverride}
                        onChange={(e) => patch(i, { partCostOverride: e.target.value })}
                        placeholder={bookPart === null ? "0.00" : bookPart.toFixed(2)}
                        inputMode="decimal"
                      />
                      {maybe(s.partCostOverride) != null && maybe(s.partCostOverride) !== bookPart ? (
                        <span className="chip chip-warn">override</span>
                      ) : null}
                    </div>
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
                  <label className="label-caps">Kit items · price editable in-bid</label>
                  {s.kitLines.map((k, ki) => {
                    const item = kitIndex.get(k.id);
                    const isCustom = k.id === "";
                    const book = item?.price ?? null;
                    const used = maybe(k.unitPrice) ?? book ?? 0;
                    const overridden = maybe(k.unitPrice) != null && maybe(k.unitPrice) !== book;
                    return (
                      <div key={ki} className="mt-1 flex items-center gap-2">
                        {isCustom ? (
                          <input
                            className="min-w-0 flex-1 border border-input bg-card px-1 py-1 text-[12px]"
                            value={k.label}
                            onChange={(e) => patchKit(i, ki, { label: e.target.value })}
                            placeholder="Custom item description…"
                          />
                        ) : (
                          <select
                            className="min-w-0 flex-1 border border-input bg-card px-1 py-1 text-[12px]"
                            value={k.id}
                            onChange={(e) => patchKit(i, ki, { id: e.target.value, unitPrice: "" })}
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
                        )}
                        <input
                          className="w-14 border border-input bg-card px-1 py-1 text-right font-mono-data text-[12px]"
                          value={k.qty}
                          onChange={(e) => patchKit(i, ki, { qty: e.target.value })}
                          inputMode="numeric"
                          title="Quantity"
                        />
                        <input
                          className={`w-20 border px-1 py-1 text-right font-mono-data text-[12px] ${overridden || isCustom ? "border-warn-line bg-warn-bg" : "border-input bg-card"}`}
                          value={k.unitPrice}
                          onChange={(e) => patchKit(i, ki, { unitPrice: e.target.value })}
                          placeholder={book === null ? "0.00" : book.toFixed(2)}
                          inputMode="decimal"
                          title="Unit price (blank = Price Book)"
                        />
                        <span className="w-20 text-right font-mono-data text-[12px]">{usd(n(k.qty) * used)}</span>
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
                  <div className="mt-1 flex gap-4">
                    <button
                      type="button"
                      className="text-[12px] text-faint hover:text-ink"
                      onClick={() => patch(i, { kitLines: [...s.kitLines, { id: "", label: "", qty: "1", unitPrice: "" }] })}
                    >
                      + Custom item
                    </button>
                    <button
                      type="button"
                      className="text-[12px] text-faint hover:text-ink"
                      onClick={() =>
                        patch(i, { kitLines: [...s.kitLines, { id: String(kits[0]?.id ?? ""), label: "", qty: "1", unitPrice: "" }] })
                      }
                    >
                      + Book item
                    </button>
                  </div>
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
            {saving ? "Saving…" : planId != null ? "Save changes" : "Create plan"}
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
