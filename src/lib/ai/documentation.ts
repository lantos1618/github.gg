import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

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
 * Generate comprehensive documentation from a codebase
 */
export async function generateDocumentation({
  repoName,
  repoDescription,
  primaryLanguage,
  files,
  packageJson,
  readme,
}: DocumentationParams): Promise<DocumentationResponse> {
  try {
    // Prepare file contents for analysis
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
      model: google('models/gemini-2.5-pro'),
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
