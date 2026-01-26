import { GoogleGenAI } from '@google/genai';
import { retryWithBackoff, awaitWithHeartbeat } from './retry-utils';

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' });

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
  onProgress?: (stage: string, current: number, total: number) => void;
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

  // Create cached content using Gemini API with retry logic
  const cacheResponse = await retryWithBackoff(() =>
    genAI.caches.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: 'You are a documentation generator. This cached content contains a complete codebase for wiki generation.',
        contents: [{
          role: 'user',
          parts: [{ text: codebaseContent }]
        }],
        ttl: '3600s', // 1 hour cache
      }
    })
  );

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
  console.log('🔍 Plan Wiki Response:', responseText.substring(0, 500) + '...');

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
                   responseText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.error('❌ Failed to extract JSON from response:', responseText);
    throw new Error('Failed to extract JSON from AI response. The model output was not valid JSON.');
  }

  try {
    const plan = JSON.parse(jsonMatch[1] || jsonMatch[0]) as WikiPlan;
    return plan;
  } catch (e) {
    console.error('❌ Failed to parse JSON:', e);
    console.error('Raw JSON string:', jsonMatch[1] || jsonMatch[0]);
    throw new Error('Failed to parse wiki plan JSON.');
  }
}

/**
 * Topological sort for dependency ordering
 */
