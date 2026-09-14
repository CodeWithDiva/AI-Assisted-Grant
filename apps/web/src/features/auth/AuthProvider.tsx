import type { AuthUser } from '@grant/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Outlet } from 'react-router';
import { authApi } from './api';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children?: ReactNode }) {
  const queryClient = useQueryClient();

  // A 401 here simply means "not signed in", so it must not be retried.
  const { data, isPending } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    retry: false,
    staleTime: 60_000,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: data ?? null,
      isLoading: isPending,
      refresh: async () => {
        await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      },
      logout: async () => {
        await authApi.logout();
        queryClient.clear();
      },
    }),
    [data, isPending, queryClient],
  );

  return <AuthContext.Provider value={value}>{children ?? <Outlet />}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
