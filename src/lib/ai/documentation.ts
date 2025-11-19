import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

// Partial documentation schema for chunks
const partialDocumentationSchema = z.object({
  components: z.array(z.object({
    name: z.string(),
    type: z.enum(['module', 'class', 'function', 'component', 'service', 'util']),
    description: z.string(),
    location: z.string(),
    purpose: z.string(),
    keyMethods: z.array(z.object({
      name: z.string(),
      description: z.string(),
      parameters: z.string().optional(),
      returns: z.string().optional(),
    })).optional(),
    dependencies: z.array(z.string()).optional(),
  })),
  apiEndpoints: z.array(z.object({
    endpoint: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    description: z.string(),
  })),
  observations: z.string().describe('Key observations about this chunk of code'),
});

const documentationSchema = z.object({
  overview: z.object({
    summary: z.string().describe('High-level summary of what the codebase does'),
    purpose: z.string().describe('The main purpose and goals of the project'),
    architecture: z.string().describe('Brief architecture overview'),
    keyFeatures: z.array(z.string()).describe('List of key features and capabilities'),
  }),
  gettingStarted: z.object({
    prerequisites: z.array(z.string()),
    installation: z.string().describe('Step-by-step installation instructions'),
    quickStart: z.string().describe('Quick start guide with examples'),
    configuration: z.string().describe('Configuration and setup details'),
  }),
  architecture: z.object({
    structure: z.string().describe('Project structure and organization'),
    patterns: z.array(z.string()).describe('Design patterns and architectural decisions'),
    dataFlow: z.string().describe('How data flows through the system'),
    dependencies: z.array(z.object({
      name: z.string(),
      purpose: z.string(),
      critical: z.boolean(),
    })),
  }),
  components: z.array(z.object({
    name: z.string(),
    type: z.enum(['module', 'class', 'function', 'component', 'service', 'util']),
    description: z.string(),
    location: z.string().describe('File path'),
    purpose: z.string(),
    keyMethods: z.array(z.object({
      name: z.string(),
      description: z.string(),
      parameters: z.string().optional(),
      returns: z.string().optional(),
    })).optional(),
    dependencies: z.array(z.string()).optional(),
    examples: z.string().optional(),
  })),
  apiReference: z.array(z.object({
    endpoint: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    description: z.string(),
    parameters: z.array(z.object({
      name: z.string(),
      type: z.string(),
      required: z.boolean(),
      description: z.string(),
    })),
    response: z.string(),
    example: z.string(),
  })),
  bestPractices: z.object({
    codeStyle: z.array(z.string()),
    testing: z.string(),
    deployment: z.string(),
    security: z.array(z.string()),
    performance: z.array(z.string()),
  }),
  troubleshooting: z.array(z.object({
    issue: z.string(),
    solution: z.string(),
    preventive: z.string().optional(),
  })),
  examples: z.array(z.object({
    title: z.string(),
    description: z.string(),
    code: z.string(),
    explanation: z.string(),
  })),
  contributing: z.object({
    guidelines: z.string(),
    workflow: z.string(),
    codeReview: z.string(),
    testing: z.string(),
  }),
});

export type DocumentationResult = z.infer<typeof documentationSchema>;

export interface DocumentationParams {
  repoName: string;
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
  useChunking?: boolean; // Enable chunking for massive repos
  tokensPerChunk?: number; // Target tokens per chunk (default: 800k, Gemini 2.5 Pro max: 1M input)
}

/**
 * Estimate token count from text
 * Approximation: 1 token ≈ 4 characters (rough average for code)
 * Gemini 2.5 Pro limits: 1M input tokens, 32k output tokens
 *
 * We chunk at 800k tokens to leave headroom for:
 * - Prompt structure and instructions (~50k tokens)
 * - README/package.json content (~50k tokens)
 * - Output generation (32k tokens)
 * - Safety buffer (68k tokens)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface DocumentationResponse {
  documentation: DocumentationResult;
  markdown: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Analyze a chunk of files and return partial documentation
 */
