declare module 'pdf-parse' {
  interface PDFInfo {
    Title?: string;
    Author?: string;
    CreationDate?: string;
    [key: string]: string | undefined;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: Record<string, unknown> | null;
    text: string;
    version: string;
  }

  interface PDFOptions {
    pagerender?: (pageData: { getTextContent: () => Promise<unknown> }) => Promise<string>;
    max?: number;
    version?: string;
  }

  function pdf(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;

  export = pdf;
}
