import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/eloquia/Brand";
import { Notice } from "@/components/eloquia/ui";
import { pageHead } from "@/lib/eloquia/head";

export const Route = createFileRoute("/reset-password")({
  head: pageHead("Nouveau mot de passe", "Choisissez un nouveau mot de passe pour votre compte Eloquia."),
  component: Reset,
});
function Reset() {
  const navigate = useNavigate();
  const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); const { error } = await supabase.auth.updateUser({ password: pw }); setBusy(false); if (error) setErr(error.message); else navigate({ to: "/" }); }
  return <div className="grid min-h-screen place-items-center p-6"><form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl border border-border bg-card p-6 shadow-lift"><Brand /><h1 className="text-xl font-bold text-primary-deep">Nouveau mot de passe</h1>{err && <Notice kind="error">{err}</Notice>}<label className="flex items-center gap-3 rounded-2xl border-2 border-input px-4 focus-within:border-primary"><LockKeyhole className="h-5 w-5 text-primary" /><input type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="8 caractères minimum" className="w-full bg-transparent py-3.5 outline-none" /></label><button disabled={busy} className="tap w-full rounded-2xl bg-gradient-primary py-4 font-semibold text-primary-foreground shadow-lift">Enregistrer</button></form></div>;
}