async function analyzeChunk(
  files: Array<{ path: string; content: string; language: string; size: number }>,
  chunkIndex: number,
  totalChunks: number,
  repoName: string
) {
  const fileContents = files.map(f => `
// ${f.path} (${f.language}, ${f.size} bytes)
${f.content.slice(0, 2000)} // Truncated if too long
`).join('\n\n');

  const prompt = `You are analyzing chunk ${chunkIndex + 1} of ${totalChunks} for repository: ${repoName}

IMPORTANT: This is CHUNK ${chunkIndex + 1}/${totalChunks}. Focus on documenting the components and APIs in THIS chunk only.

CODEBASE FILES IN THIS CHUNK:
${fileContents}

Extract and document:
1. All components, classes, functions, modules in these files
2. Any API endpoints or routes defined in these files
3. Key observations about the code patterns and architecture in this chunk

Your response must be a valid JSON object following the schema provided.`;

  const { object, usage } = await generateObject({
    model: google('models/gemini-3-pro-preview'),
    schema: partialDocumentationSchema,
    messages: [{ role: 'user', content: prompt }],
  });

  return { result: object, usage };
}

/**
 * Stitch together all chunk analyses into final comprehensive documentation
 */
async function stitchChunks(
  chunkResults: Array<z.infer<typeof partialDocumentationSchema>>,
  repoName: string,
  repoDescription?: string,
  primaryLanguage?: string,
  packageJson?: Record<string, unknown>,
  readme?: string
) {
  const allComponents = chunkResults.flatMap(chunk => chunk.components);
  const allApiEndpoints = chunkResults.flatMap(chunk => chunk.apiEndpoints);
  const allObservations = chunkResults.map((chunk, i) => `Chunk ${i + 1}: ${chunk.observations}`).join('\n\n');

  const prompt = `You are an expert technical writer creating final comprehensive documentation by analyzing chunked results.

REPOSITORY INFORMATION:
Repository: ${repoName}
${repoDescription ? `Description: ${repoDescription}` : ''}
${primaryLanguage ? `Primary Language: ${primaryLanguage}` : ''}

${readme ? `EXISTING README:
${readme.slice(0, 2000)}

` : ''}${packageJson ? `PACKAGE.JSON:
${JSON.stringify(packageJson, null, 2).slice(0, 1000)}

` : ''}ANALYZED COMPONENTS (${allComponents.length} total):
${JSON.stringify(allComponents.slice(0, 50), null, 2)}

API ENDPOINTS (${allApiEndpoints.length} total):
${JSON.stringify(allApiEndpoints, null, 2)}

OBSERVATIONS FROM ALL CHUNKS:
${allObservations}

REQUIREMENTS:
- Generate comprehensive, unified documentation from the chunked analysis
- Create a coherent overview that ties all components together
- Provide architectural insights based on all observed patterns
- Include practical examples and getting started guide
- Make sure the documentation flows naturally as a single document
- Fill in any gaps by inferring from the component relationships
- Use clear, concise language

Generate complete structured documentation that covers:
1. Overview and purpose
2. Getting started guide
3. Architecture and design patterns
4. Component/module documentation (synthesized from chunks)
5. API reference (synthesized from chunks)
6. Best practices
7. Troubleshooting
8. Code examples
9. Contributing guidelines

Your response must be a valid JSON object following the schema provided.`;

  const { object, usage } = await generateObject({
    model: google('models/gemini-3-pro-preview'),
    schema: documentationSchema,
    messages: [{ role: 'user', content: prompt }],
  });

  return { result: object, usage };
}

/**
 * Generate comprehensive documentation from a codebase
 */
