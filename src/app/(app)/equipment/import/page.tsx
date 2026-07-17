import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { MANUFACTURERS } from "@/lib/equipmentXls";

export const dynamic = "force-dynamic";

export default async function EquipmentImportPage() {
  const user = await requireUser();
  const pending = db
    .prepare("SELECT id, manufacturer, filename, username, created_at FROM pending_imports ORDER BY id DESC")
    .all() as { id: number; manufacturer: string; filename: string; username: string; created_at: string }[];

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <Link href="/equipment" className="text-[12px] text-faint hover:text-ink">
          ← Equipment
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Upload manufacturer pricing</h1>
        <p className="mt-1 text-[13px] text-faint">
          The brand&apos;s current XLS (with the COMPONT PRICING sheet). You&apos;ll preview every change
          before anything is applied.
        </p>
      </div>

      {user.role === "admin" ? (
        <form action="/api/equipment/import" method="post" encType="multipart/form-data" className="space-y-4 border-y border-divider py-6">
          <div>
            <label className="label-caps" htmlFor="manufacturer">
              Manufacturer
            </label>
            <select id="manufacturer" name="manufacturer" className="mt-1 w-full border border-input bg-card px-3 py-2 text-sm">
              {MANUFACTURERS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-caps" htmlFor="file">
              Price file (.xls)
            </label>
            <input id="file" name="file" type="file" accept=".xls,.xlsx" className="mt-1 w-full text-[13px]" required />
          </div>
          <button type="submit" className="btn-glow bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">
            Parse &amp; preview
          </button>
        </form>
      ) : (
        <p className="text-[13px] text-faint">Uploads are admin-only.</p>
      )}

      {pending.length ? (
        <section>
          <h2 className="label-caps">Awaiting review</h2>
          <table className="mt-2 w-full text-[13px]">
            <tbody>
              {pending.map((p) => (
                <tr key={p.id} className="border-b border-line-faint last:border-0">
                  <td className="py-1.5 pr-4">
                    <Link href={`/equipment/import/${p.id}`} className="font-semibold hover:underline">
                      {p.manufacturer}
                    </Link>
                  </td>
                  <td className="py-1.5 pr-4 font-mono-data text-faint">{p.filename}</td>
                  <td className="py-1.5 text-right text-faint">
                    {p.username} · {p.created_at.slice(0, 16)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
