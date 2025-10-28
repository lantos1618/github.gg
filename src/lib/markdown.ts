import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import rehypeShiki from '@shikijs/rehype';

export interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * Converts markdown to HTML on the server with syntax highlighting
 * @param markdown - The markdown content to render
 * @returns Promise containing HTML string and extracted headings
 */
export async function renderMarkdownToHtml(markdown: string): Promise<{
  html: string;
  headings: Heading[];
}> {
  const headings: Heading[] = [];

  // Process markdown to HTML
  const file = await unified()
    .use(remarkParse) // Parse markdown to AST
    .use(remarkGfm) // Support GitHub Flavored Markdown (tables, strikethrough, etc.)
    .use(() => (tree) => {
      // Extract headings during AST traversal
      const visit = (node: any) => {
        if (node.type === 'heading' && node.depth <= 4) {
          const text = extractTextFromNode(node);
          const id = createHeadingId(text);

          headings.push({
            id,
            text,
            level: node.depth,
          });

          // Add id to heading node for HTML output
          node.data = node.data || {};
          node.data.hProperties = { id };
        }

        if (node.children) {
          node.children.forEach(visit);
        }
      };

      visit(tree);
      return tree;
    })
    .use(remarkRehype, { allowDangerousHtml: true }) // Convert to HTML AST
    .use(rehypeRaw) // Parse raw HTML in markdown
    .use(rehypeShiki, {
      // Use Shiki for syntax highlighting
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: 'dark',
    })
    .use(rehypeStringify) // Convert to HTML string
    .process(markdown);

  return {
    html: String(file),
    headings,
  };
}

/**
 * Extract plain text from a node (recursive)
 */
function extractTextFromNode(node: any): string {
  if (node.type === 'text') {
    return node.value;
  }
  if (node.children) {
    return node.children.map(extractTextFromNode).join('');
  }
  return '';
}

/**
 * Create URL-safe heading ID from text
 */
function createHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
