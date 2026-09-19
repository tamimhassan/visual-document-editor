'use client';

import { useRef } from 'react';
import { FileText, Plus, X } from 'lucide-react';

import { useEditorStore } from '@/store/editorStore';

interface TabSummary {
  id: string;
  title: string;
}

function useTabSummaries(): TabSummary[] {
  const prevRef = useRef<TabSummary[]>([]);
  return useEditorStore((state) => {
    const prev = prevRef.current;
    if (
      prev.length === state.tabs.length &&
      prev.every((tab, i) => {
        const item = state.tabs[i];
        return (
          item !== undefined && tab.id === item.id && tab.title === item.title
        );
      })
    ) {
      return prev;
    }
    const next = state.tabs.map((tab) => ({ id: tab.id, title: tab.title }));
    prevRef.current = next;
    return next;
  });
}

export function TabBar() {
  const tabs = useTabSummaries();
  const activeTabId = useEditorStore((state) => state.activeTabId);

  return (
    <div className='flex h-12 items-stretch border-b border-line bg-slate-50'>
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`group flex min-w-[180px] items-center gap-2 border-r border-line px-4 text-[13px]
              ${
                active
                  ? 'border-b-2 border-b-brand-600 bg-white font-semibold text-brand-700'
                  : 'text-ink-600 hover:bg-white/70'
              }`}
          >
            <button
              type='button'
              className='flex flex-1 items-center gap-2 truncate text-left'
              onClick={() => useEditorStore.getState().setActiveTab(tab.id)}
            >
              <FileText size={15} className={active ? '' : 'text-ink-400'} />
              <span className='truncate'>{tab.title}</span>
            </button>

            {tabs.length > 1 ? (
              <button
                type='button'
                aria-label={`Close ${tab.title}`}
                className='rounded p-1 text-ink-400 transition hover:bg-slate-100 hover:text-ink-800'
                onClick={() => useEditorStore.getState().closeTab(tab.id)}
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        );
      })}

      <button
        type='button'
        aria-label='New template tab'
        className='flex w-12 items-center justify-center text-ink-400 transition hover:bg-white hover:text-brand-600'
        onClick={() => useEditorStore.getState().openNewTab()}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
