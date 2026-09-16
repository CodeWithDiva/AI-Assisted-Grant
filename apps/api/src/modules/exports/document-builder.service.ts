import { parseRichText, type RichBlock, type TextRun as Run } from '@grant/shared';
import { Injectable } from '@nestjs/common';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
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

const EMPTY: RichBlock[] = [
  { type: 'paragraph', runs: [{ text: '[This section is empty]', italic: true }] },
];

function blocksFor(text: string): RichBlock[] {
  const blocks = parseRichText(text);
  return blocks.length ? blocks : EMPTY;
}

/**
 * Turns a proposal into a Word or PDF file in the funder's section order, carrying over
 * bold, italic, bullet and numbered-list formatting from the section text.
 */
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

    // Each numbered list restarts at 1, which Word tracks through a numbering "instance".
    let listInstance = 0;

    for (const section of payload.sections) {
      children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }));

      for (const block of blocksFor(section.text)) {
        if (block.type === 'paragraph') {
          children.push(new Paragraph({ children: docxRuns(block.runs), spacing: { after: 160 } }));
        } else if (block.type === 'bullets') {
          for (const item of block.items) {
            children.push(new Paragraph({ children: docxRuns(item), bullet: { level: 0 } }));
          }
        } else {
          listInstance += 1;
          for (const item of block.items) {
            children.push(
              new Paragraph({
                children: docxRuns(item),
                numbering: { reference: 'numbered', level: 0, instance: listInstance },
              }),
            );
          }
        }
      }
      children.push(new Paragraph({ text: '' }));
    }

    const document = new Document({
      numbering: {
        config: [
          {
            reference: 'numbered',
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: '%1.',
                alignment: AlignmentType.START,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } },
              },
            ],
          },
        ],
      },
      sections: [{ children }],
    });
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
        doc.fontSize(11);

        for (const block of blocksFor(section.text)) {
          if (block.type === 'paragraph') {
            writeRuns(doc, block.runs);
          } else {
            block.items.forEach((item, itemIndex) => {
              writeListItem(doc, block.type === 'bullets' ? '•' : `${itemIndex + 1}.`, item);
            });
          }
          doc.moveDown(0.5);
        }
      });

      doc.end();
    });
  }
}

function docxRuns(runs: Run[]): TextRun[] {
  return runs.map((run) => new TextRun({ text: run.text, bold: run.bold, italics: run.italic }));
}

function pdfFont(run: Run): string {
  if (run.bold && run.italic) return 'Helvetica-BoldOblique';
  if (run.bold) return 'Helvetica-Bold';
  if (run.italic) return 'Helvetica-Oblique';
  return 'Helvetica';
}

/** pdfkit builds one flowing line from consecutive `continued` calls, switching font per run. */
function writeRuns(doc: PDFKit.PDFDocument, runs: Run[]): void {
  runs.forEach((run, index) => {
    doc.font(pdfFont(run)).text(run.text, { lineGap: 2, continued: index < runs.length - 1 });
  });
}

function writeListItem(doc: PDFKit.PDFDocument, marker: string, runs: Run[]): void {
  const left = doc.page.margins.left;
  const textX = left + 18;
  const width = doc.page.width - textX - doc.page.margins.right;
  const y = doc.y;

  doc.font('Helvetica').text(marker, left + 2, y, { lineBreak: false });

  const items = runs.length ? runs : [{ text: '' }];
  items.forEach((run, index) => {
    const options = { width, lineGap: 2, continued: index < items.length - 1 };
    doc.font(pdfFont(run));
    if (index === 0) doc.text(run.text, textX, y, options);
    else doc.text(run.text, options);
  });

  doc.x = left;
  doc.moveDown(0.15);
}
