import { GoogleGenAI } from '@google/genai';
import type { WikiGeneratorParams, WikiGeneratorResult } from './wiki-generator';

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' });

// Helper function to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff for rate limits
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error as Error;

      // Check if it's a rate limit error (429)
      const isRateLimit = error &&
        typeof error === 'object' &&
        'status' in error &&
        error.status === 429;

      // Extract retry delay from error if available
      let retryDelay = initialDelayMs * Math.pow(2, attempt);

      if (isRateLimit && error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message);
        const retryMatch = message.match(/retry in ([0-9.]+)s/i);
        if (retryMatch) {
          retryDelay = Math.ceil(parseFloat(retryMatch[1]) * 1000);
        }
      }

      // Don't retry if not a rate limit error
      if (!isRateLimit) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        throw error;
      }

      console.log(`⏳ Rate limit hit, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${maxRetries})...`);
      await sleep(retryDelay);
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

const EXAMPLE_PAGE_TYPES = `
Common wiki page types you might want to create:

1. **Overview** - High-level introduction, purpose, key features
   - Use: readme_content, file_structure
   - Style: Narrative, beginner-friendly

2. **Getting Started** - Installation, setup, first steps
   - Use: readme_content, example files
   - Style: Step-by-step tutorial

3. **API Reference** - Function/class signatures, types
   - Use: Extract function signatures (NOT implementations)
   - Format: fn name(params): returnType // description
   - Style: Technical reference

4. **Architecture** - System design, component relationships
   - Use: file_structure, type definitions
   - Style: High-level diagrams and explanations

5. **Examples** - Practical usage patterns
   - Use: FULL example code with implementations
   - Style: Working code with explanations

6. **Configuration** - Setup options, environment variables
   - Use: Config files, .env examples
   - Style: Reference with examples

7. **Deployment** - How to deploy/build
   - Use: Package scripts, Dockerfile, CI configs
   - Style: Step-by-step guide

8. **Troubleshooting** - Common issues and solutions
   - Style: Problem/solution format

Choose the pages that make sense for THIS repository.
`;

interface WikiPage {
  title: string;
  slug: string;
  url: string;
  systemPrompt: string;
  dependsOn: string[];
  priority: number;
}

interface WikiPlan {
  pages: WikiPage[];
}

interface GeneratedPage {
  slug: string;
  title: string;
  content: string;
  url: string;
  summary: string;
}

interface ProgressUpdate {
  status: string;
  progress: number;
  message: string;
  currentPage?: string;
}

interface StreamingParams extends WikiGeneratorParams {
  onProgress?: (progress: ProgressUpdate) => void;
}

async function createCodebaseCache(
  params: WikiGeneratorParams,
  onProgress?: (progress: ProgressUpdate) => void
): Promise<string> {
  const { owner, repo, repoDescription, primaryLanguage, files, packageJson, readme } = params;

  onProgress?.({ status: 'caching', progress: 25, message: 'Creating codebase cache...' });

  const codebaseContent = `
# Repository: ${owner}/${repo}
${repoDescription ? `Description: ${repoDescription}` : ''}
${primaryLanguage ? `Primary Language: ${primaryLanguage}` : ''}

## README
${readme || 'No README available'}

## Package.json
${packageJson ? JSON.stringify(packageJson, null, 2) : 'No package.json'}

## File Tree
${files.map(f => f.path).join('\n')}

## All Files with Content

${files.map(f => `
### File: ${f.path}
Language: ${f.language}
Size: ${f.size} bytes

\`\`\`${f.language}
${f.content}
\`\`\`
`).join('\n---\n')}
`;

  const cacheResponse = await genAI.caches.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: 'You are a documentation generator. This cached content contains a complete codebase for wiki generation.',
      contents: [{
        role: 'user',
        parts: [{ text: codebaseContent }]
      }],
      ttl: '3600s',
    }
  });

  onProgress?.({ status: 'cached', progress: 30, message: 'Codebase cached successfully' });

  return cacheResponse.name || '';
}

async function planWikiPages(
  cacheId: string,
  owner: string,
  repo: string,
  onProgress?: (progress: ProgressUpdate) => void
): Promise<WikiPlan> {
  onProgress?.({ status: 'planning', progress: 35, message: 'Planning wiki structure...' });

  const prompt = `Using the cached codebase above, plan wiki pages for this repository.

${EXAMPLE_PAGE_TYPES}

For EACH page you want to create, specify:
- title: Clear page title
- slug: URL-friendly slug (lowercase, hyphens)
- url: Full wiki URL path (/wiki/${owner}/${repo}/{slug})
- systemPrompt: Detailed instructions for generating THIS specific page
  * What content to include
  * What format/style to use
  * Any special requirements (e.g., "show signatures only", "include full code examples")
- dependsOn: Array of page slugs this page should reference (empty array if none)
- priority: 1-10 (10 = highest, generate first)

IMPORTANT in systemPrompt:
- For API/Reference pages: "Extract ONLY function/class signatures. Format: fn name(params): returnType. NO implementations."
- For Example pages: "Include FULL working code with explanations."
- For Overview/Architecture: "High-level concepts, no code implementations."

