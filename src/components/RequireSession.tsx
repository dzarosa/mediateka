import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useApp } from '@/context/AppContext';

/** Chroni widok aktywną sesją Mediateki. Google OAuth nie jest wymagany w przeglądarce. */
export default function RequireSession({ children }: { children: ReactNode }) {
  const { gateUser } = useApp();
  if (!gateUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
