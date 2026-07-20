import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { COMPANY_KEYS, getSettings } from "@/lib/settings";
import { money, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await requireUser();
  if (me.role !== "admin") redirect("/");
  const s = getSettings(COMPANY_KEYS);

  const trash = db
    .prepare("SELECT id, plan_nbr, builder_name, total, deleted_at FROM plans WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
    .all() as { id: number; plan_nbr: string; builder_name: string; total: number; deleted_at: string }[];

  const inputCls = "w-full border border-input bg-card px-2 py-1.5 text-[14px]";

  return (
    <div className="max-w-3xl space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="mt-1 text-[14px] text-faint">Backups, company info, contract terms, and the trash.</p>
      </div>

      <section>
        <h2 className="label-caps">Database backup</h2>
        <div className="mt-3 border-y border-divider py-5">
          <a
            href="/api/admin/backup"
            className="btn-glow bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
          >
            Download backup now
          </a>
          <p className="mt-3 text-[14px] text-muted-foreground">
            One click makes a live snapshot, keeps the last 10 on the server volume
            (<span className="font-mono-data">/data/backups/</span>), and downloads a copy to your computer.
            Do this before big changes and keep the downloads somewhere safe.
          </p>
          <details className="mt-3">
            <summary className="label-caps cursor-pointer select-none">How to restore</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px] text-muted-foreground">
              <li>In Railway, open the service and stop it (Settings → Danger → Remove deployment, or scale to 0).</li>
              <li>
                Attach a shell to the volume: <span className="font-mono-data">railway ssh</span>, then copy the chosen
                snapshot over the live file:{" "}
                <span className="font-mono-data">cp /data/backups/bids-YYYY-MM-DD-….db /data/bids.db</span>
              </li>
              <li>Redeploy the service. The app opens the restored file as-is.</li>
              <li>
                Restoring a file downloaded to your computer instead: get it onto the volume with{" "}
                <span className="font-mono-data">railway ssh</span> +{" "}
                <span className="font-mono-data">base64</span> paste, or ask Claude to walk the transfer.
              </li>
            </ol>
          </details>
        </div>
      </section>

      <section>
        <h2 className="label-caps">Company info — prints on quotes and contracts</h2>
        <form action="/api/admin/settings" method="post" className="mt-3 space-y-3 border-y border-divider py-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label-caps">Company name</label>
              <input name="company_name" defaultValue={s.company_name} className={inputCls} />
            </div>
            <div>
              <label className="label-caps">Address</label>
              <input name="company_address1" defaultValue={s.company_address1} className={inputCls} />
            </div>
            <div>
              <label className="label-caps">City, State ZIP</label>
              <input name="company_address2" defaultValue={s.company_address2} className={inputCls} />
            </div>
            <div>
              <label className="label-caps">Phone</label>
              <input name="company_phone" defaultValue={s.company_phone} className={inputCls} />
            </div>
            <div>
              <label className="label-caps">Fax</label>
              <input name="company_fax" defaultValue={s.company_fax} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="label-caps">License #s (shown under the letterhead)</label>
              <input name="company_license" defaultValue={s.company_license} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="label-caps">Quote terms (footer line)</label>
              <textarea name="quote_terms" defaultValue={s.quote_terms} rows={2} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="label-caps">Contract exclusions — one per line (&quot;Not Included&quot;)</label>
              <textarea name="contract_exclusions" defaultValue={s.contract_exclusions} rows={8} className={`${inputCls} font-mono-data text-[13px]`} />
            </div>
          </div>
          <button className="btn-glow bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground" type="submit">
            Save company info
          </button>
        </form>
      </section>

      <section>
        <h2 className="label-caps">Trash — {trash.length} deleted plans</h2>
        {trash.length ? (
          <table className="mt-2 w-full text-[14px]">
            <tbody>
              {trash.map((p) => (
                <tr key={p.id} className="border-b border-line-faint last:border-0">
                  <td className="py-2 pr-4 font-mono-data font-semibold">{p.plan_nbr}</td>
                  <td className="py-2 pr-4">{p.builder_name}</td>
                  <td className="py-2 pr-4 text-right font-mono-data">{money(p.total)}</td>
                  <td className="py-2 pr-4 text-right font-mono-data text-faint">{shortDate(p.deleted_at)}</td>
                  <td className="py-2 text-right">
                    <form action={`/api/plans/${p.id}/delete`} method="post" className="inline">
                      <button name="action" value="restore" className="text-[13px] text-faint hover:text-ink">
                        Restore
                      </button>
                      <button
                        name="action"
                        value="purge"
                        className="ml-4 text-[13px] text-destructive hover:underline"
                      >
                        Delete forever
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-[14px] text-faint">Empty.</p>
        )}
      </section>

      <p className="text-[14px] text-faint">
        Looking for users? <Link href="/users" className="underline underline-offset-4">User management</Link> ·
        Options book: <Link href="/options" className="underline underline-offset-4">Options &amp; Standards</Link>
      </p>
    </div>
  );
}
