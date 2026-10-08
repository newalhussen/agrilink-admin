import { Lock, Phone } from "lucide-react";
import * as React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Logo } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { errorMessage } from "@/lib/api";

export function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  if (status === "authenticated") return <Navigate to={(location.state as { from?: string } | null)?.from ?? "/"} replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(phone.trim(), password);
      navigate((location.state as { from?: string } | null)?.from ?? "/", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-sage-800 p-12 text-sand-100 lg:flex">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="font-heading text-2xl">AgriLink</span>
          <span className="rounded-full bg-sage-700 px-3 py-1 text-xs">Operations</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl leading-[1.05]">Keep the corridor moving.</h1>
          <p className="mt-5 text-lg text-sage-200">
            Verify farmers, watch every delivery, settle disputes fairly and release money on time, from one calm place.
          </p>
        </div>
        <span aria-hidden className="absolute -bottom-24 -right-24 size-[420px] rounded-full bg-sage-700/70" />
        <span aria-hidden className="absolute -bottom-6 right-40 size-40 rounded-full bg-primary/80" />
        <p className="relative z-10 text-sm text-sage-300">Oromia → Addis Ababa pilot corridor</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-5" aria-label="Sign in">
          <div className="flex items-center gap-2.5 lg:hidden">
            <Logo />
            <span className="font-heading text-xl">AgriLink Ops</span>
          </div>
          <div>
            <h2>Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">Operations staff only. Use the phone number and password of your admin account.</p>
          </div>
          <Field label="Phone number" htmlFor="phone">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="phone" inputMode="tel" autoComplete="username" placeholder="0900 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" required />
            </div>
          </Field>
          <Field label="Password" htmlFor="password">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
            </div>
          </Field>
          {error ? <p role="alert" className="rounded-2xl bg-terra-100 px-4 py-3 text-sm font-semibold text-terra-800">{error}</p> : null}
          <Button type="submit" size="lg" disabled={busy || !phone || !password}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
      </section>
    </div>
  );
}
