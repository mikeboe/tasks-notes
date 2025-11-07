import { Mistral } from '@mistralai/mistralai';
import { IContentExtractor, ExtractionInput, ExtractionResult } from './index';

export class MistralOCRExtractor implements IContentExtractor {
  private client: Mistral;

  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY not configured');
    }
    this.client = new Mistral({ apiKey });
  }

  supports(input: ExtractionInput): boolean {
    if (input.type !== 'file') return false;

    const mimeType = input.mimeType || '';
    return (
      mimeType.includes('pdf') ||
      mimeType.includes('image/jpeg') ||
      mimeType.includes('image/png') ||
      mimeType.includes('image/jpg')
    );
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    if (!input.fileBuffer) {
      throw new Error('File buffer is required for OCR extraction');
    }

    // Encode file to base64
    const base64File = input.fileBuffer.toString('base64');

    // Determine document type and create data URL
    let dataUrl: string;
    if (input.mimeType?.includes('pdf')) {
      dataUrl = `data:application/pdf;base64,${base64File}`;
    } else {
      dataUrl = `data:${input.mimeType};base64,${base64File}`;
    }

    try {
      // Call Mistral OCR API
      const ocrResponse = await this.client.ocr.process({
        model: "mistral-ocr-latest",
        document: {
          type: "document_url",
          documentUrl: dataUrl,
        },
        includeImageBase64: false, // Don't need images back
      });

      // Extract markdown from response
      const markdown = ocrResponse.pages
        ?.map(page => page.markdown || '')
        .filter(text => text.trim().length > 0)
        .join('\n\n---\n\n') || '';

      if (!markdown) {
        throw new Error('No text could be extracted from the document');
      }

      return {
        markdown,
        metadata: {
          title: input.fileName,
          extractionType: 'mistral-ocr',
          processingTime: 0, // Will be set by service
          sourceInfo: {
            mimeType: input.mimeType,
            pageCount: ocrResponse.pages?.length || 0,
          },
        },
      };
    } catch (error) {
      console.error('Mistral OCR error:', error);
      throw new Error(
        `OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
