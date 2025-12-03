import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to pick the correct base URL
function getBaseUrl() {
  if (typeof window === 'undefined') return '';
  return window.location.hostname === 'localhost'
    ? 'http://localhost:8080/HabitChainTracker_prototype1'
    : 'https://jefferymaina.github.io/HabitChainTracker_prototype1';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // If we have a session, and we're on landing/auth, go to dashboard
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        const hash = window.location.hash; // "#/", "#/auth", "#/dashboard", etc.
        if (hash === '' || hash === '#/' || hash === '#/auth') {
          window.location.hash = '#/dashboard';
        }
      }
    });

    // Initial session fetch (important after OAuth redirect)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session) {
        const hash = window.location.hash;
        if (hash === '' || hash === '#/' || hash === '#/auth') {
          window.location.hash = '#/dashboard';
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    const baseUrl = getBaseUrl();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Where to send email-confirmation links (if enabled)
        emailRedirectTo: `${baseUrl}/#/auth`,
        data: name ? { full_name: name } : undefined,
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google', // uses Supabase site_url as redirect
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const baseUrl = getBaseUrl();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Link in reset-password email will redirect here
      redirectTo: `${baseUrl}/#/auth`,
    });

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
