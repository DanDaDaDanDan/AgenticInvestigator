/**
 * Kindle-style CSS for comfortable long-form reading
 */
export const styles = `
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --color-bg: #fffff8;
  --color-text: #232323;
  --color-text-secondary: #444444;
  --color-text-muted: #666666;
  --color-border: #dddddd;

  --font-serif: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  --text-sm: 0.85rem;
  --text-base: 1rem;
  --text-lg: 1.15rem;
  --text-xl: 1.3rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.85rem;
}

html {
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

body {
  font-family: var(--font-serif);
  font-size: var(--text-base);
  line-height: 1.6;
  color: var(--color-text);
  background-color: var(--color-bg);
  padding: 40px 50px;
  max-width: 100%;
}

/* ============================================
   HEADINGS
   ============================================ */
h1 {
  font-family: var(--font-serif);
  font-size: var(--text-3xl);
  font-weight: normal;
  line-height: 1.25;
  margin-bottom: 0.75rem;
  color: var(--color-text);
}

h1 + p:first-of-type {
  font-size: var(--text-base);
  font-style: italic;
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

h2 {
  font-family: var(--font-serif);
  font-size: var(--text-2xl);
  font-weight: normal;
  line-height: 1.3;
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
  color: var(--color-text);
}

h3 {
  font-family: var(--font-serif);
  font-size: var(--text-xl);
  font-weight: normal;
  font-style: italic;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

h4, h5, h6 {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

/* ============================================
   BODY TEXT
   ============================================ */
p {
  margin-bottom: 0.85rem;
  text-align: justify;
  hyphens: auto;
}

strong {
  font-weight: 600;
}

em {
  font-style: italic;
}

/* ============================================
   LINKS
   ============================================ */
a {
  color: var(--color-text);
  text-decoration: underline;
  text-decoration-color: var(--color-border);
  text-underline-offset: 2px;
}

/* ============================================
   LISTS
   ============================================ */
ul, ol {
  margin-bottom: 0.85rem;
  padding-left: 1.5rem;
}

li {
  margin-bottom: 0.3rem;
  line-height: 1.5;
  text-align: left;
}

li > ul, li > ol {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

ul { list-style-type: disc; }
ul ul { list-style-type: circle; }

/* ============================================
   BLOCKQUOTES
   ============================================ */
blockquote {
  margin: 1rem 0;
  margin-left: 1rem;
  margin-right: 1rem;
  padding-left: 1rem;
  border-left: 2px solid var(--color-border);
  font-style: italic;
  color: var(--color-text-secondary);
}

blockquote p {
  margin-bottom: 0.75rem;
  text-align: left;
}

blockquote p:last-child {
  margin-bottom: 0;
}

/* ============================================
   HORIZONTAL RULE
   ============================================ */
hr {
  border: none;
  text-align: center;
  margin: 1.5rem 0;
}

hr::before {
  content: "* * *";
  color: var(--color-text-muted);
  letter-spacing: 1em;
}

/* ============================================
   CODE
   ============================================ */
code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.9em;
  background-color: #f4f4f0;
  padding: 0.15em 0.35em;
  border-radius: 3px;
}

pre {
  margin: 0.85rem 0;
  padding: 0.75rem;
  background-color: #f4f4f0;
  border-radius: 4px;
  overflow-x: auto;
}

pre code {
  background: none;
  padding: 0;
  font-size: var(--text-sm);
  line-height: 1.6;
}

/* ============================================
   TABLES
   ============================================ */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.85rem 0;
  font-size: var(--text-sm);
}

th, td {
  padding: 0.4rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

th {
  font-weight: 600;
}

/* ============================================
   IMAGES
   ============================================ */
img {
  max-width: 100%;
  height: auto;
  margin: 0.85rem auto;
  display: block;
}

/* ============================================
   HEADINGS - Clear hierarchy
   ============================================ */
h2 {
  font-size: 1.5rem !important;
}

h3 {
  font-size: 1.2rem !important;
  font-style: normal !important;
  font-weight: 600 !important;
}

/* Word count at end */
p:last-child em:only-child {
  display: block;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  margin-top: 2rem;
}

/* ============================================
   CLEANUP
   ============================================ */
body > *:first-child {
  margin-top: 0;
}

body > *:last-child {
  margin-bottom: 0;
}
`;

export default styles;
