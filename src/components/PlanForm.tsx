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
  // id "" + label => custom item; picking rows are the in-progress search UI
  kitLines: { id: string; label: string; qty: string; unitPrice: string; picking?: boolean; query?: string }[];
  laborHours: string;
  laborRate: string;
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
  laborRate: "86",
  factor: "0.6",
  taxPct: "0.06",
  permitCost: "",
  serviceCost: "",
  commission: "",
});

const n = (v: string) => {
  const x = Number(v.replace(/[$,%\s]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const maybe = (v: string): number | null => (v.trim() === "" ? null : n(v));
// Tax accepts "6", "6%", or "0.06" - anything above 1 is read as a percent.
const pct = (v: string) => {
  const x = n(v);
  return x > 1 ? x / 100 : x;
};

const WALK_ORDER = [
  "Sheet Metal Runs", "Duct Board Runs", "Flex Runs", "Flex Runs w/ Hardware",
  "Exhaust Runs", "Fans", "FA Dampers", "RA & CA Grills", "Wall Caps & Roof Jacks",
  "DB Triangles & RA Pans", "Round Pipe", "Miscellaneous Kit", "Stats",
];

const usd = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export default function PlanForm({
  parts,
  kits,
  builders,
  planId,
  initial,
}: {
  parts: PartOption[];
  kits: KitOption[];
  builders: string[];
  planId?: number;
  initial?: PlanInitial;
}) {
  const router = useRouter();
  const [planNbr, setPlanNbr] = useState(initial?.planNbr ?? "");
  const [builderName, setBuilderName] = useState(initial?.builderName ?? "");
  const [builderFocus, setBuilderFocus] = useState(false);
  const [projName, setProjName] = useState(initial?.projName ?? "");
  const [systems, setSystems] = useState<SystemState[]>(initial?.systems?.length ? initial.systems : [blankSystem()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  // The per-zone walker: one zone open at a time; the rest collapse to cards.
  const [openZone, setOpenZone] = useState<number | null>(planId != null ? null : 0);

  const partIndex = useMemo(() => new Map(parts.map((p) => [p.part_nbr, p])), [parts]);
  const kitIndex = useMemo(() => new Map(kits.map((k) => [String(k.id), k])), [kits]);
  const walkCats = useMemo(() => {
    const m = new Map<string, KitOption[]>();
    for (const k of kits) {
      const g = m.get(k.category) ?? [];
      g.push(k);
      m.set(k.category, g);
    }
    return [...m.entries()].sort(([a], [b]) => {
      const ia = WALK_ORDER.indexOf(a);
      const ib = WALK_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
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
        .filter((k) => !k.picking && n(k.qty) > 0 && (kitIndex.has(k.id) || (k.id === "" && k.label.trim())))
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
      laborCost: Math.round(n(s.laborHours) * n(s.laborRate) * 100) / 100,
      factor: n(s.factor) || 1,
      taxPct: pct(s.taxPct),
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
  const dropKit = (i: number, ki: number) =>
    setSystems((prev) =>
      prev.map((s, j) => (j === i ? { ...s, kitLines: s.kitLines.filter((_, xi) => xi !== ki) } : s)),
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
          .filter((k) => !k.picking && n(k.qty) > 0)
          .map((k) =>
            k.id !== ""
              ? { id: Number(k.id), qty: n(k.qty), unitPrice: maybe(k.unitPrice) }
              : { label: k.label.trim(), qty: n(k.qty), unitPrice: maybe(k.unitPrice) ?? 0 },
          ),
        laborHours: n(s.laborHours),
        laborCost: Math.round(n(s.laborHours) * n(s.laborRate) * 100) / 100,
        factor: n(s.factor) || 1,
        taxPct: pct(s.taxPct),
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

  const inputCls = "w-full border border-input bg-card px-2 py-1.5 text-[14px]";
  const numCls = "w-full border border-input bg-card px-2 py-1 text-right font-mono-data text-[14px]";

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
        <div className="relative">
          <label className="label-caps">Builder</label>
          <input
            className={inputCls}
            value={builderName}
            onChange={(e) => setBuilderName(e.target.value)}
            onFocus={() => setBuilderFocus(true)}
            onBlur={() => setTimeout(() => setBuilderFocus(false), 150)}
            placeholder="Type to search builders…"
          />
          {builderFocus && builderName.trim().length >= 2
            ? (() => {
                const q = builderName.trim().toUpperCase();
                const hits = builders
                  .filter((b) => b.toUpperCase().includes(q) && b.toUpperCase() !== q)
                  .slice(0, 8);
                return hits.length ? (
                  <div className="absolute z-10 mt-1 w-full border border-border bg-card shadow-sm">
                    {hits.map((b) => (
                      <button
                        key={b}
                        type="button"
                        className="block w-full truncate px-2 py-1 text-left text-[13px] hover:bg-row-tint"
                        onMouseDown={() => setBuilderName(b)}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                ) : null;
              })()
            : null}
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
        if (openZone !== i) {
          return (
            <section key={i} className="border border-border bg-card">
              <div className="flex items-center justify-between px-5 py-3">
                <div className="flex min-w-0 items-baseline gap-4">
                  <span className="label-caps shrink-0">Zone {i + 1}</span>
                  <span className="truncate text-[14px] font-semibold">{s.houseType || "—"}</span>
                  {s.partNbr ? (
                    <span className="truncate font-mono-data text-[13px] text-faint">{s.partNbr}</span>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="font-mono-data text-[14px] font-semibold">{usd(t.finalTotal)}</span>
                  <button
                    type="button"
                    className="text-[13px] text-faint underline-offset-4 hover:text-ink hover:underline"
                    onClick={() => setOpenZone(i)}
                  >
                    Edit Zone
                  </button>
                  {systems.length > 1 ? (
                    <button
                      type="button"
                      className="text-[13px] text-faint hover:text-destructive"
                      onClick={() => {
                        setSystems((prev) => prev.filter((_, j) => j !== i));
                        setOpenZone(null);
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              </div>
            </section>
          );
        }
        return (
          <section key={i} className="border-2 border-ink bg-card">
            <div className="flex items-baseline justify-between border-b border-divider px-5 py-3">
              <div className="flex items-baseline gap-4">
                <span className="label-caps">Zone {i + 1} — walking</span>
                <span className="font-mono-data text-[14px] font-semibold">{usd(t.finalTotal)}</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="btn-glow bg-primary px-4 py-1 text-[13px] font-semibold text-primary-foreground"
                  onClick={() => setOpenZone(null)}
                >
                  Save Zone
                </button>
                {systems.length > 1 ? (
                  <button
                    type="button"
                    className="text-[13px] text-faint hover:text-destructive"
                    onClick={() => {
                      setSystems((prev) => prev.filter((_, j) => j !== i));
                      setOpenZone(null);
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-x-10 gap-y-5 px-5 py-5 lg:grid-cols-[1fr_320px]">
              {/* ————— left: what's in the system ————— */}
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label-caps">Zone name / house type</label>
                    <input className={inputCls} value={s.houseType} onChange={(e) => patch(i, { houseType: e.target.value })} placeholder="HADLEY Z-1 90+" />
                  </div>
                  <div>
                    <label className="label-caps">Equipment</label>
                    <input
                      className={`${inputCls} font-mono-data`}
                      value={s.partNbr || s.partQuery}
                      onChange={(e) => patch(i, { partQuery: e.target.value, partNbr: "" })}
                      placeholder="Search part # or description…"
                    />
                    {matches.length && !s.partNbr ? (
                      <div className="absolute z-10 mt-1 max-h-64 overflow-auto border border-border bg-card shadow-sm">
                        {matches.map((m) => (
                          <button
                            key={m.part_nbr}
                            type="button"
                            className="flex w-full items-baseline gap-3 px-2 py-1 text-left text-[13px] hover:bg-row-tint"
                            onClick={() => patch(i, { partNbr: m.part_nbr, partQuery: "" })}
                          >
                            <span className="font-mono-data font-semibold">{m.part_nbr}</span>
                            <span className="min-w-0 flex-1 truncate text-faint">{m.description}</span>
                            <span className="font-mono-data">{m.cost === null ? "—" : usd(m.cost)}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {part ? (
                      <div className="mt-1 flex items-center gap-2 text-[13px] text-faint">
                        <span className="min-w-0 truncate">{part.description || "bundle"}</span>
                        <span className="label-caps ml-auto shrink-0">cost</span>
                        <input
                          className="w-24 shrink-0 border border-input bg-card px-1 py-0.5 text-right font-mono-data text-[13px]"
                          value={s.partCostOverride}
                          onChange={(e) => patch(i, { partCostOverride: e.target.value })}
                          placeholder={bookPart === null ? "0.00" : bookPart.toFixed(2)}
                          inputMode="decimal"
                        />
                        {maybe(s.partCostOverride) != null && maybe(s.partCostOverride) !== bookPart ? (
                          <span className="chip chip-warn shrink-0">override</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                  <div className="flex items-baseline justify-between border-b border-divider pb-1">
                    <span className="label-caps">Kit items</span>
                    {s.kitLines.some((k) => !k.picking) ? (
                      <span className="label-caps">qty · unit $ · total</span>
                    ) : null}
                  </div>

                  {s.kitLines.map((k, ki) => {
                    if (k.picking) {
                      const q = (k.query ?? "").trim().toUpperCase();
                      const found = q.length >= 1
                        ? kits
                            .filter(
                              (it) =>
                                it.label.toUpperCase().includes(q) ||
                                it.category.toUpperCase().includes(q) ||
                                it.code.toUpperCase().includes(q),
                            )
                            .slice(0, 10)
                        : [];
                      return (
                        <div key={ki} className="relative mt-1.5">
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              className="min-w-0 flex-1 border border-ink bg-card px-2 py-1 text-[13px]"
                              value={k.query ?? ""}
                              onChange={(e) => patchKit(i, ki, { query: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") dropKit(i, ki);
                                if (e.key === "Enter" && found.length) {
                                  e.preventDefault();
                                  patchKit(i, ki, { id: String(found[0].id), label: "", picking: false, query: "" });
                                }
                              }}
                              placeholder="Type to search the book — Enter picks the top match…"
                            />
                            <button type="button" className="text-[13px] text-faint hover:text-destructive" onClick={() => dropKit(i, ki)}>
                              ×
                            </button>
                          </div>
                          {(found.length || q.length >= 2) ? (
                            <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto border border-border bg-card shadow-sm">
                              {found.map((it) => (
                                <button
                                  key={it.id}
                                  type="button"
                                  className="flex w-full items-baseline gap-2 px-2 py-1 text-left text-[13px] hover:bg-row-tint"
                                  onClick={() => patchKit(i, ki, { id: String(it.id), label: "", picking: false, query: "" })}
                                >
                                  <span className="label-caps shrink-0">{it.category}</span>
                                  <span className="min-w-0 flex-1 truncate">{it.label || it.code}</span>
                                  <span className="font-mono-data shrink-0">{it.price === null ? "—" : usd(it.price)}</span>
                                </button>
                              ))}
                              {q.length >= 2 ? (
                                <button
                                  type="button"
                                  className="flex w-full items-baseline gap-2 border-t border-divider px-2 py-1 text-left text-[13px] hover:bg-row-tint"
                                  onClick={() => patchKit(i, ki, { id: "", label: k.query ?? "", picking: false, query: "" })}
                                >
                                  <span className="chip chip-warn shrink-0">custom</span>
                                  <span className="min-w-0 flex-1 truncate">Add “{k.query}” as a custom item</span>
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    }
                    const item = kitIndex.get(k.id);
                    const isCustom = k.id === "";
                    const book = item?.price ?? null;
                    const used = maybe(k.unitPrice) ?? book ?? 0;
                    const overridden = maybe(k.unitPrice) != null && maybe(k.unitPrice) !== book;
                    return (
                      <div key={ki} className="mt-1.5 flex items-center gap-2">
                        {isCustom ? (
                          <span className="flex min-w-0 flex-1 items-baseline gap-2">
                            <span className="chip chip-warn shrink-0">custom</span>
                            <input
                              className="min-w-0 flex-1 border border-input bg-card px-1 py-1 text-[13px]"
                              value={k.label}
                              onChange={(e) => patchKit(i, ki, { label: e.target.value })}
                            />
                          </span>
                        ) : (
                          <span className="flex min-w-0 flex-1 items-baseline gap-2 text-[13px]">
                            <span className="label-caps shrink-0">{item?.category}</span>
                            <span className="min-w-0 truncate">{item?.label || item?.code}</span>
                          </span>
                        )}
                        <input
                          className="w-12 shrink-0 border border-input bg-card px-1 py-1 text-right font-mono-data text-[13px]"
                          value={k.qty}
                          onChange={(e) => patchKit(i, ki, { qty: e.target.value })}
                          inputMode="numeric"
                        />
                        <input
                          className={`w-20 shrink-0 border px-1 py-1 text-right font-mono-data text-[13px] ${overridden || isCustom ? "border-warn-line bg-warn-bg" : "border-input bg-card"}`}
                          value={k.unitPrice}
                          onChange={(e) => patchKit(i, ki, { unitPrice: e.target.value })}
                          placeholder={book === null ? "0.00" : book.toFixed(2)}
                          inputMode="decimal"
                        />
                        <span className="w-20 shrink-0 text-right font-mono-data text-[13px]">{usd(n(k.qty) * used)}</span>
                        <button type="button" className="shrink-0 text-[13px] text-faint hover:text-destructive" onClick={() => dropKit(i, ki)}>
                          ×
                        </button>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    className="mt-2 text-[13px] font-semibold text-faint hover:text-ink"
                    onClick={() => patch(i, { kitLines: [...s.kitLines, { id: "", label: "", qty: "1", unitPrice: "", picking: true, query: "" }] })}
                  >
                    + Add item — search the book or type your own
                  </button>
                </div>

                <div>
                  <div className="label-caps border-b border-divider pb-1">The walk — every box, type quantities</div>
                  {walkCats.map(([cat, items]) => {
                    const picked = items.reduce((sum, it) => {
                      const line = s.kitLines.find((k) => k.id === String(it.id));
                      return sum + (line ? n(line.qty) : 0);
                    }, 0);
                    return (
                      <details key={cat} className="border-b border-line-faint">
                        <summary className="flex cursor-pointer select-none items-baseline justify-between py-2 text-[14px]">
                          <span className="font-semibold">{cat}</span>
                          <span className="font-mono-data text-[13px] text-faint">
                            {picked > 0 ? `${picked} picked` : `${items.length} items`}
                          </span>
                        </summary>
                        <table className="mb-2 w-full text-[13px]">
                          <tbody>
                            {items.map((it) => {
                              const ki = s.kitLines.findIndex((k) => k.id === String(it.id));
                              const line = ki >= 0 ? s.kitLines[ki] : undefined;
                              return (
                                <tr key={it.id} className="border-b border-line-faint last:border-0 hover:bg-row-tint">
                                  <td className="max-w-96 truncate py-1 pr-3">{it.label || it.code}</td>
                                  <td className="w-20 py-1 pr-2 text-right font-mono-data text-faint">
                                    {it.price === null ? "—" : it.price.toFixed(2)}
                                  </td>
                                  <td className="w-14 py-1">
                                    <input
                                      className="w-14 border border-input bg-card px-1 py-0.5 text-right font-mono-data text-[13px] focus:border-ink"
                                      value={line?.qty ?? ""}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        if (ki >= 0) patchKit(i, ki, { qty: v });
                                        else if (v.trim() !== "")
                                          patch(i, {
                                            kitLines: [...s.kitLines, { id: String(it.id), label: "", qty: v, unitPrice: "" }],
                                          });
                                      }}
                                      inputMode="numeric"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </details>
                    );
                  })}
                </div>
              </div>

              {/* ————— right: labor, markup, totals ————— */}
              <div className="space-y-4 border-t border-divider pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-caps">Labor hrs</label>
                    <input className={numCls} value={s.laborHours} onChange={(e) => patch(i, { laborHours: e.target.value })} inputMode="decimal" />
                  </div>
                  <div>
                    <label className="label-caps">Rate $/hr</label>
                    <input className={numCls} value={s.laborRate} onChange={(e) => patch(i, { laborRate: e.target.value })} inputMode="decimal" />
                  </div>
                  <div>
                    <label className="label-caps">Factor</label>
                    <input className={numCls} value={s.factor} onChange={(e) => patch(i, { factor: e.target.value })} inputMode="decimal" />
                  </div>
                  <div>
                    <label className="label-caps">Tax % or frac</label>
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
                  <div className="col-span-2">
                    <label className="label-caps">Commission $</label>
                    <input className={numCls} value={s.commission} onChange={(e) => patch(i, { commission: e.target.value })} inputMode="decimal" />
                  </div>
                </div>

                <table className="w-full text-[14px]">
                  <tbody>
                    <TR k={`Labor (${s.laborHours || 0} × $${s.laborRate || 0})`} v={usd(n(s.laborHours) * n(s.laborRate))} />
                    <TR k="Kit total" v={usd(t.kitTotal)} />
                    <TR k="Total cost" v={usd(t.totCost)} />
                    <TR k={`Selling (cost ÷ ${s.factor || "?"})`} v={usd(t.totSelling)} />
                    <TR k="Profit" v={usd(t.factorTot)} />
                    <TR k="Sales tax" v={usd(t.salesTax)} />
                    <tr className="border-t border-border">
                      <td className="py-1.5 font-semibold">System total</td>
                      <td className="py-1.5 text-right font-mono-data text-[17px] font-semibold">{usd(t.finalTotal)}</td>
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
          className="text-[14px] text-faint hover:text-ink"
          onClick={() => {
            setSystems((prev) => [...prev, blankSystem()]);
            setOpenZone(systems.length);
          }}
        >
          + Add Zone
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
      {error ? <p className="text-[14px] text-destructive">{error}</p> : null}
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
