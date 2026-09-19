'use client';

import { FileText, FolderOpen, MoreVertical, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { formatTimestamp } from '@/lib/storage';
import { useEditorStore } from '@/store/editorStore';

interface TemplateSummary {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
}

interface MenuPosition {
  top: number;
  right: number;
}

function TemplateCard({ template }: { template: TemplateSummary }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(template.name);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent): void => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  const MENU_HEIGHT = 84;
  const toggleMenu = (): void => {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }
    const rect = menuButtonRef.current?.getBoundingClientRect();
    if (rect) {
      const fitsBelow = window.innerHeight - rect.bottom > MENU_HEIGHT + 12;
      setMenuPos({
        top: fitsBelow ? rect.bottom + 6 : rect.top - MENU_HEIGHT - 6,
        right: window.innerWidth - rect.right,
      });
    }
    setMenuOpen(true);
  };

  const commitRename = (): void => {
    const name = draft.trim();
    if (name) useEditorStore.getState().renameTemplate(template.id, name);
    else setDraft(template.name);
    setRenaming(false);
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <FileText size={17} />
      </span>

      <div className="min-w-0 flex-1">
        {renaming ? (
          <input
            autoFocus
            className="h-7 w-full max-w-[220px] rounded-md border border-line px-2 text-[13px] outline-none focus:border-brand-500"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
              if (event.key === 'Escape') {
                setDraft(template.name);
                setRenaming(false);
              }
            }}
          />
        ) : (
          <p className="truncate text-[13px] font-semibold text-ink-900">
            {template.name}
          </p>
        )}
        <p className="mt-0.5 text-[11px] text-ink-400">
          Saved on {formatTimestamp(template.updatedAt)}
        </p>
      </div>

      <Button
        icon={<FileText size={14} />}
        onClick={() => useEditorStore.getState().openTemplate(template.id)}
      >
        Open
      </Button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          ref={menuButtonRef}
          aria-label={`Options for ${template.name}`}
          className="rounded-lg p-2 text-ink-400 transition hover:bg-slate-100 hover:text-ink-800"
          onClick={toggleMenu}
        >
          <MoreVertical size={16} />
        </button>

        {menuOpen && menuPos ? (
          <div
            style={{
              position: 'fixed',
              top: menuPos.top,
              right: menuPos.right,
            }}
            className="z-50 w-40 overflow-hidden rounded-lg border border-line bg-white shadow-lg"
          >
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-[13px] hover:bg-slate-50"
              onClick={() => {
                setMenuOpen(false);
                setRenaming(true);
              }}
            >
              Rename
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50"
              onClick={() => {
                setMenuOpen(false);
                useEditorStore.getState().deleteTemplate(template.id);
              }}
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SavedTemplatesPanel() {
  const templates = useEditorStore((state) => state.templates);

  return (
    <section className="border-t border-line bg-white px-6 py-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <FolderOpen size={17} />
          </span>
          <div>
            <h2 className="text-[14px] font-semibold text-ink-900">
              Saved Templates
            </h2>
            <p className="text-[11px] text-ink-400">
              Access and manage your saved templates.
            </p>
          </div>
        </div>

        <Button
          variant="subtle"
          icon={<Plus size={15} />}
          onClick={() => useEditorStore.getState().saveActiveTab()}
        >
          Save Current as Template
        </Button>
      </div>

      <div className="max-h-[164px] space-y-2 overflow-y-auto">
        {templates.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-5 text-[13px] text-ink-400">
            No templates yet. Save the current document to reopen it next time
            you launch the editor.
          </p>
        ) : (
          templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))
        )}
      </div>
    </section>
  );
}
