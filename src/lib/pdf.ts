async function imageReady(image: HTMLImageElement): Promise<void> {
  if (image.complete)
    try {
      return await image.decode();
    } catch {
      return undefined;
    }
  return new Promise((resolve) => {
    const done = (): void => resolve();
    image.addEventListener('load', done, { once: true });
    image.addEventListener('error', done, { once: true });
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

export async function exportActiveDocumentToPdf(
  fileName: string,
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

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
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let index = 0; index < sheets.length; index += 1) {
    const sheet = sheets[index];
    if (!sheet) continue;

    const canvas = await html2canvas(sheet, {
      scale: 2,
      backgroundColor: '#FFFFFF',
      useCORS: true,
      logging: false,
    });

    const imageData = canvas.toDataURL('image/jpeg', 0.92);
    const ratio = pageWidth / canvas.width;
    const imageHeight = Math.min(canvas.height * ratio, pageHeight);

    if (index > 0) pdf.addPage();
    pdf.addImage(imageData, 'JPEG', 0, 0, pageWidth, imageHeight);
    canvas.width = 0;
    canvas.height = 0;
  }

  const safeName = fileName.trim().replace(/[^\w\-. ]+/g, '_') || 'document';
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeName}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
