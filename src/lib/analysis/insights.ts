import { z } from 'zod';

// Language breakdown schema
const languageSchema = z.object({
  name: z.string().describe('Programming language name'),
  percentage: z.number().min(0).max(100).describe('Percentage of code in this language'),
  files: z.number().describe('Number of files in this language'),
  lines: z.number().describe('Approximate lines of code'),
});

// Architecture pattern schema
const architecturePatternSchema = z.object({
  name: z.string().describe('Pattern name (e.g., MVC, Repository, Factory)'),
  description: z.string().describe('Description of the pattern usage'),
  confidence: z.number().min(0).max(1).describe('Confidence level of pattern detection'),
  examples: z.array(z.string()).describe('File examples where pattern is used'),
});

// Dependency schema
const dependencySchema = z.object({
  name: z.string().describe('Package/dependency name'),
  type: z.enum(['production', 'development', 'peer']).describe('Dependency type'),
  version: z.string().describe('Version or version range'),
});

// Quality issue schema
const qualityIssueSchema = z.object({
  type: z.enum(['warning', 'error', 'info']).describe('Issue type'),
  message: z.string().describe('Issue description'),
  severity: z.enum(['low', 'medium', 'high']).describe('Issue severity'),
  file: z.string().optional().describe('Affected file path'),
});

// Recommendation schema
const recommendationSchema = z.object({
  priority: z.enum(['high', 'medium', 'low']).describe('Recommendation priority'),
  category: z.enum(['security', 'performance', 'maintainability', 'documentation']).describe('Recommendation category'),
  title: z.string().describe('Recommendation title'),
  description: z.string().describe('Detailed description'),
  action: z.string().describe('Specific action to take'),
});

// Security vulnerability schema
const securityVulnerabilitySchema = z.object({
  type: z.string().describe('Vulnerability type'),
  severity: z.enum(['critical', 'high', 'medium', 'low']).describe('Vulnerability severity'),
  description: z.string().describe('Vulnerability description'),
  affected: z.array(z.string()).describe('Affected files or dependencies'),
});

// Performance bottleneck schema
const performanceBottleneckSchema = z.object({
  type: z.string().describe('Bottleneck type'),
  impact: z.string().describe('Performance impact description'),
  suggestion: z.string().describe('Optimization suggestion'),
});

// Main repository insights schema
export const repoInsightsSchema = z.object({
  overview: z.object({
    summary: z.string().describe('High-level summary of the repository'),
    totalFiles: z.number().describe('Total number of files'),
    totalSize: z.string().describe('Total repository size in human-readable format'),
    mainLanguage: z.string().describe('Primary programming language'),
    complexity: z.enum(['low', 'medium', 'high']).describe('Overall code complexity'),
  }),
  
  languages: z.array(languageSchema).describe('Programming language breakdown'),
  
  architecture: z.object({
    patterns: z.array(architecturePatternSchema).describe('Detected architectural patterns'),
    dependencies: z.array(dependencySchema).describe('Project dependencies'),
    structure: z.object({
      type: z.enum(['monorepo', 'monolith', 'microservices', 'library']).describe('Repository structure type'),
      description: z.string().describe('Structure description'),
    }),
  }),
  
  quality: z.object({
    score: z.number().min(0).max(100).describe('Overall quality score (0-100)'),
    metrics: z.object({
      maintainability: z.number().min(0).max(100).describe('Maintainability score'),
      testCoverage: z.number().min(0).max(100).describe('Test coverage percentage'),
      documentation: z.number().min(0).max(100).describe('Documentation completeness'),
      complexity: z.number().min(0).max(100).describe('Code complexity score'),
    }),
    issues: z.array(qualityIssueSchema).describe('Quality issues found'),
  }),
  
  recommendations: z.array(recommendationSchema).describe('Actionable recommendations'),
  
  security: z.object({
    vulnerabilities: z.array(securityVulnerabilitySchema).describe('Security vulnerabilities'),
    dependencies: z.object({
      outdated: z.array(z.string()).describe('Outdated dependencies'),
      vulnerable: z.array(z.string()).describe('Vulnerable dependencies'),
    }),
  }),
  
  performance: z.object({
    bottlenecks: z.array(performanceBottleneckSchema).describe('Performance bottlenecks'),
    optimization: z.array(z.object({
      area: z.string().describe('Optimization area'),
      potential: z.string().describe('Potential improvement'),
      effort: z.enum(['low', 'medium', 'high']).describe('Implementation effort'),
    })).describe('Optimization opportunities'),
  }),
});

// Export TypeScript type
export type RepoInsights = z.infer<typeof repoInsightsSchema>;

// Language colors from GitHub's official linguist data (600+ languages)
import * as linguistLanguages from 'linguist-languages';

const languageColorCache = new Map<string, string>();

export function getLanguageColor(language: string): string {
  const cached = languageColorCache.get(language);
  if (cached) return cached;

  // Direct match
  const langs = linguistLanguages as Record<string, { color?: string }>;
  const lang = langs[language];
  if (lang?.color) {
    languageColorCache.set(language, lang.color);
    return lang.color;
  }

  // Case-insensitive search
  const lower = language.toLowerCase();
  for (const [name, data] of Object.entries(langs)) {
    if (name.toLowerCase() === lower && data.color) {
      const color = data.color;
      languageColorCache.set(language, color);
      return color;
    }
  }

  return '#6c757d';
}