export async function generateDocumentation({
  repoName,
  repoDescription,
  primaryLanguage,
  files,
  packageJson,
  readme,
  useChunking = false,
  tokensPerChunk = 800000, // 800k tokens per chunk (Gemini 2.5 Pro: 1M context window)
}: DocumentationParams): Promise<DocumentationResponse> {
  try {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Estimate total tokens
    const totalEstimatedTokens = files.reduce((sum, f) => {
      const content = f.content.slice(0, 2000);
      return sum + estimateTokens(content) + estimateTokens(f.path);
    }, 0);

    // Decide whether to use chunking (if estimated tokens > tokensPerChunk)
    const shouldChunk = useChunking && totalEstimatedTokens > tokensPerChunk;

    if (shouldChunk) {
      console.log(`🔄 Using token-based chunking: ${totalEstimatedTokens} estimated tokens, ~${Math.ceil(totalEstimatedTokens / tokensPerChunk)} chunks`);

      // Split files into token-based chunks
      const chunks: Array<Array<typeof files[0]>> = [];
      let currentChunk: Array<typeof files[0]> = [];
      let currentChunkTokens = 0;

      for (const file of files) {
        const content = file.content.slice(0, 2000);
        const fileTokens = estimateTokens(content) + estimateTokens(file.path);

        // If adding this file would exceed the limit, start a new chunk
        if (currentChunkTokens + fileTokens > tokensPerChunk && currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = [file];
          currentChunkTokens = fileTokens;
        } else {
          currentChunk.push(file);
          currentChunkTokens += fileTokens;
        }
      }

      // Add the last chunk if it has files
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }

      // Analyze each chunk
      const chunkResults: Array<z.infer<typeof partialDocumentationSchema>> = [];
      for (let i = 0; i < chunks.length; i++) {
        console.log(`📝 Analyzing chunk ${i + 1}/${chunks.length} (${chunks[i].length} files)...`);
        const { result, usage } = await analyzeChunk(chunks[i], i, chunks.length, repoName);
        chunkResults.push(result);
        totalInputTokens += usage.inputTokens || 0;
        totalOutputTokens += usage.outputTokens || 0;
      }

      // Stitch all chunks together
      console.log(`🧵 Stitching ${chunks.length} chunks together into final documentation...`);
      const { result, usage } = await stitchChunks(
        chunkResults,
        repoName,
        repoDescription,
        primaryLanguage,
        packageJson,
        readme
      );
      totalInputTokens += usage.inputTokens || 0;
      totalOutputTokens += usage.outputTokens || 0;

      const markdown = formatDocumentationAsMarkdown(result, repoName);

      console.log(`✅ Chunked documentation complete! Total tokens: ${totalInputTokens + totalOutputTokens}`);

      return {
        documentation: result,
        markdown,
        usage: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
        },
      };
    }

    // Original non-chunked path
    console.log(`📝 Generating documentation without chunking (${files.length} files)`);
    const fileContents = files
      .slice(0, 50) // Limit to 50 files to avoid token limits
      .map(f => `
// ${f.path} (${f.language}, ${f.size} bytes)
${f.content.slice(0, 2000)} // Truncated if too long
`)
      .join('\n\n');

    const prompt = `You are an expert technical writer and software architect. Analyze this codebase and generate comprehensive, professional documentation.

REPOSITORY INFORMATION:
Repository: ${repoName}
${repoDescription ? `Description: ${repoDescription}` : ''}
${primaryLanguage ? `Primary Language: ${primaryLanguage}` : ''}

${readme ? `EXISTING README:
${readme.slice(0, 2000)}

` : ''}${packageJson ? `PACKAGE.JSON:
${JSON.stringify(packageJson, null, 2).slice(0, 1000)}

` : ''}CODEBASE FILES:
${fileContents}

REQUIREMENTS:
- Generate comprehensive, accurate, and professional documentation
- Focus on what the code actually does, not assumptions
- Include practical examples and use cases
- Explain architectural decisions and patterns
- Provide clear API references with parameters and return types
- Include troubleshooting for common issues
- Add best practices specific to this codebase
- Make it beginner-friendly while being thorough for advanced users
- Use clear, concise language
- Include code examples where helpful

Generate structured documentation that covers:
1. Overview and purpose
2. Getting started guide
3. Architecture and design patterns
4. Component/module documentation
5. API reference (if applicable)
6. Best practices
7. Troubleshooting
8. Code examples
9. Contributing guidelines

Your response must be a valid JSON object following the schema provided.`;

    const { object, usage } = await generateObject({
      model: google('models/gemini-3-pro-preview'),
      schema: documentationSchema,
      messages: [
        { role: 'user', content: prompt },
      ],
    });

    const markdown = formatDocumentationAsMarkdown(object, repoName);

    return {
      documentation: object,
      markdown,
      usage: {
        inputTokens: usage.inputTokens || 0,
        outputTokens: usage.outputTokens || 0,
        totalTokens: (usage.inputTokens || 0) + (usage.outputTokens || 0),
      },
    };
  } catch (error) {
    console.error('Documentation generation error:', error);
    throw error;
  }
}

