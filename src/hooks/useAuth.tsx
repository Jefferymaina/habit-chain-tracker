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

// 1) URL used for Google OAuth redirect (NO "#" allowed)
function getOAuthRedirectUrl() {
  if (typeof window === 'undefined') return '';

  const hostname = window.location.hostname;

  // Local static build (npm run preview)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // trailing slash is required for Vite preview
    return 'http://localhost:8080/HabitChainTracker_prototype1/';
  }

  // Production GitHub Pages URL (no hash, no extra slash)
  return 'https://jefferymaina.github.io/HabitChainTracker_prototype1';
}

// 2) Base app URL used for email / reset redirects
function getAppBaseUrl() {
  const oauth = getOAuthRedirectUrl();
  // For local: oauth ends with "/", keep it.
  // For prod: oauth has no trailing "/", keep it as is.
  return oauth;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

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
    const baseUrl = getAppBaseUrl();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
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
    const redirectUrl = getOAuthRedirectUrl();
    console.log('Google redirect URL used:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // NO "#" here – this is critical
        redirectTo: redirectUrl,
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
    const baseUrl = getAppBaseUrl();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
