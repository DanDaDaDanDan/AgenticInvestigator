import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import anchor from 'markdown-it-anchor';
import taskLists from 'markdown-it-task-lists';

/**
 * Creates a configured markdown parser with syntax highlighting
 */
export function createParser() {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: (str, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return `<pre class="hljs"><code class="language-${lang}">${
            hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
          }</code></pre>`;
        } catch (err) {
          console.error('Highlight error:', err);
        }
      }
      // Auto-detect language if not specified
      try {
        const result = hljs.highlightAuto(str);
        return `<pre class="hljs"><code>${result.value}</code></pre>`;
      } catch (err) {
        return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
      }
    }
  });

  // Add anchor links to headings
  md.use(anchor, {
    permalink: false,
    slugify: (s) => s.toLowerCase().replace(/[^\w]+/g, '-')
  });

  // Add task list support
  md.use(taskLists, {
    enabled: true,
    label: true,
    labelAfter: true
  });

  return md;
}

/**
 * Parse markdown content to HTML
 */
export function parseMarkdown(content) {
  const parser = createParser();
  return parser.render(content);
}
