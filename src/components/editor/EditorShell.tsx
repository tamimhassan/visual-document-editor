'use client';

import { useEffect } from 'react';

import { ToastProvider, useToast } from '@/components/ui/toast';
import { useEditorStore } from '@/store/editorStore';
import { CanvasStage } from './CanvasStage';
import { PdfExportRoot } from './canvas/PdfExportRoot';
import { PreviewDialog } from './PreviewDialog';
import { PropertiesPanel } from './properties/PropertiesPanel';
import { SavedTemplatesPanel } from './templates/SavedTemplatesPanel';
import { TabBar } from './TabBar';
import { Toolbox } from './Toolbox';
import { TopBar } from './TopBar';

/**
 * Turns successful saves into toasts. Subscribes to the store directly so the
 * shell itself does not re-render on every save, and covers every save
 * trigger (button, Cmd/Ctrl+S, templates panel) because they all run the
 * same store action.
 */
function SaveToastBridge() {
  const { showToast } = useToast();

  useEffect(() => {
    let lastSeq = useEditorStore.getState().lastSaveEvent?.seq ?? 0;
    const unsubscribe = useEditorStore.subscribe((state) => {
      const event = state.lastSaveEvent;
      if (!event || event.seq === lastSeq) return;
      lastSeq = event.seq;
      showToast(
        event.created ? `Saved as ${event.name}` : `Updated ${event.name}`,
      );
    });
    return unsubscribe;
  }, [showToast]);

  return null;
}

export function EditorShell() {
  const exporting = useEditorStore((state) => state.exporting);

  useEffect(() => {
    useEditorStore.getState().hydrate();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) return;

      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) useEditorStore.getState().redo();
        else useEditorStore.getState().undo();
      }
      if (key === 's') {
        event.preventDefault();
        useEditorStore.getState().saveActiveTab();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <ToastProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-canvas">
        <TopBar />
        <TabBar />

        <div className="flex min-h-0 flex-1">
          <Toolbox />

          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1">
              <CanvasStage />
              <PropertiesPanel />
            </div>
            <SavedTemplatesPanel />
          </main>
        </div>

        <PreviewDialog />
        {exporting ? <PdfExportRoot /> : null}
      </div>
      <SaveToastBridge />
    </ToastProvider>
  );
}
