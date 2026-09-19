'use client';

import { useEffect } from 'react';

import { useEditorStore } from '@/store/editorStore';
import { CanvasStage } from './CanvasStage';
import { PdfExportRoot } from './canvas/PdfExportRoot';
import { PreviewDialog } from './PreviewDialog';
import { PropertiesPanel } from './properties/PropertiesPanel';
import { SavedTemplatesPanel } from './templates/SavedTemplatesPanel';
import { TabBar } from './TabBar';
import { Toolbox } from './Toolbox';
import { TopBar } from './TopBar';

export function EditorShell() {
  // The export surface mounts only while a PDF export is running: a permanently
  // mounted twin would double the render work of every edit and every tab switch.
  const exporting = useEditorStore((state) => state.exporting);

  // localStorage is only available on the client, so the saved template is
  // restored after mount. Server and first client render therefore agree.
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
  );
}
