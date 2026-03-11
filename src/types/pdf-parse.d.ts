/**
 * Type declarations for pdf-parse v2 (class-based API).
 * pdf-parse v2 exports PDFParse as a class, not a callable function.
 */
declare module "pdf-parse" {
  interface PDFParseOptions {
    data?: Buffer | ArrayBuffer | Uint8Array;
    max?: number;
    version?: string;
  }

  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown> | null;
    text: string;
    version: string;
  }

  class PDFParse {
    constructor(options: PDFParseOptions);
    getText(): Promise<PDFParseResult>;
    destroy(): Promise<void>;
  }

  // Named exports from pdf-parse v2
  export { PDFParse };
  export class AbortException extends Error {}
  export class FormatError extends Error {}
  export class InvalidPDFException extends Error {}
  export class PasswordException extends Error {}
  export class UnknownErrorException extends Error {}
}
