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

// Explicit base URL for prod (GitHub Pages) vs local build
function getBaseUrl() {
  if (typeof window === 'undefined') return '';

  const hostname = window.location.hostname;

  // Your local static build URL
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // NOTE: trailing slash is IMPORTANT here
    return 'http://localhost:8080/HabitChainTracker_prototype1/';
  }

  // Production GitHub Pages URL (unchanged)
  return 'https://jefferymaina.github.io/HabitChainTracker_prototype1';
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
        // baseUrl already ends with '/', so don't add another before '#'
        emailRedirectTo: `${baseUrl}#/auth`,
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
    const baseUrl = getBaseUrl();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Local:  http://localhost:8080/HabitChainTracker_prototype1/
        // Prod:   https://jefferymaina.github.io/HabitChainTracker_prototype1
        redirectTo: baseUrl,
      },
    });

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
      // baseUrl already ends with '/'
      redirectTo: `${baseUrl}#/auth`,
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
