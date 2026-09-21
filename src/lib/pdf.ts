import { SHEET_MIN_HEIGHT, SHEET_WIDTH } from '@/lib/pagination';

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{ description: string; accept: Record<string, string[]> }>;
}

interface FileSystemWritableFileStream {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

declare global {
  interface Window {
    showSaveFilePicker?: (
      options?: SaveFilePickerOptions,
    ) => Promise<FileSystemFileHandle>;
  }
}

async function imageReady(image: HTMLImageElement): Promise<void> {
  if (image.complete && image.naturalWidth > 0) return;
  await new Promise<void>((resolve) => {
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => resolve(), { once: true });
  });
}

async function waitForRender(root: HTMLElement): Promise<void> {
  // Two rAF passes let React finish any pending paint.
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
  await document.fonts.ready;
  await Promise.all(
    Array.from(root.querySelectorAll('img')).map((image) => imageReady(image)),
  );
}

const OVERFLOW_TOLERANCE_PX = 2;

export interface ExportPdfResult {
  overflowedPages: number[];
}

export interface ExportPdfOptions {
  beforeCapture?: () => void | Promise<void>;
}

async function buildPdfBlob(
  options?: ExportPdfOptions,
): Promise<{ blob: Blob; overflowedPages: number[] }> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  if (options?.beforeCapture) await options.beforeCapture();

  const root = document.getElementById('pdf-export-root');
  if (!root)
    throw new Error('Nothing to export: the export surface is missing');

  const cage = document.createElement('div');
  cage.setAttribute('aria-hidden', 'true');
  cage.style.cssText = [
    'position:absolute',
    `top:${document.documentElement.scrollHeight + 400}px`,
    'left:0',
    `width:${SHEET_WIDTH}px`,
    'overflow:visible',
    'pointer-events:none',
    'z-index:-1',
  ].join(';');
  document.body.appendChild(cage);

  // Save the root's original position in the DOM so we can restore it.
  const prevParent = root.parentElement;
  const prevNextSib = root.nextSibling;

  // Save and override the root's inline positioning styles.
  const prevPosition = root.style.position;
  const prevTop = root.style.top;
  const prevLeft = root.style.left;
  const prevOpacity = root.style.opacity;
  const prevZIndex = root.style.zIndex;

  root.style.position = 'relative';
  root.style.top = '0px';
  root.style.left = '0px';
  root.style.opacity = '1';
  root.style.zIndex = 'auto';

  cage.appendChild(root);

  try {
    await waitForRender(root);

    const sheets = Array.from(
      root.querySelectorAll<HTMLElement>('[data-pdf-page]'),
    );
    if (sheets.length === 0) throw new Error('Nothing to export: no pages');

    const pdf = new jsPDF({
      unit: 'px',
      format: 'a4',
      orientation: 'portrait',
    });
    const pageWidth = pdf.internal.pageSize.getWidth();

    const overflowedPages: number[] = [];

    for (let index = 0; index < sheets.length; index += 1) {
      const sheet = sheets[index];
      if (!sheet) continue;

      const realHeight = sheet.getBoundingClientRect().height;
      if (realHeight > SHEET_MIN_HEIGHT + OVERFLOW_TOLERANCE_PX) {
        overflowedPages.push(index + 1);
      }

      const canvas = await html2canvas(sheet, {
        scale: 2,
        backgroundColor: '#FFFFFF',
        useCORS: true,
        allowTaint: false,
        logging: false,
        // No scrollX/scrollY needed — the cage is in the document flow so
        // html2canvas finds it via normal getBoundingClientRect offsets.
      });

      const imageData = canvas.toDataURL('image/png');
      const ratio = pageWidth / canvas.width;
      const imageHeight = canvas.height * ratio;

      if (index > 0) pdf.addPage();
      pdf.addImage(imageData, 'PNG', 0, 0, pageWidth, imageHeight);
      // Release canvas memory immediately.
      canvas.width = 0;
      canvas.height = 0;
    }

    return { blob: pdf.output('blob'), overflowedPages };
  } finally {
    // Always restore the root to its original place in the DOM and remove cage.
    root.style.position = prevPosition;
    root.style.top = prevTop;
    root.style.left = prevLeft;
    root.style.opacity = prevOpacity;
    root.style.zIndex = prevZIndex;

    if (prevParent) {
      prevParent.insertBefore(root, prevNextSib);
    }
    cage.remove();
  }
}

export async function exportActiveDocumentToPdf(
  fileName: string,
  options?: ExportPdfOptions,
): Promise<ExportPdfResult> {
  const safeName = fileName.trim().replace(/[^\w\-. ]+/g, '_') || 'document';
  const { blob, overflowedPages } = await buildPdfBlob(options);

  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${safeName}.pdf`,
        types: [
          {
            description: 'PDF document',
            accept: { 'application/pdf': ['.pdf'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { overflowedPages };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { overflowedPages };
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeName}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);

  return { overflowedPages };
}
