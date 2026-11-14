import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Mic, Sparkles, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "./Brand";
import { Bars, Notice } from "./ui";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [show, setShow] = useState(false); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [success, setSuccess] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); setSuccess(""); setBusy(true);
    try {
      if (mode === "login") { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; }
      else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (!data.session) { setSuccess("Compte créé ! Confirmez votre adresse via l’email reçu, puis connectez-vous."); setMode("login"); }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setSuccess("Si un compte existe, un lien de réinitialisation vient d’être envoyé.");
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erreur";
      setError(/Invalid login/i.test(m) ? "Email ou mot de passe incorrect." : /registered/i.test(m) ? "Cette adresse a déjà un compte." : m);
    } finally { setBusy(false); }
  }
  async function social(p: "google" | "apple") {
    setError(""); setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: p,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      const message = err instanceof Error ? err.message : "La connexion a échoué.";
      setError(/provider is not enabled|unsupported provider/i.test(message)
        ? `La connexion ${p === "google" ? "Google" : "Apple"} n’est pas encore activée dans Supabase.`
        : "La connexion a échoué. Vérifiez la configuration OAuth dans Supabase puis réessayez.");
    } finally {
      setBusy(false);
    }
  }
  const input = "w-full bg-transparent py-3.5 text-[15px] outline-none placeholder:text-muted-foreground/70";
  const wrap = "flex items-center gap-3 rounded-2xl border-2 border-input bg-card px-4 transition-colors focus-within:border-primary focus-within:shadow-soft";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <div className="bg-gradient-hero relative overflow-hidden px-6 pb-16 pt-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-primary-foreground/15 animate-spin-slow" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative"><Brand light /></div>
        <div className="relative mt-10 lg:mt-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/12 px-3 py-1.5 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5 text-accent" /> VOTRE ÉCOLE D’ÉLOQUENCE</span>
          <h1 className="mt-5 text-4xl font-bold leading-tight lg:text-6xl">Votre voix.<br /><span className="text-accent">Votre progression.</span></h1>
          <p className="mt-4 max-w-md text-primary-foreground/80">Diction, fluidité, confiance : un coach IA qui vous écoute et vous fait progresser chaque jour.</p>
          <div className="mt-8 flex items-center gap-4 text-accent"><span className="grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-foreground animate-float"><Mic className="h-6 w-6" /></span><Bars count={14} /></div>
        </div>
        <div className="relative hidden text-sm text-primary-foreground/60 lg:block">© {new Date().getFullYear()} Eloquia</div>
      </div>

      <div className="relative -mt-8 rounded-t-[2rem] bg-background px-6 pb-12 pt-8 lg:mt-0 lg:grid lg:place-items-center lg:rounded-none">
        <div className="mx-auto w-full max-w-md animate-rise">
          <h2 className="text-2xl font-bold text-primary-deep">{mode === "login" ? "Ravi de vous revoir 👋" : mode === "signup" ? "Créez votre espace" : "Mot de passe oublié ?"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{mode === "login" ? "Connectez-vous pour reprendre votre progression." : mode === "signup" ? "Commencez votre parcours dès aujourd’hui." : "Nous vous envoyons un lien de réinitialisation."}</p>
          <div className="mt-5 space-y-3">{error && <Notice kind="error">{error}</Notice>}{success && <Notice kind="success">{success}</Notice>}</div>
          <form onSubmit={submit} className="mt-5 space-y-3.5">
            {mode === "signup" && <label className={wrap}><UserRound className="h-5 w-5 text-primary" /><input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" required minLength={2} autoComplete="name" /></label>}
            <label className={wrap}><Mail className="h-5 w-5 text-primary" /><input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" required autoComplete="email" /></label>
            {mode !== "forgot" && <label className={wrap}><LockKeyhole className="h-5 w-5 text-primary" /><input className={input} type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} /><button type="button" onClick={() => setShow((v) => !v)} className="tap text-muted-foreground" aria-label="Afficher le mot de passe">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></label>}
            {mode === "login" && <div className="text-right"><button type="button" onClick={() => setMode("forgot")} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">Mot de passe oublié ?</button></div>}
            <button disabled={busy} className="tap flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-4 font-semibold text-primary-foreground shadow-lift transition hover:brightness-110 disabled:opacity-60">{busy ? "Patientez…" : mode === "login" ? "Se connecter" : mode === "signup" ? "Créer mon compte" : "Envoyer le lien"} <ArrowRight className="h-5 w-5" /></button>
          </form>
          {mode !== "forgot" && <>
            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
            <div className="grid gap-3">
              <button onClick={() => void social("google")} className="tap flex items-center justify-center gap-2.5 rounded-full border border-[#747775] bg-[#FFFFFF] px-3 py-3 text-sm font-medium text-[#1F1F1F]">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
                Continuer avec Google</button>
              <button onClick={() => void social("apple")} className="tap rounded-full bg-[#000000] px-3 py-3 text-sm font-medium text-[#FFFFFF]">Continuer avec Apple</button>
            </div>
          </>}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? <>Pas encore de compte ? <button onClick={() => setMode("signup")} className="font-semibold text-primary">Créer un compte</button></> : <>Déjà inscrit ? <button onClick={() => setMode("login")} className="font-semibold text-primary">Se connecter</button></>}
          </p>
        </div>
      </div>
    </div>
  );
}
