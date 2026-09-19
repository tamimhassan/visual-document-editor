import type { SavedTemplate } from '@/lib/types';

const STORAGE_KEY = 'vde.templates';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function isSavedTemplate(value: unknown): value is SavedTemplate {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<SavedTemplate>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    typeof candidate.document === 'object' &&
    candidate.document !== null &&
    Array.isArray(candidate.document.pages)
  );
}

export function readTemplates(): SavedTemplate[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isSavedTemplate);
  } catch {
    return [];
  }
}

export function writeTemplates(templates: SavedTemplate[]): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // Quota errors are non-fatal: the in-memory document is still intact.
  }
}

/** The template the editor should open with, the most recently saved one. */
export function pickTemplateToRestore(
  templates: SavedTemplate[],
): SavedTemplate | null {
  if (templates.length === 0) return null;

  const sorted = [...templates].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );

  return sorted[0] ?? null;
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const day = date.toISOString().slice(0, 10);
  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${day}  |  ${time}`;
}
