import { Injectable } from '@nestjs/common';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import PDFDocument from 'pdfkit';

export interface ExportSection {
  title: string;
  text: string;
  wordLimit: number | null;
}

export interface ExportPayload {
  title: string;
  organizationName: string;
  funderName: string | null;
  sections: ExportSection[];
}

/** Turns a proposal into a Word or PDF file, keeping the funder's section order. */
@Injectable()
export class DocumentBuilderService {
  async toDocx(payload: ExportPayload): Promise<Buffer> {
    const children: Paragraph[] = [
      new Paragraph({ text: payload.title, heading: HeadingLevel.TITLE }),
      new Paragraph({
        children: [
          new TextRun({
            text: [payload.organizationName, payload.funderName].filter(Boolean).join(' — '),
            italics: true,
          }),
        ],
      }),
      new Paragraph({ text: '' }),
    ];

    for (const section of payload.sections) {
      children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }));
      for (const paragraph of splitParagraphs(section.text)) {
        children.push(new Paragraph({ text: paragraph }));
      }
      children.push(new Paragraph({ text: '' }));
    }

    const document = new Document({ sections: [{ children }] });
    return Packer.toBuffer(document);
  }

  async toPdf(payload: ExportPayload): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 56 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.font('Helvetica-Bold').fontSize(20).text(payload.title);
      doc
        .font('Helvetica-Oblique')
        .fontSize(11)
        .fillColor('#555555')
        .text([payload.organizationName, payload.funderName].filter(Boolean).join(' — '));
      doc.moveDown(1.2).fillColor('#000000');

      payload.sections.forEach((section, index) => {
        if (index > 0) doc.moveDown(1);
        doc.font('Helvetica-Bold').fontSize(13).text(section.title);
        doc.moveDown(0.4);
        doc.font('Helvetica').fontSize(11);
        for (const paragraph of splitParagraphs(section.text)) {
          doc.text(paragraph, { align: 'left', lineGap: 2 });
          doc.moveDown(0.5);
        }
      });

      doc.end();
    });
  }
}

function splitParagraphs(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return paragraphs.length ? paragraphs : ['[This section is empty]'];
}
