import { lazy, type ComponentType } from 'react';

/** Lazy-load a named export from a module (e.g. `export function AdminDashboard`). */
export function lazyNamed<T extends ComponentType<unknown>>(
  factory: () => Promise<Record<string, T>>,
  exportName: string
) {
  return lazy(() => factory().then((module) => ({ default: module[exportName] })));
}
