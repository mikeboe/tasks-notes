export interface ExtractionInput {
  type: 'url' | 'file';
  url?: string;
  fileBuffer?: Buffer;
  mimeType?: string;
  fileName?: string;
}

export interface ExtractionResult {
  markdown: string;
  metadata: {
    title?: string;
    extractionType: string;
    processingTime: number;
    sourceInfo?: any;
  };
}

export interface IContentExtractor {
  extract(input: ExtractionInput): Promise<ExtractionResult>;
  supports(input: ExtractionInput): boolean;
}

export class ContentExtractionService {
  private extractors: IContentExtractor[] = [];

  constructor(extractors?: IContentExtractor[]) {
    if (extractors) {
      this.extractors = extractors;
    }
  }

  registerExtractor(extractor: IContentExtractor): void {
    this.extractors.push(extractor);
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const extractor = this.selectExtractor(input);

    if (!extractor) {
      throw new Error('No suitable extractor found for this input type');
    }

    const startTime = Date.now();
    const result = await extractor.extract(input);
    result.metadata.processingTime = Date.now() - startTime;

    return result;
  }

  private selectExtractor(input: ExtractionInput): IContentExtractor | null {
    return this.extractors.find(e => e.supports(input)) || null;
  }
}
