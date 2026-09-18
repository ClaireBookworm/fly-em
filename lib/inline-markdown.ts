import MarkdownIt from 'markdown-it';

// Copy fields live inside existing paragraphs/headings. Parse inline Markdown
// only, escape raw HTML, and retain markdown-it's safe link validation.
const markdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: false,
  typographer: false,
}).disable('image');

export function renderInlineMarkdown(source: string): string {
  return markdown.renderInline(source);
}
