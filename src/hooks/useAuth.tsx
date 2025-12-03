import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ error: Error | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Base URL of your app (used for email & reset-password redirects)
function getBaseUrl() {
  if (typeof window === 'undefined') return '';

  // In Vite, BASE_URL should be "/HabitChainTracker_prototype1/" in prod
  const basePath = import.meta.env.BASE_URL || '/';
  const cleanBasePath = basePath.endsWith('/')
    ? basePath.slice(0, -1)
    : basePath;

  return `${window.location.origin}${cleanBasePath}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Initial session check (important after OAuth redirect)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ error: Error | null }> => {
    const baseUrl = getBaseUrl();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Email confirmation / magic link goes here
        emailRedirectTo: `${baseUrl}/#/auth`,
        data: name ? { full_name: name } : undefined,
      },
    });

    return { error: (error as Error) ?? null };
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: (error as Error) ?? null };
  };

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    // IMPORTANT: no redirectTo here → Supabase uses Site URL only,
    // and app logic (Index/Auth) will send logged-in users to /dashboard.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    // Optional: debug the URL Supabase is returning
    console.log('Google OAuth start URL:', data?.url, error);

    return { error: (error as Error) ?? null };
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (
    email: string
  ): Promise<{ error: Error | null }> => {
    const baseUrl = getBaseUrl();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // Password-reset email brings the user to /auth
      redirectTo: `${baseUrl}/#/auth`,
    });

    return { error: (error as Error) ?? null };
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
