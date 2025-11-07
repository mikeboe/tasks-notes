import { IContentExtractor, ExtractionInput, ExtractionResult } from './index';
import Firecrawl from '@mendable/firecrawl-js';

export class FirecrawlExtractor implements IContentExtractor {
  supports(input: ExtractionInput): boolean {
    return input.type === 'url';
  }

  async extract(input: ExtractionInput): Promise<ExtractionResult> {
    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    if (!input.url) {
      throw new Error('URL is required for Firecrawl extraction');
    }

    const firecrawl = new Firecrawl({ apiKey: firecrawlApiKey });

    const response = await firecrawl.scrape(input.url);



    if (!response) {

      throw new Error(`Firecrawl API error`);
    }

    return {
      markdown: response.markdown || '',
      metadata: {
        title: response.metadata?.title,
        extractionType: 'firecrawl',
        processingTime: 0, // Will be set by service
        sourceInfo: {
          url: input.url,
          statusCode: response.metadata?.statusCode,
        },
      },
    };
  }
}
