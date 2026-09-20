import { SHEET_MIN_HEIGHT } from '@/lib/pagination';

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
  if (image.complete) return;
  await new Promise<void>((resolve) => {
    image.addEventListener('load', () => resolve(), { once: true });
    image.addEventListener('error', () => resolve(), { once: true });
  });
}

async function waitForRender(root: HTMLElement): Promise<void> {
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

  await waitForRender(root);

  const sheets = Array.from(
    root.querySelectorAll<HTMLElement>('[data-pdf-page]'),
  );
  if (sheets.length === 0) throw new Error('Nothing to export: no pages');

  const pdf = new jsPDF({ unit: 'px', format: 'a4', orientation: 'portrait' });
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
      logging: false,
      // The export surface is positioned above the viewport (top:-99999px) so
      // it stays invisible while rendering. We must tell html2canvas where the
      // element actually is; using the element's own bounding rect as the
      // scroll/window context lets it find and rasterize the content correctly.
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: -sheet.getBoundingClientRect().top,
      windowWidth: sheet.scrollWidth,
      windowHeight: sheet.scrollHeight,
    });

    const imageData = canvas.toDataURL('image/jpeg', 0.92);
    const ratio = pageWidth / canvas.width;

    const imageHeight = canvas.height * ratio;

    if (index > 0) pdf.addPage();
    pdf.addImage(imageData, 'JPEG', 0, 0, pageWidth, imageHeight);
    canvas.width = 0;
    canvas.height = 0;
  }

  return { blob: pdf.output('blob'), overflowedPages };
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
