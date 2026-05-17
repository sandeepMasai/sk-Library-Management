import React from 'react';
import { useAppStore } from '../../store';
import LoginScreen from '../../screens/auth/LoginScreen';
import ForbiddenScreen from '../../screens/common/ForbiddenScreen';
import { normalizeAuthRole, resolveEffectiveRole } from '../../utils/authRole';

/**
 * Role-based routing guards.
 *
 * State flow:
 * - `useAppStore` persists auth state (token/role/libraryId/libraryCode).
 * - On app load, persisted state is restored automatically.
 * - Guards use that state to allow/deny access without changing screen UI code.
 */

function BaseGuard(props: { allow: Array<'admin' | 'library' | 'student'>; children: React.ReactNode }) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const role = useAppStore((s) => s.role);
  const currentUserRole = useAppStore((s) => s.currentUser?.role);
  const effectiveRole = resolveEffectiveRole(role, currentUserRole);

  // Not logged in → show login (logout resets stack to root Login so this is a fallback)
  if (!isAuthenticated()) return <LoginScreen />;

  // Role mismatch → block access
  if (!effectiveRole || !props.allow.includes(effectiveRole)) {
    return <ForbiddenScreen message="Your account role does not have access to this page." />;
  }

  return <>{props.children}</>;
}

export { normalizeAuthRole, resolveEffectiveRole };

export function AdminRoute(props: { children: React.ReactNode }) {
  return <BaseGuard allow={['admin']}><>{props.children}</></BaseGuard>;
}

export function LibraryRoute(props: { children: React.ReactNode }) {
  return <BaseGuard allow={['library']}><>{props.children}</></BaseGuard>;
}

export function StudentRoute(props: { children: React.ReactNode }) {
  return <BaseGuard allow={['student']}><>{props.children}</></BaseGuard>;
}

