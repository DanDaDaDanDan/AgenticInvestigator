import puppeteer from 'puppeteer';
import { styles } from './styles.js';

/**
 * Generate HTML document from parsed content
 */
export function generateHTML(content, options = {}) {
  const { title = 'Document' } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Source+Serif+Pro:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
  <style>${styles}</style>
</head>
<body>
${content}
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Generate a pageless PDF from HTML content
 */
export async function generatePDF(html, outputPath, options = {}) {
  const {
    width = 816, // 8.5 inches at 96 DPI
    margin = {
      top: '0px',
      right: '0px',
      bottom: '0px',
      left: '0px'
    },
    printBackground = true,
    scale = 1
  } = options;

  let browser = null;

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Set content and wait for fonts to load
    await page.setContent(html, {
      waitUntil: ['load', 'networkidle0']
    });

    // Wait a bit more for fonts to render properly
    await page.evaluate(() => document.fonts.ready);

    // Get the actual content height for pageless PDF
    const contentHeight = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );
    });

    // Generate PDF with dynamic height (pageless)
    await page.pdf({
      path: outputPath,
      width: `${width}px`,
      height: `${contentHeight + 1}px`, // +1 to avoid potential edge cases
      margin,
      printBackground,
      scale,
      preferCSSPageSize: false
    });

    return {
      success: true,
      outputPath,
      dimensions: {
        width,
        height: contentHeight
      }
    };

  } catch (error) {
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generate HTML preview (useful for debugging)
 */
export async function generateHTMLPreview(html, outputPath) {
  const fs = await import('fs').then(m => m.promises);
  await fs.writeFile(outputPath, html, 'utf-8');
  return { success: true, outputPath };
}
