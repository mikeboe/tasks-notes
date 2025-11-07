/**
 * Converts markdown text to BlockNote blocks
 * Uses a simplified approach that creates basic block structures
 * that BlockNote can handle properly.
 */
export function parseMarkdownToBlocks(markdown: string): any[] {
  const blocks: any[] = [];
  const lines = markdown.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines
    if (trimmedLine === '') {
      i++;
      continue;
    }

    // Headers (# to ######)
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = Math.min(headerMatch[1].length, 3); // BlockNote supports 1-3
      blocks.push({
        type: 'heading',
        props: {
          level: level,
        },
        content: [{ type: 'text', text: headerMatch[2] }],
        children: [],
      });
      i++;
      continue;
    }

    // Code blocks (```)
    if (trimmedLine.startsWith('```')) {
      const language = trimmedLine.substring(3).trim() || 'plaintext';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'codeBlock',
        props: {
          language: language,
        },
        content: [{ type: 'text', text: codeLines.join('\n') }],
        children: [],
      });
      i++; // Skip closing ```
      continue;
    }

    // Horizontal rule
    if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
      blocks.push({
        type: 'paragraph',
        content: [{ type: 'text', text: '─'.repeat(50) }],
        children: [],
      });
      i++;
      continue;
    }

    // Bullet list items
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (bulletMatch) {
      blocks.push({
        type: 'bulletListItem',
        content: parseInlineMarkdown(bulletMatch[2]),
        children: [],
      });
      i++;
      continue;
    }

    // Numbered list items
    const numberedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (numberedMatch) {
      blocks.push({
        type: 'numberedListItem',
        content: parseInlineMarkdown(numberedMatch[2]),
        children: [],
      });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      blocks.push({
        type: 'paragraph',
        content: parseInlineMarkdown(line.substring(2)),
        children: [],
      });
      i++;
      continue;
    }

    // Regular paragraph - collect multiple lines until empty line
    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' &&
           !lines[i].match(/^#{1,6}\s/) &&
           !lines[i].trim().startsWith('```') &&
           !lines[i].match(/^(\s*)[-*+]\s/) &&
           !lines[i].match(/^(\s*)\d+\.\s/)) {
      paragraphLines.push(lines[i]);
      i++;
    }

    if (paragraphLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        content: parseInlineMarkdown(paragraphLines.join(' ')),
        children: [],
      });
    }
  }

  // If no blocks were created, add an empty paragraph
  if (blocks.length === 0) {
    blocks.push({
      type: 'paragraph',
      content: [],
      children: [],
    });
  }

  return blocks;
}

/**
 * Parse inline markdown (bold, italic, code, links)
 */
function parseInlineMarkdown(text: string): any[] {
  const content: any[] = [];

  // Simple approach: just return the text as-is for now
  // BlockNote will handle the rendering
  // A more advanced implementation would parse **bold**, *italic*, `code`, [links](url)

  // For now, let's do a simple implementation that handles basic formatting
  let currentText = '';
  let i = 0;

  while (i < text.length) {
    // Check for bold (**text**)
    if (text.substring(i, i + 2) === '**') {
      if (currentText) {
        content.push({ type: 'text', text: currentText, styles: {} });
        currentText = '';
      }
      const endIndex = text.indexOf('**', i + 2);
      if (endIndex !== -1) {
        content.push({
          type: 'text',
          text: text.substring(i + 2, endIndex),
          styles: { bold: true }
        });
        i = endIndex + 2;
        continue;
      }
    }

    // Check for italic (*text*)
    if (text[i] === '*' && text[i + 1] !== '*') {
      if (currentText) {
        content.push({ type: 'text', text: currentText, styles: {} });
        currentText = '';
      }
      const endIndex = text.indexOf('*', i + 1);
      if (endIndex !== -1 && text[endIndex + 1] !== '*') {
        content.push({
          type: 'text',
          text: text.substring(i + 1, endIndex),
          styles: { italic: true }
        });
        i = endIndex + 1;
        continue;
      }
    }

    // Check for inline code (`code`)
    if (text[i] === '`') {
      if (currentText) {
        content.push({ type: 'text', text: currentText, styles: {} });
        currentText = '';
      }
      const endIndex = text.indexOf('`', i + 1);
      if (endIndex !== -1) {
        content.push({
          type: 'text',
          text: text.substring(i + 1, endIndex),
          styles: { code: true }
        });
        i = endIndex + 1;
        continue;
      }
    }

    currentText += text[i];
    i++;
  }

  if (currentText) {
    content.push({ type: 'text', text: currentText, styles: {} });
  }

  return content.length > 0 ? content : [{ type: 'text', text: '', styles: {} }];
}
