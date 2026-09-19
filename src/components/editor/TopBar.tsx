"use client";

import {
  Download,
  Eye,
  FileText,
  Redo2,
  Save,
  Undo2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { exportActiveDocumentToPdf } from "@/lib/pdf";
import { useEditorStore } from "@/store/editorStore";
import { useActiveTab } from "@/store/selectors";

export function TopBar() {
  const projectName = useActiveTab((tab) => tab?.document.projectName ?? "");
  const canUndo = useActiveTab((tab) => (tab?.past.length ?? 0) > 0);
  const canRedo = useActiveTab((tab) => (tab?.future.length ?? 0) > 0);
  const dirty = useActiveTab((tab) => tab?.dirty ?? false);
  const exporting = useEditorStore((state) => state.exporting);

  const [draft, setDraft] = useState(projectName);
  const [lastProjectName, setLastProjectName] = useState(projectName);
  const [justSaved, setJustSaved] = useState(false);

  // Adopt external name changes (tab switch, undo) during render so the input never lags a frame.
  if (lastProjectName !== projectName) {
    setLastProjectName(projectName);
    setDraft(projectName);
  }

  useEffect(() => {
    if (!justSaved) return;
    const timer = window.setTimeout(() => setJustSaved(false), 1800);
    return () => window.clearTimeout(timer);
  }, [justSaved]);

  const handleSave = (): void => {
    useEditorStore.getState().saveActiveTab();
    setJustSaved(true);
  };

  const handleExport = async (): Promise<void> => {
    const store = useEditorStore.getState();
    store.setExporting(true);
    try {
      await exportActiveDocumentToPdf(projectName || "document");
    } finally {
      useEditorStore.getState().setExporting(false);
    }
  };

  return (
    <header className="flex h-16 items-center gap-4 border-b border-line bg-white px-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <FileText size={18} />
        </span>
        <h1 className="whitespace-nowrap text-[17px] font-semibold text-ink-900">
          Document Editor (PoC)
        </h1>
      </div>

      <label className="ml-4 w-[300px] max-w-[34vw]">
        <span className="mb-0.5 block text-[11px] text-ink-400">
          Project Name
        </span>
        <input
          className="h-9 w-full rounded-lg border border-line bg-white px-3 text-[13px] outline-none
                     transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => useEditorStore.getState().setProjectName(draft)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </label>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          aria-label="Undo"
          disabled={!canUndo}
          onClick={() => useEditorStore.getState().undo()}
          icon={<Undo2 size={17} />}
        />
        <Button
          variant="ghost"
          aria-label="Redo"
          disabled={!canRedo}
          onClick={() => useEditorStore.getState().redo()}
          icon={<Redo2 size={17} />}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          icon={<Eye size={16} />}
          onClick={() => useEditorStore.getState().setPreviewOpen(true)}
        >
          Preview
        </Button>

        <Button
          variant="outline"
          className="border-brand-200 text-brand-700"
          icon={<Save size={16} />}
          onClick={handleSave}
        >
          {justSaved ? "Saved" : "Save"}
          {dirty && !justSaved ? (
            <span
              aria-label="Unsaved changes"
              className="ml-0.5 h-1.5 w-1.5 rounded-full bg-brand-600"
            />
          ) : null}
        </Button>

        <Button
          variant="primary"
          icon={<Download size={16} />}
          disabled={exporting}
          onClick={() => void handleExport()}
        >
          {exporting ? "Preparing…" : "Download PDF"}
        </Button>
      </div>
    </header>
  );
}
