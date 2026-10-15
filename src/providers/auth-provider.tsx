import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  fetchProfile,
  login,
  loginWithGoogle,
  logout,
  register,
} from '@/lib/api';
import { readStoredSession, writeStoredSession } from '@/lib/storage';
import type { AuthSession, User } from '@/types';

type RegisterInput = {
  name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirmation: string;
  role: 'client' | 'intervenant';
  siret?: string;
};

type AuthContextValue = {
  session: AuthSession | null;
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (input: RegisterInput) => Promise<User>;
  signInWithGoogle: (
    credential: string,
    role: 'client' | 'intervenant'
  ) => Promise<User>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  setUser: (user: User) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    readStoredSession()
      .then((value) => {
        if (!value) return;
        try {
          setSession(JSON.parse(value) as AuthSession);
        } catch {
          return writeStoredSession(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (next: AuthSession | null) => {
    setSession(next);
    await writeStoredSession(next ? JSON.stringify(next) : null);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await login(email, password);
      await persist({ token: result.token, user: result.user });
      return result.user;
    },
    [persist]
  );

  const signUp = useCallback(
    async (input: RegisterInput) => {
      const result = await register(input);
      await persist({ token: result.token, user: result.user });
      return result.user;
    },
    [persist]
  );

  const signInWithGoogle = useCallback(
    async (credential: string, role: 'client' | 'intervenant') => {
      const result = await loginWithGoogle(credential, role);
      await persist({ token: result.token, user: result.user });
      return result.user;
    },
    [persist]
  );

  const refreshUser = useCallback(async () => {
    if (!session?.token) return null;
    const user = await fetchProfile(session.token);
    await persist({ ...session, user });
    return user;
  }, [persist, session]);

  const setUser = useCallback(
    async (user: User) => {
      if (!session) return;
      await persist({ ...session, user });
    },
    [persist, session]
  );

  const signOut = useCallback(async () => {
    if (session?.token) {
      await logout(session.token).catch(() => undefined);
    }
    await persist(null);
  }, [persist, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user || null,
      token: session?.token || null,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      refreshUser,
      setUser,
    }),
    [loading, refreshUser, session, setUser, signIn, signInWithGoogle, signOut, signUp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return value;
}