/**
 * Format documentation as markdown
 */
function formatDocumentationAsMarkdown(doc: DocumentationResult, repoName: string): string {
  return `# 📚 ${repoName} Documentation

> Auto-generated comprehensive documentation powered by AI

---

## 📖 Overview

### Summary
${doc.overview.summary}

### Purpose
${doc.overview.purpose}

### Key Features
${doc.overview.keyFeatures.map(f => `- ${f}`).join('\n')}

### Architecture
${doc.overview.architecture}

---

## 🚀 Getting Started

### Prerequisites
${doc.gettingStarted.prerequisites.map(p => `- ${p}`).join('\n')}

### Installation
${doc.gettingStarted.installation}

### Quick Start
${doc.gettingStarted.quickStart}

### Configuration
${doc.gettingStarted.configuration}

---

## 🏗️ Architecture

### Project Structure
${doc.architecture.structure}

### Design Patterns
${doc.architecture.patterns.map(p => `- ${p}`).join('\n')}

### Data Flow
${doc.architecture.dataFlow}

### Key Dependencies
${doc.architecture.dependencies.map(dep =>
  `- **${dep.name}**${dep.critical ? ' ⚠️ (Critical)' : ''}: ${dep.purpose}`
).join('\n')}

---

## 🧩 Components

${doc.components.map(comp => `
### ${comp.name} \`${comp.type}\`

**Location:** \`${comp.location}\`

**Purpose:** ${comp.purpose}

**Description:** ${comp.description}

${comp.keyMethods && comp.keyMethods.length > 0 ? `
**Key Methods:**
${comp.keyMethods.map(m => `
- **${m.name}**${m.parameters ? `(${m.parameters})` : '()'}${m.returns ? ` → ${m.returns}` : ''}
  ${m.description}
`).join('\n')}
` : ''}

${comp.dependencies && comp.dependencies.length > 0 ? `
**Dependencies:** ${comp.dependencies.join(', ')}
` : ''}

${comp.examples ? `
**Example:**
\`\`\`
${comp.examples}
\`\`\`
` : ''}
`).join('\n---\n')}

---

## 🔌 API Reference

${doc.apiReference.length > 0 ? doc.apiReference.map(api => `
### \`${api.method}\` ${api.endpoint}

${api.description}

**Parameters:**
${api.parameters.map(p =>
  `- \`${p.name}\` (${p.type})${p.required ? ' **required**' : ''} - ${p.description}`
).join('\n')}

**Response:**
\`\`\`
${api.response}
\`\`\`

**Example:**
\`\`\`
${api.example}
\`\`\`
`).join('\n---\n') : '*No API endpoints documented*'}

---

## ✅ Best Practices

### Code Style
${doc.bestPractices.codeStyle.map(s => `- ${s}`).join('\n')}

### Testing
${doc.bestPractices.testing}

### Deployment
${doc.bestPractices.deployment}

### Security
${doc.bestPractices.security.map(s => `- ${s}`).join('\n')}

### Performance
${doc.bestPractices.performance.map(p => `- ${p}`).join('\n')}

---

## 🔧 Troubleshooting

${doc.troubleshooting.map(t => `
### ${t.issue}

**Solution:**
${t.solution}

${t.preventive ? `**Prevention:**
${t.preventive}` : ''}
`).join('\n')}

---

## 💡 Examples

${doc.examples.map(ex => `
### ${ex.title}

${ex.description}

\`\`\`
${ex.code}
\`\`\`

**Explanation:**
${ex.explanation}
`).join('\n---\n')}

---

## 🤝 Contributing

### Guidelines
${doc.contributing.guidelines}

### Workflow
${doc.contributing.workflow}

### Code Review Process
${doc.contributing.codeReview}

### Testing Requirements
${doc.contributing.testing}

---

<div align="center">

**📚 Documentation Auto-Generated by [gh.gg](https://github.gg)**

*Last updated: ${new Date().toISOString().split('T')[0]}*

</div>`;
}
