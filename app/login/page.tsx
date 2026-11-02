import { Logo } from '@/components/logo';
import { signIn } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = '/', error } = await searchParams;

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div aria-hidden className="animate-float pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[var(--accent)] opacity-15 blur-3xl" />
      <div aria-hidden className="animate-float pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-[#8965e5] opacity-15 blur-3xl" style={{ animationDelay: '1.5s' }} />

      <div className="card relative w-full max-w-[420px] p-8">
        <div className="mb-7 flex items-center gap-3">
          <span className="shrink-0">
            <Logo size={42} />
          </span>
          <div>
            <h1 className="text-lg leading-tight font-extrabold tracking-tight">QA Test Automation and Monitoring</h1>
            <p className="text-sm font-semibold text-[var(--muted)]">Playwright runs, results and schedules</p>
          </div>
        </div>

        <h2 className="text-[22px] font-extrabold tracking-tight">Welcome back</h2>
        <p className="mb-6 text-sm text-ink-2">Sign in with your dashboard account.</p>

        {error && <p className="mb-4 rounded-2xl bg-[var(--critical-soft)] px-4 py-3 text-sm font-semibold text-critical-text">{error}</p>}

        <form className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="identifier">
              Username or email
            </label>
            <input id="identifier" name="identifier" type="text" required autoComplete="username" autoCapitalize="none" spellCheck={false} className="input w-full" />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="input w-full" />
          </div>
          <button formAction={signIn} className="btn btn-primary w-full justify-center !py-3">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
