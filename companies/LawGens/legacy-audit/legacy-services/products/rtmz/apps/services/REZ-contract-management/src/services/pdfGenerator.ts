/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { Contract, IContract } from '../models/Contract';
import { logger } from '../utils/logger';

export interface PDFGenerationOptions {
  includeSignaturePage?: boolean;
  includeAuditTrail?: boolean;
  includePartyDetails?: boolean;
  pageSize?: 'Letter' | 'A4';
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface GeneratedPDF {
  filename: string;
  filepath: string;
  size: number;
}

export class PDFGeneratorService {
  private outputDir: string;

  constructor() {
    this.outputDir = process.env.PDF_OUTPUT_DIR || './generated-pdfs';
    this.ensureOutputDir();
  }

  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generateContractPDF(
    contractId: string,
    tenantId: string,
    options: PDFGenerationOptions = {}
  ): Promise<GeneratedPDF> {
    const contract = await Contract.findOne({ contractId, tenantId });
    if (!contract) {
      throw new Error(`Contract not found: ${contractId}`);
    }

    const filename = `${contractId}_${Date.now()}.pdf`;
    const filepath = path.join(this.outputDir, filename);

    const doc = new PDFDocument({
      size: options.pageSize || 'Letter',
      margins: options.margins || { top: 72, bottom: 72, left: 72, right: 72 },
      info: {
        Title: contract.title,
        Author: 'REZ Contract Management',
        Subject: `Contract: ${contract.type.toUpperCase()}`,
        Keywords: `contract, ${contract.type}, ${contract.parties.map(p => p.name).join(', ')}`,
        CreationDate: new Date()
      }
    });

    const writeStream = fs.createWriteStream(filepath);
    doc.pipe(writeStream);

    const includePartyDetails = options.includePartyDetails !== false;
    const includeSignaturePage = options.includeSignaturePage !== false;
    const includeAuditTrail = options.includeAuditTrail === true;

    this.addHeader(doc, contract);
    this.addContractContent(doc, contract);
    this.addPartyDetails(doc, contract, includePartyDetails);
    this.addTermsSection(doc, contract);
    this.addSignatureBlock(doc, contract, includeSignaturePage);
    if (includeAuditTrail) {
      this.addAuditTrail(doc, contract);
    }
    this.addFooter(doc, contract);

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        const stats = fs.statSync(filepath);
        logger.info(`PDF generated: ${filename}`, { contractId, size: stats.size });
        resolve({
          filename,
          filepath,
          size: stats.size
        });
      });
      writeStream.on('error', reject);
    });
  }

  private addHeader(doc: any, contract: IContract): void {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(contract.title, { align: 'center' })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`Contract ID: ${contract.contractId}`, { align: 'center' })
      .text(`Type: ${contract.type.toUpperCase()}`, { align: 'center' })
      .text(`Status: ${contract.status.replace('_', ' ').toUpperCase()}`, { align: 'center' })
      .moveDown(1);

    doc
      .fillColor('#000000')
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke('#cccccc')
      .moveDown(1);
  }

  private addContractContent(doc: any, contract: IContract): void {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Contract Content', { underline: true })
      .moveDown(0.5);

    doc
      .fontSize(11)
      .font('Helvetica');

    const content = contract.content || 'No content available.';
    const wrappedContent = this.wrapText(content, doc.page.width - doc.page.margins.left - doc.page.margins.right - 20);

    doc.text(wrappedContent, {
      align: 'justify',
      lineGap: 3
    });

    doc.moveDown(1.5);
  }

  private addPartyDetails(doc: any, contract: IContract, includeDetails: boolean): void {
    if (!includeDetails || !contract.parties.length) return;

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Parties', { underline: true })
      .moveDown(0.5);

    doc.fontSize(11).font('Helvetica');

    for (const party of contract.parties) {
      const signedDate = party.signedAt ? ` - Signed on ${new Date(party.signedAt).toLocaleDateString()}` : '';

      doc
        .font('Helvetica-Bold')
        .text(`${party.name}`, { continued: true });
      doc
        .font('Helvetica')
        .fillColor(party.signedAt ? '#28a745' : '#ffc107')
        .text(` (${party.role})${signedDate}`);
      doc
        .fillColor('#000000')
        .text(`Email: ${party.email}`, { indent: 20 })
        .moveDown(0.3);
    }

    doc.moveDown(1);
  }

  private addTermsSection(doc: any, contract: IContract): void {
    if (!contract.terms || contract.terms.length === 0) return;

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Terms & Conditions', { underline: true })
      .moveDown(0.5);

    doc.fontSize(11).font('Helvetica');

    contract.terms.forEach((term: string, index: number) => {
      doc.text(`${index + 1}. ${term}`);
      doc.moveDown(0.3);
    });

    doc.moveDown(1);
  }

  private addSignatureBlock(doc: any, contract: IContract, includeSignaturePage: boolean): void {
    if (includeSignaturePage === false) return;

    if (doc.y > doc.page.height - 250) {
      doc.addPage();
    }

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Signature Block', { underline: true })
      .moveDown(1);

    doc.fontSize(10).font('Helvetica');
    doc.fillColor('#666666');
    doc.text('By signing below, the parties agree to the terms and conditions outlined in this contract.');
    doc.fillColor('#000000');
    doc.moveDown(1.5);

    const signatureBoxWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right - 40) / 2;

    for (let i = 0; i < contract.parties.length; i += 2) {
      const leftParty = contract.parties[i];
      const rightParty = contract.parties[i + 1];

      const leftX = doc.page.margins.left;
      const rightX = doc.page.margins.left + signatureBoxWidth + 20;
      const y = doc.y;

      doc
        .font('Helvetica-Bold')
        .text(leftParty.name, leftX, y);
      doc
        .font('Helvetica')
        .text(`Date: _____________________`, leftX, y + 20)
        .text(`Signature: _____________________`, leftX, y + 40);

      if (rightParty) {
        doc
          .font('Helvetica-Bold')
          .text(rightParty.name, rightX, y);
        doc
          .font('Helvetica')
          .text(`Date: _____________________`, rightX, y + 20)
          .text(`Signature: _____________________`, rightX, y + 40);
      }

      doc.moveDown(3);
    }

    doc.moveDown(1);
  }

  private addAuditTrail(doc: any, contract: IContract): void {
    if (!contract.auditTrail || contract.auditTrail.length === 0) return;

    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Audit Trail', { underline: true })
      .moveDown(0.5);

    doc.fontSize(9).font('Helvetica');

    const auditData: string[][] = [
      ['Date/Time', 'Action', 'Performed By', 'Details'],
      ...contract.auditTrail.map((entry: { performedAt: Date; action: string; performedBy: string; details?: string }) => [
        new Date(entry.performedAt).toLocaleString(),
        entry.action,
        entry.performedBy,
        entry.details || '-'
      ])
    ];

    const tableTop = doc.y;
    const colWidths = [120, 80, 100, 200];

    doc.font('Helvetica-Bold').fontSize(9);
    let x = doc.page.margins.left;
    auditData[0].forEach((header: string, i: number) => {
      doc.text(header, x, tableTop, { width: colWidths[i] });
      x += colWidths[i];
    });

    doc.font('Helvetica').fontSize(8);
    auditData.slice(1).forEach((row: string[], rowIndex: number) => {
      let rowY = tableTop + 15 + (rowIndex * 12);
      let colX = doc.page.margins.left;

      row.forEach((cell: string, i: number) => {
        doc.text(String(cell).substring(0, 50), colX, rowY, { width: colWidths[i] });
        colX += colWidths[i];
      });
    });

    doc.moveDown(2);
  }

  private addFooter(doc: any, contract: IContract): void {
    const pageCount = doc.bufferedPageRange().count;

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      const footerY = doc.page.height - 50;

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#999999')
        .text(
          `Contract ID: ${contract.contractId} | Generated: ${new Date().toLocaleString()} | Page ${i + 1} of ${pageCount}`,
          doc.page.margins.left,
          footerY,
          {
            align: 'center',
            width: doc.page.width - doc.page.margins.left - doc.page.margins.right
          }
        );

      doc.text(
        'This is a computer-generated document. All signatures are electronic and legally binding.',
        doc.page.margins.left,
        footerY + 12,
        {
          align: 'center',
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right
        }
      );

      doc.fillColor('#000000');
    }
  }

  private wrapText(text: string, maxWidth: number): string {
    const words = text.split(' ');
    let result = '';
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = this.measureText(testLine);

      if (width > maxWidth && currentLine) {
        result += currentLine + '\n';
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      result += currentLine;
    }

    return result;
  }

  private measureText(text: string): number {
    return text.length * 5.5;
  }

  async generateContractPDFFromContent(
    content: string,
    title: string,
    contractId: string
  ): Promise<GeneratedPDF> {
    const filename = `${contractId}_${Date.now()}.pdf`;
    const filepath = path.join(this.outputDir, filename);

    const doc = new PDFDocument({
      size: 'Letter',
      margins: { top: 72, bottom: 72, left: 72, right: 72 }
    });

    const writeStream = fs.createWriteStream(filepath);
    doc.pipe(writeStream);

    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(title, { align: 'center' })
      .moveDown(2);

    doc
      .fontSize(11)
      .font('Helvetica')
      .text(content, {
        align: 'justify',
        lineGap: 3
      });

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        const stats = fs.statSync(filepath);
        resolve({
          filename,
          filepath,
          size: stats.size
        });
      });
      writeStream.on('error', reject);
    });
  }

  async deletePDF(filepath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        logger.info(`PDF deleted: ${filepath}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to delete PDF: ${filepath}`, { error });
      return false;
    }
  }

  getOutputDir(): string {
    return this.outputDir;
  }
}

export const pdfGenerator = new PDFGeneratorService();
