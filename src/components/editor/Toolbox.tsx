'use client';

import {
  Image as ImageIcon,
  MousePointer2,
  Plus,
  Shapes,
  Table2,
  Type,
} from 'lucide-react';

import { useEditorStore } from '@/store/editorStore';
import type { BlockKind } from '@/lib/types';
import { PageThumbnails } from './PageThumbnails';
import { useSelectedBlockId } from '@/store/selectors';

const TOOLS: ReadonlyArray<{
  kind: BlockKind;
  label: string;
  icon: React.ReactNode;
}> = [
  { kind: 'text', label: 'Text Block', icon: <Type size={17} /> },
  { kind: 'table', label: 'Simple Table', icon: <Table2 size={17} /> },
  { kind: 'image', label: 'Image', icon: <ImageIcon size={17} /> },
  { kind: 'shape', label: 'Shape', icon: <Shapes size={17} /> },
];

export function Toolbox() {
  const selectedBlockId = useSelectedBlockId();

  return (
    <aside className='flex w-[212px] shrink-0 flex-col gap-6 overflow-y-auto bg-shell-900 px-4 py-5 text-white'>
      <div>
        <h2 className='mb-3 text-[15px] font-semibold'>Components</h2>

        <button
          type='button'
          className={`tool-button ${selectedBlockId === null ? 'tool-button-active' : ''}`}
          onClick={() => useEditorStore.getState().selectBlock(null)}
        >
          <MousePointer2 size={17} />
          Select
        </button>

        {TOOLS.map((tool) => (
          <button
            key={tool.kind}
            type='button'
            className='tool-button'
            onClick={() => useEditorStore.getState().addBlock(tool.kind)}
          >
            {tool.icon}
            {tool.label}
          </button>
        ))}
      </div>

      <div className='space-y-2 border-t border-white/10 pt-5'>
        <button
          type='button'
          className='flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2.5
                     text-[13px] font-medium text-white transition hover:bg-white/10'
          onClick={() => useEditorStore.getState().addBlock('table')}
        >
          <Plus size={15} /> Add Simple Table
        </button>
        <button
          type='button'
          className='flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2.5
                     text-[13px] font-medium text-white transition hover:bg-white/10'
          onClick={() => useEditorStore.getState().addBlock('text')}
        >
          <Plus size={15} /> Add New Text Line
        </button>
      </div>

      <PageThumbnails />
    </aside>
  );
}
