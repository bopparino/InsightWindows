import { requireApiAdmin } from "@/lib/auth";
import { COMPANY_KEYS, setSetting } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = await requireApiAdmin();
  if (me instanceof Response) return me;
  const form = await req.formData();
  for (const key of COMPANY_KEYS) {
    const v = form.get(key);
    if (v !== null) setSetting(key, String(v));
  }
  return new Response(null, { status: 303, headers: { Location: "/admin" } });
}
