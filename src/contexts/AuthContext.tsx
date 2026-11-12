import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) console.error('Supabase session error:', error.message);
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,
    configured: isSupabaseConfigured,
    signIn: async (email, password) => {
      if (!supabase) throw new Error('Supabase n’est pas encore configuré. Ajoute les variables dans .env.local.');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async (email, password, displayName) => {
      if (!supabase) throw new Error('Supabase n’est pas encore configuré.');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName.trim() } },
      });
      if (error) throw error;
      return Boolean(data.session);
    },
    signOut: async () => {
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    resetPassword: async (email) => {
      if (!supabase) throw new Error('Supabase n’est pas encore configuré.');
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
    },
    updatePassword: async (password) => {
      if (!supabase) throw new Error('Supabase n’est pas configuré.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    signInWithProvider: async (provider) => {
      if (!supabase) throw new Error('Supabase n’est pas encore configuré.');
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    },
  }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return context;
}
