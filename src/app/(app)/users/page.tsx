import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// User management (admin). Contact info here prints on quotes - the quote
// carries whoever prints it.

export default async function UsersPage() {
  const me = await requireUser();
  if (me.role !== "admin") redirect("/");

  const users = db
    .prepare("SELECT id, username, display_name, role, email, phone, last_login_at FROM users ORDER BY display_name")
    .all() as {
    id: number;
    username: string;
    display_name: string;
    role: string;
    email: string;
    phone: string;
    last_login_at: string | null;
  }[];

  const inputCls = "w-full border border-input bg-card px-2 py-1.5 text-[14px]";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-[14px] text-faint">
          Sales accounts see Plans and the Overview; Admin sees everything. Name, email, and phone print
          on the quotes that account generates.
        </p>
      </div>

      <section>
        <h2 className="label-caps">Accounts</h2>
        <table className="mt-2 w-full text-[14px]">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="label-caps py-2 pr-4 font-semibold">Name</th>
              <th className="label-caps py-2 pr-4 font-semibold">Username</th>
              <th className="label-caps py-2 pr-4 font-semibold">Email</th>
              <th className="label-caps py-2 pr-4 font-semibold">Phone</th>
              <th className="label-caps py-2 pr-4 font-semibold">Role</th>
              <th className="label-caps py-2 pr-4 text-right font-semibold">Last login</th>
              <th className="label-caps py-2 text-right font-semibold">Password</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line-faint align-top hover:bg-row-tint">
                <td className="py-2 pr-4 font-semibold">{u.display_name}</td>
                <td className="py-2 pr-4 font-mono-data">{u.username}</td>
                <td className="py-2 pr-4">
                  <form action={`/api/users/${u.id}`} method="post" className="flex gap-2">
                    <input name="email" defaultValue={u.email} placeholder="email" className="w-52 border border-transparent bg-transparent px-1 py-0.5 hover:border-input focus:border-ink" />
                </form>
                </td>
                <td className="py-2 pr-4">
                  <form action={`/api/users/${u.id}`} method="post">
                    <input name="phone" defaultValue={u.phone} placeholder="phone" className="w-36 border border-transparent bg-transparent px-1 py-0.5 hover:border-input focus:border-ink" />
                  </form>
                </td>
                <td className="py-2 pr-4">
                  <form action={`/api/users/${u.id}`} method="post" className="inline">
                    <select
                      name="role"
                      defaultValue={u.role}
                      className="border border-input bg-card px-1 py-0.5 text-[13px]"
                    >
                      <option value="user">Sales</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button className="ml-2 text-[13px] text-faint hover:text-ink" type="submit">
                      Save
                    </button>
                  </form>
                </td>
                <td className="py-2 pr-4 text-right font-mono-data text-faint">
                  {u.last_login_at ? u.last_login_at.slice(0, 10) : "never"}
                </td>
                <td className="py-2 text-right">
                  <form action={`/api/users/${u.id}`} method="post" className="flex justify-end gap-1">
                    <input
                      name="password"
                      type="password"
                      placeholder="new password"
                      minLength={6}
                      className="w-32 border border-input bg-card px-1 py-0.5 text-[13px]"
                    />
                    <button className="text-[13px] text-faint hover:text-ink" type="submit">
                      Reset
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[13px] text-faint">
          Email/phone save with the Save button on the row (or press return inside the field).
        </p>
      </section>

      <section className="max-w-lg">
        <h2 className="label-caps">New account</h2>
        <form action="/api/users" method="post" className="mt-3 space-y-3 border-y border-divider py-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-caps">Full name</label>
              <input name="displayName" className={inputCls} required />
            </div>
            <div>
              <label className="label-caps">Username</label>
              <input name="username" className={`${inputCls} font-mono-data`} required />
            </div>
            <div>
              <label className="label-caps">Password</label>
              <input name="password" type="password" className={inputCls} required minLength={6} />
            </div>
            <div>
              <label className="label-caps">Role</label>
              <select name="role" className={inputCls} defaultValue="user">
                <option value="user">Sales</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="label-caps">Email</label>
              <input name="email" type="email" className={inputCls} />
            </div>
            <div>
              <label className="label-caps">Phone</label>
              <input name="phone" className={inputCls} />
            </div>
          </div>
          <button className="btn-glow bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground" type="submit">
            Create account
          </button>
        </form>
      </section>
    </div>
  );
}
