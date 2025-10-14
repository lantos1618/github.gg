import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' });

// Example page types to guide AI planning
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

export interface WikiGeneratorParams {
  owner: string;
  repo: string;
  repoDescription?: string;
  primaryLanguage?: string;
  files: Array<{
    path: string;
    content: string;
    language: string;
    size: number;
  }>;
  packageJson?: Record<string, unknown>;
  readme?: string;
}

export interface WikiGeneratorResult {
  pages: GeneratedPage[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cacheTokens: number;
  };
}

/**
 * Create cached content for the entire codebase
 */
async function createCodebaseCache(params: WikiGeneratorParams): Promise<string> {
  const { owner, repo, repoDescription, primaryLanguage, files, packageJson, readme } = params;

  // Build complete codebase context
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

  // Create cached content using Gemini API
  const cacheResponse = await genAI.caches.create({
    model: 'gemini-2.0-flash-exp',
    config: {
      systemInstruction: 'You are a documentation generator. This cached content contains a complete codebase for wiki generation.',
      contents: [{
        role: 'user',
        parts: [{ text: codebaseContent }]
      }],
      ttl: '3600s', // 1 hour cache
    }
  });

  return cacheResponse.name || '';
}

/**
 * Plan wiki pages using cached context
 */
async function planWikiPages(
  cacheId: string,
  owner: string,
  repo: string
): Promise<WikiPlan> {
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

  const result = await genAI.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: prompt,
    config: {
      cachedContent: cacheId,
    }
  });
  const responseText = result.text || '';

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
                   responseText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from AI response');
  }

  const plan = JSON.parse(jsonMatch[1] || jsonMatch[0]) as WikiPlan;
  return plan;
}

/**
 * Topological sort for dependency ordering
 */
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

  // Sort by priority first (highest priority pages first if no dependencies)
  const sortedByPriority = [...pages].sort((a, b) => b.priority - a.priority);

  sortedByPriority.forEach(page => {
    if (!visited.has(page.slug)) {
      visit(page.slug);
    }
  });

  return sorted;
}

/**
 * Generate a single wiki page using cached context
 */
async function generateWikiPage(
  cacheId: string,
  page: WikiPage,
  generatedPages: Map<string, GeneratedPage>
): Promise<GeneratedPage> {
  // Build context from dependent pages
  const dependencyContext = page.dependsOn
    .map(slug => {
      const dep = generatedPages.get(slug);
      if (!dep) return '';
      return `## Content from "${dep.title}" (${dep.url})\n\n${dep.content}`;
    })
    .filter(Boolean)
    .join('\n\n---\n\n');

  const prompt = `Generate the "${page.title}" wiki page.

${dependencyContext ? `You can reference and build upon these already-generated pages:
${dependencyContext}

When referencing them, use markdown links: [${page.dependsOn.map(s => generatedPages.get(s)?.title).join(', ')}]
` : ''}

The entire codebase is in the cached context above. Use it to generate this page.

IMPORTANT: Return ONLY clean markdown. No JSON, no code blocks wrapping the markdown.
Start directly with the content.`;

  const result = await genAI.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: prompt,
    config: {
      systemInstruction: page.systemPrompt,
      cachedContent: cacheId,
    }
  });

  const content = result.text || '';

  // Extract summary from first paragraph
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

/**
 * Generate complete wiki using Gemini context caching
 */
export async function generateWikiWithCache(
  params: WikiGeneratorParams
): Promise<WikiGeneratorResult> {
  const { owner, repo } = params;

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let cacheTokens = 0;

  try {
    // Step 1: Cache the entire codebase
    console.log('📦 Creating codebase cache...');
    const cacheId = await createCodebaseCache(params);

    // Estimate cache size (rough)
    const codebaseSize = params.files.reduce((sum, f) => sum + f.content.length, 0);
    cacheTokens = Math.ceil(codebaseSize / 4); // Rough token estimate
    console.log(`✅ Cache created: ${cacheId} (~${cacheTokens} tokens)`);

    // Step 2: Plan wiki pages
    console.log('🎯 Planning wiki pages...');
    const plan = await planWikiPages(cacheId, owner, repo);
    console.log(`📋 Planned ${plan.pages.length} pages:`, plan.pages.map(p => p.title).join(', '));

    // Step 3: Sort pages by dependencies
    const sortedPages = topologicalSort(plan.pages);
    console.log('📊 Generation order:', sortedPages.map(p => p.title).join(' → '));

    // Step 4: Generate each page
    const generatedPages = new Map<string, GeneratedPage>();

    for (let i = 0; i < sortedPages.length; i++) {
      const page = sortedPages[i];
      console.log(`📝 Generating page ${i + 1}/${sortedPages.length}: ${page.title}...`);

      const generated = await generateWikiPage(cacheId, page, generatedPages);
      generatedPages.set(page.slug, generated);

      // Track tokens (rough estimate since we're using cache)
      totalInputTokens += 500; // Prompt overhead
      totalOutputTokens += Math.ceil(generated.content.length / 4);
    }

    console.log(`✅ Wiki generation complete! ${generatedPages.size} pages created.`);

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
