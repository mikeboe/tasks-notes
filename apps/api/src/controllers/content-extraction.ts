import { Request, Response } from 'express';
import { ContentExtractionService } from '../services/content-extraction';
import { FirecrawlExtractor } from '../services/content-extraction/firecrawl-extractor';
import { MistralOCRExtractor } from '../services/content-extraction/mistral-ocr-extractor';

export const extractContent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { type, url } = req.body;
    const file = req.file;

    // Validate input
    if (!type || (type !== 'url' && type !== 'file')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid extraction type. Must be "url" or "file"',
      });
    }

    if (type === 'url' && !url) {
      return res.status(400).json({
        success: false,
        message: 'URL is required for URL extraction',
      });
    }

    if (type === 'file' && !file) {
      return res.status(400).json({
        success: false,
        message: 'File is required for file extraction',
      });
    }

    // Prepare extraction input
    const extractionInput = {
      type: type as 'url' | 'file',
      url: type === 'url' ? url : undefined,
      fileBuffer: type === 'file' ? file?.buffer : undefined,
      mimeType: type === 'file' ? file?.mimetype : undefined,
      fileName: type === 'file' ? file?.originalname : undefined,
    };

    // Initialize extractors
    const firecrawlExtractor = new FirecrawlExtractor();
    const mistralOCRExtractor = new MistralOCRExtractor();

    // Create extraction service with extractors
    const extractionService = new ContentExtractionService([
      firecrawlExtractor,
      mistralOCRExtractor,
    ]);

    // Extract content
    const result = await extractionService.extract(extractionInput);

    res.json({
      success: true,
      data: {
        markdown: result.markdown,
        metadata: result.metadata,
      },
    });
  } catch (error) {
    console.error('Content extraction error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Content extraction failed',
    });
  }
};
