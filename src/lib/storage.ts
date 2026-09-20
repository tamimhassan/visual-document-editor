import type { SavedTemplate } from '@/lib/types';

const STORAGE_KEY = 'vde.templates';

/** Shape persisted to localStorage. `defaultTemplateId` is never null. */
export interface TemplateStore {
  /**
   * The template the editor opens on launch. `""` means "no default yet"
   * (fresh install, or the last template was deleted); the app then falls
   * back to the built-in blank document.
   */
  defaultTemplateId: string;
  templates: SavedTemplate[];
}

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

/**
 * The default implied by data saved before explicit defaults existed: the
 * most recently updated template, which is what the app used to restore.
 */
function legacyDefault(templates: SavedTemplate[]): string {
  if (templates.length === 0) return '';

  const sorted = [...templates].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );

  return sorted[0]?.id ?? '';
}

/**
 * Self-heals a default that no longer points at a real template (hand-edited
 * localStorage, corrupted data): fall back to the first surviving template
 * rather than trusting a stale reference.
 */
function healDefault(store: TemplateStore): TemplateStore {
  if (store.templates.some((template) => template.id === store.defaultTemplateId)) {
    return store;
  }
  return { ...store, defaultTemplateId: store.templates[0]?.id ?? '' };
}

export function readTemplateStore(): TemplateStore {
  const empty: TemplateStore = { defaultTemplateId: '', templates: [] };
  if (!isBrowser()) return empty;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;

    const parsed: unknown = JSON.parse(raw);

    // Legacy shape (written before explicit defaults): a bare template array.
    // The implicit default it carried becomes the explicit one.
    if (Array.isArray(parsed)) {
      const templates = parsed.filter(isSavedTemplate);
      return healDefault({
        defaultTemplateId: legacyDefault(templates),
        templates,
      });
    }

    if (typeof parsed !== 'object' || parsed === null) return empty;

    const candidate = parsed as Partial<TemplateStore>;
    const templates = Array.isArray(candidate.templates)
      ? candidate.templates.filter(isSavedTemplate)
      : [];
    const defaultTemplateId =
      typeof candidate.defaultTemplateId === 'string'
        ? candidate.defaultTemplateId
        : '';

    return healDefault({ defaultTemplateId, templates });
  } catch {
    return empty;
  }
}

export function writeTemplateStore(store: TemplateStore): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota errors are non-fatal: the in-memory document is still intact.
  }
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
