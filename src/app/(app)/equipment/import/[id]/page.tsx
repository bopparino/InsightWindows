import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { moneyExact } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ImportPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const row = db.prepare("SELECT * FROM pending_imports WHERE id = ?").get(Number(id)) as
    | { id: number; manufacturer: string; filename: string; username: string; payload: string }
    | undefined;
  if (!row) notFound();

  const p = JSON.parse(row.payload) as {
    updates: { partNbr: string; description: string; oldCost: number | null; newCost: number; prevManufacturer: string }[];
    added: { partNbr: string; description: string; newCost: number }[];
    unchanged: string[];
    totalParsed: number;
  };

  return (
    <div className="space-y-8">
      <div>
        <Link href="/equipment/import" className="text-[13px] text-faint hover:text-ink">
          ← Uploads
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {row.manufacturer} — <span className="font-mono-data text-xl">{row.filename}</span>
        </h1>
        <p className="mt-1 text-[14px] text-faint">
          {p.totalParsed} parts parsed · {p.updates.length} price changes · {p.added.length} new ·{" "}
          {p.unchanged.length} unchanged. Nothing is applied until you approve.
        </p>
      </div>

      {user.role === "admin" ? (
        <form action="/api/equipment/import/apply" method="post" className="flex gap-3 border-y border-divider py-4">
          <input type="hidden" name="id" value={row.id} />
          <button
            name="action"
            value="apply"
            className="btn-glow bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
          >
            Apply {p.updates.length + p.added.length} changes
          </button>
          <button name="action" value="discard" className="border border-input px-6 py-2 text-sm text-muted-foreground hover:border-ink hover:text-ink">
            Discard
          </button>
        </form>
      ) : null}

      {p.updates.length ? (
        <section>
          <h2 className="label-caps">Price changes</h2>
          <table className="mt-2 w-full text-[14px]">
            <tbody>
              {p.updates.map((u) => (
                <tr key={u.partNbr} className="border-b border-line-faint last:border-0">
                  <td className="w-52 py-1.5 pr-4 font-mono-data font-semibold">{u.partNbr}</td>
                  <td className="max-w-80 truncate py-1.5 pr-4 text-muted-foreground">{u.description}</td>
                  <td className="w-44 py-1.5 text-right font-mono-data">
                    {u.oldCost === null ? "—" : moneyExact(u.oldCost)} → <span className="font-semibold">{moneyExact(u.newCost)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {p.added.length ? (
        <section>
          <h2 className="label-caps">New parts</h2>
          <table className="mt-2 w-full text-[14px]">
            <tbody>
              {p.added.map((a) => (
                <tr key={a.partNbr} className="border-b border-line-faint last:border-0">
                  <td className="w-52 py-1.5 pr-4 font-mono-data font-semibold">{a.partNbr}</td>
                  <td className="max-w-80 truncate py-1.5 pr-4 text-muted-foreground">{a.description}</td>
                  <td className="w-28 py-1.5 text-right font-mono-data">{moneyExact(a.newCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
