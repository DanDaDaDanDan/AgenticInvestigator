import fs from 'fs/promises';
import path from 'path';
import { parseMarkdown } from './parser.js';
import { generateHTML, generatePDF, generateHTMLPreview } from './generator.js';

/**
 * Convert a markdown file to a beautiful pageless PDF
 *
 * @param {string} inputPath - Path to the markdown file
 * @param {string} outputPath - Path for the output PDF (optional)
 * @param {object} options - Conversion options
 * @returns {Promise<object>} - Result of the conversion
 */
export async function convert(inputPath, outputPath = null, options = {}) {
  const {
    title = null,
    width = 816,
    htmlPreview = false
  } = options;

  // Resolve paths
  const resolvedInput = path.resolve(inputPath);

  // Generate output path if not provided
  let resolvedOutput;
  if (outputPath) {
    resolvedOutput = path.resolve(outputPath);
  } else {
    const dir = path.dirname(resolvedInput);
    const basename = path.basename(resolvedInput, path.extname(resolvedInput));
    resolvedOutput = path.join(dir, `${basename}.pdf`);
  }

  // Read the markdown file
  let content;
  try {
    content = await fs.readFile(resolvedInput, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read input file: ${error.message}`);
  }

  // Extract title from first H1 if not provided
  const documentTitle = title || extractTitle(content) || path.basename(resolvedInput, '.md');

  // Parse markdown to HTML
  const htmlContent = parseMarkdown(content);

  // Generate full HTML document
  const fullHTML = generateHTML(htmlContent, { title: documentTitle });

  // Generate HTML preview if requested
  if (htmlPreview) {
    const htmlPath = resolvedOutput.replace(/\.pdf$/i, '.html');
    await generateHTMLPreview(fullHTML, htmlPath);
  }

  // Generate PDF
  const result = await generatePDF(fullHTML, resolvedOutput, { width });

  return {
    ...result,
    inputPath: resolvedInput,
    title: documentTitle
  };
}

/**
 * Extract title from markdown content (first H1)
 */
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Convert markdown string directly to PDF
 */
export async function convertString(markdown, outputPath, options = {}) {
  const {
    title = 'Document',
    width = 816,
    htmlPreview = false
  } = options;

  const resolvedOutput = path.resolve(outputPath);

  // Extract title from content if not provided
  const documentTitle = title || extractTitle(markdown) || 'Document';

  // Parse markdown to HTML
  const htmlContent = parseMarkdown(markdown);

  // Generate full HTML document
  const fullHTML = generateHTML(htmlContent, { title: documentTitle });

  // Generate HTML preview if requested
  if (htmlPreview) {
    const htmlPath = resolvedOutput.replace(/\.pdf$/i, '.html');
    await generateHTMLPreview(fullHTML, htmlPath);
  }

  // Generate PDF
  const result = await generatePDF(fullHTML, resolvedOutput, { width });

  return {
    ...result,
    title: documentTitle
  };
}

export { parseMarkdown } from './parser.js';
export { generateHTML, generatePDF } from './generator.js';
export { styles } from './styles.js';
