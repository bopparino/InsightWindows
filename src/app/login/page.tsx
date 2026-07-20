export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm border border-border bg-card p-8">
        <h1 className="text-lg font-bold tracking-tight">METCALFE</h1>
        <p className="label-caps mt-1">Bid System</p>
        <form action="/api/login" method="post" className="mt-8 space-y-4">
          <div>
            <label className="label-caps" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              className="mt-1 w-full border border-input bg-card px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="label-caps" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full border border-input bg-card px-3 py-2 text-sm"
              required
            />
          </div>
          {err ? <p className="text-[13px] text-destructive">Wrong username or password.</p> : null}
          <button
            type="submit"
            className="btn-glow w-full bg-primary py-2 text-sm font-semibold text-primary-foreground"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
