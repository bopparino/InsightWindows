import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { money, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const me = await requireUser();
  const mineOnly = me.role !== "admin";
  const own = mineOnly ? "AND created_by = $me" : "";
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const rows = (
    query
      ? db
          .prepare(
            `SELECT id, plan_nbr, builder_name, proj_name, house_types, total, lines_count, edited_at, contracted_at, is_master, status, due_date
             FROM plans
             WHERE deleted_at IS NULL AND (plan_nbr LIKE $q OR builder_name LIKE $q OR proj_name LIKE $q OR house_types LIKE $q) ${own}
             ORDER BY edited_at DESC LIMIT 200`,
          )
          .all(mineOnly ? { q: `%${query}%`, me: me.id } : { q: `%${query}%` })
      : db
          .prepare(
            `SELECT id, plan_nbr, builder_name, proj_name, house_types, total, lines_count, edited_at, contracted_at, is_master, status, due_date
             FROM plans WHERE deleted_at IS NULL ${own} ORDER BY edited_at DESC LIMIT 200`,
          )
          .all(mineOnly ? { me: me.id } : {})
  ) as {
    id: number;
    plan_nbr: string;
    builder_name: string;
    proj_name: string;
    house_types: string;
    total: number;
    lines_count: number;
    edited_at: string;
    contracted_at: string | null;
    is_master: number;
    status: string;
    due_date: string | null;
  }[];

  const count = mineOnly
    ? (db.prepare("SELECT COUNT(*) AS n FROM plans WHERE deleted_at IS NULL AND created_by = ?").get(me.id) as { n: number }).n
    : (db.prepare("SELECT COUNT(*) AS n FROM plans WHERE deleted_at IS NULL").get() as { n: number }).n;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plans</h1>
          <p className="mt-1 text-[14px] text-faint">{mineOnly ? `${count} of your plans` : `${count} plans since 2025`}</p>
        </div>
        <div className="flex items-center gap-3">
          <form method="get" className="w-72">
            <input
              name="q"
              defaultValue={query}
              placeholder="Search plan #, builder, project, house…"
              className="w-full border border-input bg-card px-3 py-1.5 text-[14px]"
            />
          </form>
          <Link
            href="/plans/new"
            className="btn-glow bg-primary px-4 py-1.5 text-[14px] font-semibold text-primary-foreground"
          >
            + New Plan
          </Link>
        </div>
      </div>

      <table className="mt-6 w-full text-[14px]">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="label-caps py-2 pr-4 font-semibold">Plan #</th>
            <th className="label-caps py-2 pr-4 font-semibold">Builder</th>
            <th className="label-caps py-2 pr-4 font-semibold">Project</th>
            <th className="label-caps py-2 pr-4 font-semibold">House</th>
            <th className="label-caps py-2 pr-4 text-right font-semibold">Systems</th>
            <th className="label-caps py-2 pr-4 text-right font-semibold">Total</th>
            <th className="label-caps py-2 pr-4 text-right font-semibold">Due</th>
            <th className="label-caps py-2 text-right font-semibold">Edited</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b border-line-faint hover:bg-row-tint">
              <td className="py-2 pr-4">
                <Link href={`/plans/${p.id}`} className="font-mono-data font-semibold hover:underline">
                  {p.plan_nbr}
                </Link>
                {p.is_master ? <span className="chip chip-muted ml-2">Master</span> : null}
                {p.status ? (
                  <span
                    className={`chip ml-2 ${p.status === "contracted" ? "chip-ok" : p.status === "lost" ? "chip-danger" : p.status === "proposed" ? "chip-warn" : "chip-muted"}`}
                  >
                    {p.status}
                  </span>
                ) : p.contracted_at && p.contracted_at >= "2025-01-01" ? (
                  <span className="chip chip-ok ml-2">Contracted</span>
                ) : null}
              </td>
              <td className="py-2 pr-4">{p.builder_name || "—"}</td>
              <td className="py-2 pr-4 text-muted-foreground">{p.proj_name || "—"}</td>
              <td className="max-w-56 truncate py-2 pr-4 text-muted-foreground">{p.house_types || "—"}</td>
              <td className="py-2 pr-4 text-right font-mono-data">{p.lines_count}</td>
              <td className="py-2 pr-4 text-right font-mono-data">{money(p.total)}</td>
              <td className="py-2 pr-4 text-right font-mono-data">{shortDate(p.due_date)}</td>
              <td className="py-2 text-right font-mono-data text-faint">{shortDate(p.edited_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="mt-8 text-[14px] text-faint">No plans match “{query}”.</p>
      ) : null}
    </div>
  );
}
