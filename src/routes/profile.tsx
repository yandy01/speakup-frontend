import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { BarChart3, ChevronRight, LogOut, Mail, Save, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { AppShell, onboardingKey } from "@/components/eloquia/AppShell";
import { Eyebrow, Notice, Spinner } from "@/components/eloquia/ui";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/eloquia/head";

export const Route = createFileRoute("/profile")({
  head: pageHead("Mon profil", "Gérez votre nom, votre niveau et votre parcours personnalisé."),
  component: () => <AppShell title="Mon profil"><ProfilePage /></AppShell>,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(""); const [level, setLevel] = useState("beginner");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ k: "success" | "error"; t: string } | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name,level").eq("id", user.id).maybeSingle().then(({ data }) => {
      setName(data?.display_name || String(user.user_metadata?.["display_name"] || "")); setLevel(data?.level || "beginner"); setLoading(false);
    });
  }, [user]);
  async function save(e: FormEvent) {
    e.preventDefault(); if (!user) return; setSaving(true); setMsg(null);
    const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: name.trim(), level, updated_at: new Date().toISOString() });
    if (!error) await supabase.auth.updateUser({ data: { display_name: name.trim() } });
    setMsg(error ? { k: "error", t: "La sauvegarde a échoué." } : { k: "success", t: "Profil mis à jour ✓" }); setSaving(false);
  }
  if (loading) return <Spinner label="Chargement du profil…" />;
  const levels = [["beginner", "Débutant"], ["intermediate", "Intermédiaire"], ["advanced", "Avancé"]];
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="bg-gradient-hero flex items-center gap-4 rounded-3xl p-5 text-primary-foreground shadow-lift">
        <span className="animate-pop grid h-16 w-16 place-items-center rounded-full bg-accent text-xl font-bold text-accent-foreground shadow-glow">{(name || "EL").slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0"><b className="block truncate text-xl">{name || "Orateur"}</b><span className="flex items-center gap-1.5 truncate text-sm text-primary-foreground/80"><Mail className="h-4 w-4" />{user?.email}</span></div>
      </section>
      <form onSubmit={save} className="space-y-4 rounded-3xl border border-border bg-card p-5 shadow-soft">
        <Eyebrow>Vos informations</Eyebrow>
        {msg && <Notice kind={msg.k}>{msg.t}</Notice>}
        <label className="block text-sm font-semibold text-primary-deep">Nom affiché
          <div className="mt-1.5 flex items-center gap-3 rounded-2xl border-2 border-input px-4 focus-within:border-primary"><UserRound className="h-5 w-5 text-primary" /><input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className="w-full bg-transparent py-3.5 font-normal outline-none" /></div>
        </label>
        <div className="text-sm font-semibold text-primary-deep">Votre niveau
          <div className="mt-1.5 grid grid-cols-3 gap-2">{levels.map(([v, l]) => <button type="button" key={v} onClick={() => setLevel(v ?? "beginner")} className={`tap rounded-2xl border-2 py-3 text-sm font-semibold transition ${level === v ? "border-primary bg-primary text-primary-foreground shadow-soft" : "border-border hover:border-primary/50"}`}>{l}</button>)}</div>
        </div>
        <button disabled={saving} className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-4 font-semibold text-primary-foreground shadow-lift disabled:opacity-60"><Save className="h-5 w-5" /> {saving ? "Enregistrement…" : "Enregistrer"}</button>
      </form>
      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
        {[
          { icon: BarChart3, label: "Ma progression", sub: "Scores, badges, historique", on: () => navigate({ to: "/progress" }) },
          { icon: SlidersHorizontal, label: "Modifier mon parcours", sub: "Objectifs, difficultés, rythme", on: () => { if (user) localStorage.removeItem(onboardingKey(user.id)); navigate({ to: "/onboarding" }); } },
          { icon: LogOut, label: "Se déconnecter", sub: "Fermer la session sur cet appareil", on: () => void signOut() },
        ].map((r) => <button key={r.label} onClick={r.on} className="tap flex w-full items-center gap-4 border-b border-border px-5 py-4 text-left last:border-0 hover:bg-primary-soft/60">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary"><r.icon className="h-5 w-5" /></span><span className="flex-1"><b className="block text-primary-deep">{r.label}</b><small className="text-muted-foreground">{r.sub}</small></span><ChevronRight className="h-5 w-5 text-primary" /></button>)}
      </div>
      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-success" /> Vos données sont privées et liées à votre compte.</p>
    </div>
  );
}
