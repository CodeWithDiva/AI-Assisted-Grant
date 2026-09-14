import { Injectable, UnsupportedMediaTypeException } from '@nestjs/common';
import mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';

const PDF = 'application/pdf';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Turns an uploaded RFP, past proposal or report into plain text the AI can read. */
@Injectable()
export class TextExtractionService {
  async extract(mimeType: string, contents: Buffer): Promise<string> {
    if (mimeType === PDF) return this.fromPdf(contents);
    if (mimeType === DOCX) return this.fromDocx(contents);
    if (mimeType.startsWith('text/')) return contents.toString('utf8').trim();
    throw new UnsupportedMediaTypeException(`Cannot read ${mimeType} files`);
  }

  private async fromPdf(contents: Buffer): Promise<string> {
    const pdf = await getDocumentProxy(new Uint8Array(contents));
    const { text } = await extractText(pdf, { mergePages: true });
    return text.trim();
  }

  private async fromDocx(contents: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer: contents });
    return result.value.trim();
  }
}
