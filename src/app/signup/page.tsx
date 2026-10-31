"use client";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { KartUploader } from "@/components/KartUploader";
import { GameProfileImport } from "@/components/GameProfileImport";
import { Button, Field, LinkButton, Segmented } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { getSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Step = "account" | "kart" | "confirm";

export default function SignupPage() {
  const router = useRouter();
  const toast = useToast();
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>("account");
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ username: "", game_id: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kartMode, setKartMode] = useState<"profile" | "kart">("profile");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const username = form.username.trim();
    if (!/^[A-Za-z0-9_.\- ]{2,24}$/.test(username)) return setError("Username: 2–24 characters (letters, numbers, space, _ . -).");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    setLoading(true);
    const sb = getSupabase();
    const { data: free, error: rpcErr } = await sb.rpc("username_available", { name: username });
    if (rpcErr) {
      setLoading(false);
      return setError(rpcErr.message);
    }
    if (!free) {
      setLoading(false);
      return setError("That username is taken.");
    }
    const { data, error } = await sb.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { username, game_id: form.game_id.trim() }, emailRedirectTo: `${location.origin}/settings` },
    });
    setLoading(false);
    if (error) return setError(error.message);
    if (data.session && data.user) {
      setUserId(data.user.id);
      await refreshProfile();
      setStep("kart");
    } else {
      setStep("confirm");
    }
  };

  const steps = ["Account", "Kart"];
  const idx = step === "account" ? 0 : 1;

  return (
    <AuthShell
      title={step === "kart" ? "Show off your kart" : step === "confirm" ? "Check your inbox" : "Join the grid"}
      subtitle={step === "kart" ? "Upload your in-game profile screen — AI grabs your stats, SKID and kart. You can update it later in Settings." : step === "account" ? "Create your racer profile." : undefined}
      footer={step === "account" ? <>Already racing? <Link href="/login" className="font-semibold text-hot hover:underline">Log in</Link></> : null}
    >
      {step !== "confirm" && (
        <div className="mb-6 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div className={cn("grid size-7 place-items-center rounded-full text-xs font-bold transition-colors", i <= idx ? "bg-hot text-white" : "bg-white/[0.06] text-muted")}>
                {i < idx ? <CheckCircle2 className="size-4" /> : i + 1}
              </div>
              <span className={cn("text-sm", i <= idx ? "text-ink" : "text-muted")}>{s}</span>
              {i < steps.length - 1 && (
                <div className="h-px flex-1 overflow-hidden bg-line">
                  <motion.div className="h-full bg-hot" initial={{ width: 0 }} animate={{ width: idx > i ? "100%" : 0 }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === "account" && (
          <motion.form key="a" onSubmit={submit} className="space-y-4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Username" hint="Shown on the leaderboard">
                <input className="input" required value={form.username} onChange={set("username")} placeholder="DriftKing" maxLength={24} />
              </Field>
              <Field label="Smash Karts name / ID" hint="As it appears in game">
                <input className="input" value={form.game_id} onChange={set("game_id")} placeholder="drift_king_99" maxLength={40} />
              </Field>
            </div>
            <Field label="Email">
              <input className="input" type="email" required autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
            </Field>
            <Field label="Password" hint="At least 6 characters">
              <input className="input" type="password" required autoComplete="new-password" value={form.password} onChange={set("password")} placeholder="••••••••" />
            </Field>
            {error && <p className="text-sm text-hot">{error}</p>}
            <Button type="submit" loading={loading} className="w-full" size="lg">Create account</Button>
          </motion.form>
        )}

        {step === "kart" && userId && (
          <motion.div key="k" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <Segmented
              id="kmode"
              value={kartMode}
              onChange={setKartMode}
              options={[
                { value: "profile", label: "Profile screenshot" },
                { value: "kart", label: "Kart only" },
              ]}
            />
            {kartMode === "profile" ? (
              <GameProfileImport
                userId={userId}
                currentGameId={form.game_id.trim() || null}
                onSaved={async () => {
                  await refreshProfile();
                  toast("Profile synced — welcome to the grid!");
                  router.push("/");
                }}
              />
            ) : (
              <KartUploader
                userId={userId}
                onSaved={async () => {
                  await refreshProfile();
                  toast("Kart saved — welcome to the grid!");
                  router.push("/");
                }}
              />
            )}
            <button type="button" onClick={() => router.push("/")} className="w-full cursor-pointer text-center text-sm text-muted hover:text-ink">
              Skip for now
            </button>
          </motion.div>
        )}

        {step === "confirm" && (
          <motion.div key="c" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <MailCheck className="mx-auto size-12 text-lime" />
            <p className="mt-4 text-muted">
              We sent a confirmation link to <span className="text-ink">{form.email}</span>. Click it, then log in and add your kart from Settings.
            </p>
            <LinkButton href="/login" className="mt-6">Go to login</LinkButton>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
