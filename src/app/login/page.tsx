"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { Button, Field } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { getSupabase } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return setError(error.message);
    toast("Welcome back!");
    const next = params.get("next");
    router.push(next && next.startsWith("/") ? next : "/");
    router.refresh();
  };

  const forgot = async () => {
    if (!email.trim()) return setError("Enter your email first, then click “Forgot password”.");
    const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/settings` });
    if (error) setError(error.message);
    else toast("Password reset email sent.", "info");
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to host tournaments and track your kills." footer={<>New here? <Link href="/signup" className="font-semibold text-hot hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        {error && <p className="text-sm text-hot">{error}</p>}
        <Button type="submit" loading={loading} className="w-full" size="lg">Log in</Button>
        <button type="button" onClick={forgot} className="w-full cursor-pointer text-center text-sm text-muted hover:text-ink">Forgot password?</button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
