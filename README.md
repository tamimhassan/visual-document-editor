# Visual Document Editor (PoC)

An interactive document editor and template manager built with Next.js (App
Router), TypeScript and Zustand. The canvas is drag-and-droppable, changes are
saved as named templates in the browser, and the active document can be exported
to PDF.

## Local setup

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint via next lint
```

Node 20.9+ is required (Next 16). The first build fetches the Inter font
through `next/font/google`, so it needs network access.

## The required flow

1. Open the app — the built-in default template renders on the canvas.
2. Edit it: drag blocks, reorder table rows by their `⋮⋮` handles, type in
   cells, restyle anything from the right-hand panel.
3. Press **Save** (or ⌘/Ctrl+S). The first save of a tab stores the document as
   **`template1`**.
4. Reopen the app — `template1` is loaded instead of the default template.

Saving again from the same tab updates that template rather than creating a
duplicate. A second, independent tab saves as `template2`, and so on.

## Features

**Top bar and tabs** — project name, undo/redo, Preview, Save, Download PDF.
Tabs switch between open templates; `+` opens a new one. Each tab owns its own
document, selection and history stack.

**Component toolbox** — insert text blocks, simple tables, images and shapes,
plus the two quick-add buttons. Pages are managed from the same rail with
thumbnails and **Add Page**.

**Canvas** — every page of the document is rendered as an A4 sheet (794 ×
1123 px, so screen and PDF agree), stacked in one scrollable viewport; the
page rail scrolls to a page when its thumbnail is clicked or content on it is
selected. Blocks flow and wrap according to a `widthPercent` and an indent,
which is how the header row (logo, company, document title) and the
issuer/client/meta row sit side-by-side without absolute positioning. Blocks
reorder with `@dnd-kit` (`rectSortingStrategy`); table rows reorder in a
nested `DndContext` restricted to the vertical axis. Tables carry inline
**Add Row** / **Add Column** controls and a column delete, shown in the edit
canvas only — never in preview or the PDF.

**Automatic A4 pagination** — content that outgrows a page flows onto the
next one, appending pages as needed. Oversized tables are split at a row
boundary: the tail becomes a continuation table on the next page with
continued row numbering. The reflow is _overflow-only_: it never pulls
content back onto earlier pages and never removes pages, so a manually added
page keeps its meaning as a deliberate break. It runs from DOM measurements
(a debounced pass after edits settle), so undo history stays clean.

**Properties panel** — text settings (font family, size, weight, colour,
alignment), table settings (width, borders, padding, row spacing), explicit
column and row management, and a layout section for block width, indent and
spacing. Image blocks accept an uploaded file (stored as a data URI); shape
blocks expose fill, height and corner radius.

**Saved templates** — cards list every saved template with its timestamp, an
**Open** button that hydrates a new tab, and a menu to rename or delete.

**PDF export** — rasterises the off-screen read-only copy of the sheets with
`html2canvas` (JPEG at 2× scale, which keeps multi-page exports small and the
renderer alive) and places them into `jsPDF` at A4, one PDF page per sheet.
The file downloads through an explicit anchor with a `…​.pdf` filename. Both
libraries are imported dynamically so they stay out of the first-load bundle.

## Architecture

```
src/
  app/                     layout, page, global styles
  lib/                     domain types, default template, storage, pdf, helpers
  store/                   Zustand store (editorStore) + selector hooks
  components/ui/           small form primitives
  components/editor/       chrome: top bar, tabs, toolbox, pages, canvas stage
  components/editor/canvas block renderers, sortable frame, export surface
  components/editor/properties, /templates
```

**State.** One Zustand store, mutated through the `immer` middleware. The store
holds `tabs[]`, each with a `DocumentModel`, its selection, and `past`/`future`
snapshot stacks for undo/redo. Typing produces a single history entry per
editing session: the first `onInput`/`onChange` after focus takes the snapshot,
subsequent keystrokes are transient.

**Rendering performance.** Nothing subscribes to the whole document.
Components select the narrowest slice they can — `useTableRowIds`,
`useTableColumns`, `useTableStyle`, `useBlockLayout`, `useTextStyle` — and
because immer leaves untouched branches referentially stable, editing one cell
changes only that row's `cells` object. The result:

- typing in a table cell re-renders that row, not the table shell, the other
  rows, or any other block;
- text blocks write into the DOM imperatively, so React never re-renders the
  node holding the caret;
- handlers call `useEditorStore.getState()` instead of taking callback props, so
  memoised children keep stable props;
- page thumbnails paint a schematic from block _kinds_ rather than cloning the
  canvas, so they don't repaint while you type;
- switching tabs swaps one subtree; the canvas itself is keyed by page.

**Persistence.** `localStorage` under `vde.templates.v1`, read defensively —
a corrupted or hand-edited value degrades to "no saved templates" rather than
breaking the editor. Hydration happens in an effect after mount so the server
render and the first client render agree.

**Type safety.** `strict: true` with `noImplicitAny`, `noUncheckedIndexedAccess`
and `noUnusedLocals`. There are no `any` types in `src/`. Blocks are a
discriminated union on `kind`, so each renderer and each settings panel narrows
to a concrete block type.

## Interpretation notes

Two points in the brief were ambiguous, resolved as follows:

- **Table "Width"** in the properties panel applies to the currently targeted
  column (click a cell to target one), since it sits directly above Column
  Management and a whole-table pixel width would fight the A4 sheet.
- **Template naming** follows the spec text literally: the first save is
  `template1`. The design mock labels the card "Template-1"; renaming is
  available from the card menu.

## Known limits (PoC scope)

- Templates live in the browser, not on a server — clearing site data clears
  them.
- PDF export is a rasterisation of the sheet, so text in the PDF is not
  selectable. A vector export would mean re-implementing the layout in
  `jsPDF`/`react-pdf`.
- Blocks flow and wrap; there is no free-form absolute positioning.
- Pagination is overflow-only: a table split across pages becomes independent
  blocks — restyling one chunk does not propagate to its continuations, and
  deleting rows never merges chunks back automatically.
- Undo history is per tab and capped at 60 entries; the automatic pagination
  itself is not part of undo (it is re-derived from measurements).
