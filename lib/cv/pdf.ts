import 'server-only';

/**
 * PDF -> text.
 *
 * Safety: parsing happens in-process with pdf.js (no shelling out, no code
 * execution from the document). Encrypted, image-only and malformed files are
 * reported as errors rather than silently returning empty text.
 */

export const MAX_CV_BYTES = 5 * 1024 * 1024; // 5 MB, per spec
export const ACCEPTED_MIME = 'application/pdf';

export interface PdfExtractResult {
  text: string;
  pageCount: number;
  ok: boolean;
  error: string | null;
}

/** Rejects anything that is not a PDF before we try to parse it. */
export function validateUpload(input: {
  size: number;
  type: string;
  filename: string;
}): string | null {
  if (input.size === 0) return 'The file is empty.';
  if (input.size > MAX_CV_BYTES) return 'The file is larger than 5 MB.';
  if (input.type && input.type !== ACCEPTED_MIME) return 'Only PDF files are accepted.';
  if (!/\.pdf$/i.test(input.filename)) return 'The file must have a .pdf extension.';
  return null;
}

/**
 * True when the bytes start with the PDF file header.
 * A declared content-type is a claim; the header is the evidence.
 */
export function hasPdfMagicBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d // -
  );
}

export async function extractPdfText(buffer: ArrayBuffer): Promise<PdfExtractResult> {
  const bytes = new Uint8Array(buffer);
  if (!hasPdfMagicBytes(bytes)) {
    return {
      text: '',
      pageCount: 0,
      ok: false,
      error: 'This file is not a PDF. Only PDF files are accepted.',
    };
  }

  try {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text, totalPages } = await extractText(pdf, { mergePages: true });

    const cleaned = (Array.isArray(text) ? text.join('\n') : (text ?? ''))
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (cleaned.length === 0) {
      return {
        text: '',
        pageCount: totalPages ?? 0,
        ok: false,
        error:
          'No text could be read from this PDF. It may be a scanned image — please paste your experience as text instead.',
      };
    }

    return { text: cleaned, pageCount: totalPages ?? 0, ok: true, error: null };
  } catch (error) {
    return {
      text: '',
      pageCount: 0,
      ok: false,
      error:
        error instanceof Error && /password|encrypt/i.test(error.message)
          ? 'This PDF is password protected.'
          : 'This PDF could not be read.',
    };
  }
}
