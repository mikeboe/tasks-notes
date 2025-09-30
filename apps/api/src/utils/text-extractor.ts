interface BlockNoteBlock {
  id: string;
  type: string;
  props?: Record<string, any>;
  content?: Array<{
    type: string;
    text?: string;
    styles?: Record<string, any>;
  }>;
  children?: BlockNoteBlock[];
}

/**
 * Extracts plain text from BlockNote JSON content
 * @param contentJson - Stringified JSON content from BlockNote editor
 * @returns Plain text string for search indexing
 */
export function extractTextFromBlockNote(contentJson: string | null): string {
  if (!contentJson) return '';

  try {
    const blocks: BlockNoteBlock[] = JSON.parse(contentJson);
    return extractTextFromBlocks(blocks);
  } catch (error) {
    console.error('Error parsing BlockNote content:', error);
    return '';
  }
}

/**
 * Recursively extracts text from BlockNote blocks
 */
function extractTextFromBlocks(blocks: BlockNoteBlock[]): string {
  const textParts: string[] = [];

  for (const block of blocks) {
    // Extract text from block content
    if (block.content && Array.isArray(block.content)) {
      for (const contentItem of block.content) {
        if (contentItem.text) {
          textParts.push(contentItem.text);
        }
      }
    }

    // Recursively extract text from children
    if (block.children && Array.isArray(block.children)) {
      const childText = extractTextFromBlocks(block.children);
      if (childText) {
        textParts.push(childText);
      }
    }

    // Add special handling for different block types if needed
    if (block.type === 'heading' || block.type === 'paragraph') {
      // Add extra spacing after headings and paragraphs
      textParts.push(' ');
    }
  }

  return textParts.join(' ').trim();
}

/**
 * Creates a search context snippet around a found term
 * @param text - Full text content
 * @param searchTerm - Term that was searched for
 * @param contextLength - Number of characters to show before/after (default: 50)
 * @returns Context snippet with highlighted search term
 */
export function createSearchContext(
  text: string, 
  searchTerm: string, 
  contextLength: number = 50
): string {
  if (!text || !searchTerm) return '';

  const lowerText = text.toLowerCase();
  const lowerSearchTerm = searchTerm.toLowerCase();
  const index = lowerText.indexOf(lowerSearchTerm);

  if (index === -1) return '';

  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + searchTerm.length + contextLength);

  let context = text.substring(start, end);
  
  // Add ellipsis if we're not at the beginning/end
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';

  return context;
}