Return ONLY valid JSON matching this structure:
{
  "pages": [
    {
      "title": "string",
      "slug": "string",
      "url": "string",
      "systemPrompt": "string",
      "dependsOn": ["string"],
      "priority": number
    }
  ]
}`;

  const result = await retryWithBackoff(() =>
    genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        cachedContent: cacheId,
      }
    })
  );
  const responseText = result.text || '';

  const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
                   responseText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from AI response');
  }

  const plan = JSON.parse(jsonMatch[1] || jsonMatch[0]) as WikiPlan;

  onProgress?.({ status: 'planned', progress: 40, message: `Planned ${plan.pages.length} pages` });

  return plan;
}

function topologicalSort(pages: WikiPage[]): WikiPage[] {
  const sorted: WikiPage[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();

  const pageMap = new Map(pages.map(p => [p.slug, p]));

  function visit(slug: string) {
    if (temp.has(slug)) {
      throw new Error(`Circular dependency detected: ${slug}`);
    }
    if (visited.has(slug)) return;

    temp.add(slug);
    const page = pageMap.get(slug);
    if (page) {
      page.dependsOn.forEach(dep => visit(dep));
      visited.add(slug);
      sorted.push(page);
    }
    temp.delete(slug);
  }

  const sortedByPriority = [...pages].sort((a, b) => b.priority - a.priority);

  sortedByPriority.forEach(page => {
    if (!visited.has(page.slug)) {
      visit(page.slug);
    }
  });

  return sorted;
}

async function generateWikiPage(
  cacheId: string,
  page: WikiPage,
  generatedPages: Map<string, GeneratedPage>,
  allPlannedPages: WikiPage[]
): Promise<GeneratedPage> {
  const dependencyContext = page.dependsOn
    .map(slug => {
      const dep = generatedPages.get(slug);
      if (!dep) return '';
      return `## Content from "${dep.title}" (${dep.url})\n\n${dep.content}`;
    })
    .filter(Boolean)
    .join('\n\n---\n\n');

  // Create a list of all planned pages for cross-referencing
  const pageDirectory = allPlannedPages
    .map(p => `- [${p.title}](${p.url}) - ${p.slug}`)
    .join('\n');

  const prompt = `SYSTEM INSTRUCTIONS: ${page.systemPrompt}

Generate the "${page.title}" wiki page.

## Available Wiki Pages for Cross-Referencing
You can link to these pages in your content using markdown links:
${pageDirectory}

Example: [See the API Reference](${allPlannedPages.find(p => p.slug.includes('api'))?.url || '/wiki/api-reference'})

When mentioning topics covered by other pages, ALWAYS add a link to that page.

${dependencyContext ? `You can reference and build upon these already-generated pages:
${dependencyContext}

When referencing them, use markdown links: [${page.dependsOn.map(s => generatedPages.get(s)?.title).join(', ')}]
` : ''}

The entire codebase is in the cached context above. Use it to generate this page.

IMPORTANT: Return ONLY clean markdown. No JSON, no code blocks wrapping the markdown.
Start directly with the content.`;

  const result = await retryWithBackoff(() =>
    genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        cachedContent: cacheId,
      }
    })
  );

  const content = result.text || '';

  const firstParagraph = content.split('\n\n').find(p => p.trim() && !p.startsWith('#'));
  const summary = firstParagraph ? firstParagraph.substring(0, 200) : page.title;

  return {
    slug: page.slug,
    title: page.title,
    content,
    url: page.url,
    summary
  };
}

export async function generateWikiWithCacheStreaming(
  params: StreamingParams
): Promise<WikiGeneratorResult> {
  const { owner, repo, onProgress } = params;

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let cacheTokens = 0;

  try {
    // Step 1: Cache codebase
    const cacheId = await createCodebaseCache(params, onProgress);

    const codebaseSize = params.files.reduce((sum, f) => sum + f.content.length, 0);
    cacheTokens = Math.ceil(codebaseSize / 4);

    // Step 2: Plan pages
    const plan = await planWikiPages(cacheId, owner, repo, onProgress);

    // Step 3: Sort pages
    const sortedPages = topologicalSort(plan.pages);

    onProgress?.({
      status: 'generating',
      progress: 45,
      message: `Generating ${sortedPages.length} pages...`
    });

    // Step 4: Generate each page with progress updates
    const generatedPages = new Map<string, GeneratedPage>();

    for (let i = 0; i < sortedPages.length; i++) {
      const page = sortedPages[i];
      const pageProgress = 45 + ((i / sortedPages.length) * 50);

      onProgress?.({
        status: 'generating_page',
        progress: pageProgress,
        message: `Generating "${page.title}" (${i + 1}/${sortedPages.length})`,
        currentPage: page.title,
      });

      try {
        const generated = await generateWikiPage(cacheId, page, generatedPages, sortedPages);
        generatedPages.set(page.slug, generated);

        totalInputTokens += 500;
        totalOutputTokens += Math.ceil(generated.content.length / 4);

        // Add small delay between pages to avoid rate limits
        // Only delay if not the last page
        if (i < sortedPages.length - 1) {
          await sleep(500); // 500ms delay between pages
        }
      } catch (error) {
        console.error(`Failed to generate page "${page.title}":`, error);

        // Check if it's a rate limit that couldn't be retried
        const isRateLimit = error &&
          typeof error === 'object' &&
          'status' in error &&
          error.status === 429;

        if (isRateLimit) {
          onProgress?.({
            status: 'rate_limited',
            progress: pageProgress,
            message: `Rate limit exceeded. Please wait a moment and try again.`,
          });
        }

        throw error;
      }
    }

    return {
      pages: Array.from(generatedPages.values()),
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        cacheTokens
      }
    };

  } catch (error) {
    console.error('Wiki generation error:', error);
    throw error;
  }
}