function topologicalSort(pages: WikiPage[]): WikiPage[] {
  const sorted: WikiPage[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();

  const pageMap = new Map(pages.map(p => [p.slug, p]));
  const brokenDeps = new Set<string>();

  function visit(slug: string, path: string[] = []) {
    if (temp.has(slug)) {
      // Circular dependency detected - break it by ignoring this dependency
      console.warn(`⚠️  Circular dependency detected: ${[...path, slug].join(' → ')}`);
      brokenDeps.add(slug);
      return;
    }
    if (visited.has(slug)) return;

    temp.add(slug);
    const page = pageMap.get(slug);
    if (page) {
      // Filter out dependencies that would create cycles
      const validDeps = page.dependsOn.filter(dep => !brokenDeps.has(dep));
      validDeps.forEach(dep => visit(dep, [...path, slug]));
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

  if (brokenDeps.size > 0) {
    console.warn(`🔧 Broke ${brokenDeps.size} circular dependencies:`, Array.from(brokenDeps));
  }

  return sorted;
}

/**
 * Group pages by dependency level for parallel generation
 * Level 0: No dependencies
 * Level 1: Only depends on level 0
 * Level 2: Depends on level 0 or 1, etc.
 */
function groupPagesByLevel(pages: WikiPage[]): WikiPage[][] {
  const pageMap = new Map(pages.map(p => [p.slug, p]));
  const levels: WikiPage[][] = [];
  const processed = new Set<string>();

  while (processed.size < pages.length) {
    const currentLevel: WikiPage[] = [];

    for (const page of pages) {
      if (processed.has(page.slug)) continue;

      // Check if all dependencies are processed
      const depsReady = page.dependsOn.every(dep => processed.has(dep) || !pageMap.has(dep));

      if (depsReady) {
        currentLevel.push(page);
      }
    }

    if (currentLevel.length === 0) {
      // Circular dependency or orphaned pages - add remaining pages
      const remaining = pages.filter(p => !processed.has(p.slug));
      if (remaining.length > 0) {
        console.warn('⚠️ Breaking circular dependencies for remaining pages:', remaining.map(p => p.slug));
        currentLevel.push(...remaining);
      }
    }

    currentLevel.forEach(p => processed.add(p.slug));
    levels.push(currentLevel);
  }

  return levels;
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

  const prompt = `SYSTEM INSTRUCTIONS: ${page.systemPrompt}

Generate the "${page.title}" wiki page.

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
 * Now returns a simple Promise - use generateWikiWithCacheStreaming for progress updates
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
    params.onProgress?.('Caching codebase context...', 0, 1);
    const cacheId = await createCodebaseCache(params);

    // Estimate cache size (rough)
    const codebaseSize = params.files.reduce((sum, f) => sum + f.content.length, 0);
    cacheTokens = Math.ceil(codebaseSize / 4); // Rough token estimate
    console.log(`✅ Cache created: ${cacheId} (~${cacheTokens} tokens)`);

    // Step 2: Plan wiki pages
    console.log('🎯 Planning wiki pages...');
    params.onProgress?.('Planning wiki structure...', 0, 1);
    const plan = await planWikiPages(cacheId, owner, repo);
    console.log(`📋 Planned ${plan.pages.length} pages:`, plan.pages.map(p => p.title).join(', '));

    // Step 3: Group pages by dependency level for parallel generation
    const pageLevels = groupPagesByLevel(plan.pages);
    console.log(`📊 Generation levels: ${pageLevels.map((level, i) => `L${i}(${level.length})`).join(' → ')}`);

    // Step 4: Generate pages in parallel by level
    const generatedPages = new Map<string, GeneratedPage>();
    const totalPages = plan.pages.length;
    let processedPages = 0;

    for (let levelIndex = 0; levelIndex < pageLevels.length; levelIndex++) {
      const level = pageLevels[levelIndex];
      console.log(`📝 Generating level ${levelIndex + 1}/${pageLevels.length} (${level.length} pages in parallel)...`);
      params.onProgress?.(`Generating level ${levelIndex + 1}/${pageLevels.length}`, processedPages, totalPages);

      // Generate all pages in this level in parallel
      const levelResults = await Promise.all(
        level.map(page => generateWikiPage(cacheId, page, generatedPages))
      );

      // Store results
      levelResults.forEach((generated) => {
        generatedPages.set(generated.slug, generated);
        processedPages++;

        // Track tokens (rough estimate since we're using cache)
        totalInputTokens += 500; // Prompt overhead
        totalOutputTokens += Math.ceil(generated.content.length / 4);
      });

      console.log(`✅ Level ${levelIndex + 1} complete: ${level.map(p => p.title).join(', ')}`);

      // Add a small delay between levels to help with rate limiting
      if (levelIndex < pageLevels.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
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

/**
 * Generate complete wiki using Gemini context caching - with streaming progress updates
 */
export async function* generateWikiWithCacheStreaming(
  params: Omit<WikiGeneratorParams, 'onProgress'>
): AsyncGenerator<{ type: 'progress' | 'complete' | 'ping', progress?: number, message?: string, result?: WikiGeneratorResult }> {
  const { owner, repo } = params;

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let cacheTokens = 0;

  try {
    // Step 1: Cache the entire codebase
    yield { type: 'progress', progress: 40, message: 'Analyizing codebase context & creating cache...' };
    
    // Use heartbeat for long running cache creation
    let cacheId = '';
    const cachePromise = createCodebaseCache(params);
    
    for await (const ping of awaitWithHeartbeat(cachePromise)) {
      if (ping.type === 'ping') {
        yield { type: 'ping' };
      }
    }
    cacheId = await cachePromise;

    // Estimate cache size (rough)
    const codebaseSize = params.files.reduce((sum, f) => sum + f.content.length, 0);
    cacheTokens = Math.ceil(codebaseSize / 4); // Rough token estimate
    console.log(`✅ Cache created: ${cacheId} (~${cacheTokens} tokens)`);

    // Step 2: Plan wiki pages
    yield { type: 'progress', progress: 50, message: 'Designing wiki structure & pages...' };
    
    // Use heartbeat for long running planning
    let plan: WikiPlan | null = null;
    const planPromise = planWikiPages(cacheId, owner, repo);
    
    for await (const ping of awaitWithHeartbeat(planPromise)) {
      if (ping.type === 'ping') {
        yield { type: 'ping' };
      }
    }
    plan = await planPromise;
    
    console.log(`📋 Planned ${plan.pages.length} pages:`, plan.pages.map(p => p.title).join(', '));

    // Step 3: Group pages by dependency level for parallel generation
    const pageLevels = groupPagesByLevel(plan.pages);
    console.log(`📊 Generation levels: ${pageLevels.map((level, i) => `L${i}(${level.length})`).join(' → ')}`);

    // Step 4: Generate pages in parallel by level (progress from 55% to 85%)
    const generatedPages = new Map<string, GeneratedPage>();
    const totalPages = plan.pages.length;
    let processedPages = 0;

    for (let levelIndex = 0; levelIndex < pageLevels.length; levelIndex++) {
      const level = pageLevels[levelIndex];

      // Show progress for this level
      // Scale from 55% to 85% based on completed pages
      const progressStart = 55;
      const progressRange = 30;
      const currentProgress = progressStart + Math.round((processedPages / totalPages) * progressRange);
      
      yield {
        type: 'progress',
        progress: currentProgress,
        message: `Generating content: ${level.length} page${level.length > 1 ? 's' : ''} in parallel (batch ${levelIndex + 1}/${pageLevels.length})...`
      };

      // Generate all pages in this level in parallel
      // Use heartbeat for generation too
      const generationPromise = Promise.all(
        level.map(page => generateWikiPage(cacheId, page, generatedPages))
      );
      
      for await (const ping of awaitWithHeartbeat(generationPromise)) {
        if (ping.type === 'ping') {
          yield { type: 'ping' };
        }
      }
      const levelResults = await generationPromise;

      // Store results
      levelResults.forEach((generated) => {
        generatedPages.set(generated.slug, generated);
        processedPages++;

        // Track tokens (rough estimate since we're using cache)
        totalInputTokens += 500; // Prompt overhead
        totalOutputTokens += Math.ceil(generated.content.length / 4);
      });

      console.log(`✅ Level ${levelIndex + 1} complete: ${level.map(p => p.title).join(', ')}`);

      // Add a small delay between levels to help with rate limiting
      if (levelIndex < pageLevels.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Wiki generation complete! ${generatedPages.size} pages created.`);

    yield {
      type: 'complete',
      result: {
        pages: Array.from(generatedPages.values()),
        usage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
          cacheTokens
        }
      }
    };

  } catch (error) {
    console.error('Wiki generation error:', error);
    throw error;
  }
}
