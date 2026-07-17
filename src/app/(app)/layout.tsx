import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="border-b border-divider bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-baseline gap-8">
            <Link href="/" className="text-[15px] font-bold tracking-tight text-ink">
              METCALFE<span className="ml-2 font-normal text-faint">Bid System</span>
            </Link>
            <nav className="flex items-baseline gap-5 text-[13px]">
              <Link href="/" className="text-ink hover:underline underline-offset-4">
                Overview
              </Link>
              <Link href="/plans" className="text-ink hover:underline underline-offset-4">
                Plans
              </Link>
              <Link href="/pricing" className="text-ink hover:underline underline-offset-4">
                Price Book
              </Link>
              <Link href="/equipment" className="text-ink hover:underline underline-offset-4">
                Equipment
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="label-caps">{user.displayName}</span>
            <form action="/api/logout" method="post">
              <button className="text-[12px] text-faint hover:text-ink" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
