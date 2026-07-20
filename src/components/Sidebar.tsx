"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const WORKSPACE = [
  { href: "/", label: "Overview" },
  { href: "/plans", label: "Plans" },
  { href: "/pricing", label: "Price Book" },
  { href: "/equipment", label: "Equipment" },
];
const ADMIN = [
  { href: "/equipment/import", label: "Pricing uploads" },
  { href: "/users", label: "Users" },
];

export default function Sidebar({ displayName, isAdmin }: { displayName: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || (href !== "/equipment" && pathname.startsWith(href + "/")) || (href === "/equipment" && pathname.startsWith("/equipment") && !pathname.startsWith("/equipment/import"));

  const item = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`block border-l-2 px-4 py-2 text-[16px] ${
        active(href)
          ? "border-ink bg-fill font-semibold text-ink"
          : "border-transparent text-muted-foreground hover:bg-row-tint hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-divider bg-card">
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-10 w-10 items-center justify-center bg-ink font-mono-data text-[14px] font-bold text-primary-foreground">
          MET
        </div>
        <div className="leading-tight">
          <div className="text-[17px] font-bold tracking-tight">Bid System</div>
          <div className="label-caps">Metcalfe HVAC</div>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-6 overflow-y-auto">
        <div>
          <div className="label-caps px-4 pb-1.5">Workspace</div>
          {WORKSPACE.filter((l) => isAdmin || l.href === "/" || l.href === "/plans").map((l) =>
            item(l.href, l.label),
          )}
        </div>
        {isAdmin ? (
          <div>
            <div className="label-caps px-4 pb-1.5">Admin</div>
            {ADMIN.map((l) => item(l.href, l.label))}
          </div>
        ) : null}
      </nav>

      <div className="border-t border-divider px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold">{displayName}</span>
          <form action="/api/logout" method="post">
            <button className="text-[13px] text-faint hover:text-ink" type="submit">
              Sign out
            </button>
          </form>
        </div>
        <div className="label-caps mt-3">Bid System v0.2</div>
      </div>
    </aside>
  );
}
