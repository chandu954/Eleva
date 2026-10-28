/** Load the PDF.js-backed parser only when the user chooses a PDF file. */
export async function extractPdfText(file: File): Promise<string> {
  const { default: pdfToText } = await import('react-pdftotext');
  return pdfToText(file);
}
