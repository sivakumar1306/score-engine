"use client";
import { KeyRound, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { KartAvatar } from "@/components/KartAvatar";
import { KartUploader } from "@/components/KartUploader";
import { Button, Card, Field, PageHeader, Skeleton } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { getSupabase } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const [username, setUsername] = useState("");
  const [gameId, setGameId] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/settings");
  }, [loading, user, router]);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setGameId(profile.game_id ?? "");
    }
  }, [profile]);

  if (loading || !user || !profile) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = username.trim();
    if (!/^[A-Za-z0-9_.\- ]{2,24}$/.test(name)) return toast("Username: 2–24 characters (letters, numbers, space, _ . -).", "error");
    setSaving(true);
    const { error } = await getSupabase().from("profiles").update({ username: name, game_id: gameId.trim() || null }).eq("id", user.id);
    setSaving(false);
    if (error) return toast(error.code === "23505" ? "That username is taken." : error.message, "error");
    await refreshProfile();
    toast("Profile updated");
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast("Password must be at least 6 characters.", "error");
    setPwSaving(true);
    const { error } = await getSupabase().auth.updateUser({ password });
    setPwSaving(false);
    if (error) return toast(error.message, "error");
    setPassword("");
    toast("Password changed");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Settings" title="Your racer profile" />
      <div className="grid gap-5">
        <Card className="p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <h2 className="mb-5 font-display text-lg font-semibold">Kart</h2>
          <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
            <div className="checker grid aspect-square place-items-center rounded-2xl border border-line">
              <KartAvatar url={profile.kart_url} name={profile.username} size={140} glow="rgb(255 61 113 / 0.4)" />
            </div>
            <KartUploader compact userId={user.id} onSaved={async () => { await refreshProfile(); toast("Kart updated"); }} />
          </div>
        </Card>

        <Card className="p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-semibold"><User className="size-5 text-hot" /> Profile</h2>
          <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <Field label="Username"><input className="input" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={24} /></Field>
            <Field label="Smash Karts name / ID"><input className="input" value={gameId} onChange={(e) => setGameId(e.target.value)} maxLength={40} /></Field>
            <div className="sm:col-span-2 flex items-center justify-between">
              <span className="text-xs text-muted">{user.email}</span>
              <Button type="submit" loading={saving}>Save changes</Button>
            </div>
          </form>
        </Card>

        <Card className="p-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-semibold"><KeyRound className="size-5 text-amber" /> Password</h2>
          <form onSubmit={changePassword} className="flex flex-col gap-3 sm:flex-row">
            <input className="input" type="password" autoComplete="new-password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" variant="outline" loading={pwSaving}>Update</Button>
          </form>
        </Card>

        <div className="flex justify-end">
          <Button variant="ghost" className="text-hot" onClick={async () => { await signOut(); router.push("/"); }}>
            <LogOut className="size-4" /> Log out
          </Button>
        </div>
      </div>
    </div>
  );
}
