/**
 * Code Refactor Analyzer
 * AI-powered analysis for identifying refactoring opportunities
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

export interface RefactorSuggestion {
  file: string;
  line?: number;
  type: 'large-file' | 'large-function' | 'complex-logic' | 'repeated-code';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
}

export interface RefactorAnalysisResult {
  suggestions: RefactorSuggestion[];
  stats: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
  grouped: Record<string, RefactorSuggestion[]>;
}

// ==================== File Analysis ====================

function analyzeFile(filePath: string, suggestions: RefactorSuggestion[]) {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Check file size
  if (lines.length > 300) {
    suggestions.push({
      file: filePath,
      type: 'large-file',
      severity: 'high',
      message: `File has ${lines.length} lines (>300)`,
      suggestion: 'Consider splitting into multiple files or extracting utils',
    });
  } else if (lines.length > 200) {
    suggestions.push({
      file: filePath,
      type: 'large-file',
      severity: 'medium',
      message: `File has ${lines.length} lines (>200)`,
      suggestion: 'File is getting large, consider organizing better',
    });
  }

  // Find large functions
  analyzeFunctions(filePath, content, lines, suggestions);

  // Find complex inline logic
  analyzeComplexLogic(filePath, content, lines, suggestions);
}

// ==================== Function Analysis ====================

function analyzeFunctions(
  filePath: string,
  content: string,
  lines: string[],
  suggestions: RefactorSuggestion[]
) {
  // Match function declarations (async function, function, arrow functions in assignments)
  const functionRegex = /(async\s+)?function\s+(\w+)|const\s+(\w+)\s*=\s*(async\s+)?\(|(\w+)\s*\(.*\)\s*\{/g;

  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const funcName = match[2] || match[3] || match[5];
    const startPos = match.index;
    const startLine = content.substring(0, startPos).split('\n').length;

    // Find function end (simple brace counting)
    const funcLength = estimateFunctionLength(content.substring(startPos));

    if (funcLength > 50) {
      suggestions.push({
        file: filePath,
        line: startLine,
        type: 'large-function',
        severity: 'high',
        message: `Function '${funcName}' is ~${funcLength} lines`,
        suggestion: 'Extract helper functions for readability',
      });
    } else if (funcLength > 30) {
      suggestions.push({
        file: filePath,
        line: startLine,
        type: 'large-function',
        severity: 'medium',
        message: `Function '${funcName}' is ~${funcLength} lines`,
        suggestion: 'Consider breaking into smaller functions',
      });
    }
  }
}

function estimateFunctionLength(funcContent: string): number {
  let braceCount = 0;
  let lineCount = 0;
  let started = false;

  for (const char of funcContent) {
    if (char === '{') {
      braceCount++;
      started = true;
    }
    if (char === '}') {
      braceCount--;
      if (started && braceCount === 0) break;
    }
    if (char === '\n') lineCount++;
  }

  return lineCount;
}

// ==================== Complex Logic Analysis ====================

function analyzeComplexLogic(
  filePath: string,
  content: string,
  lines: string[],
  suggestions: RefactorSuggestion[]
) {
  lines.forEach((line, idx) => {
    // Deep nesting
    const indent = line.match(/^(\s*)/)?.[1].length || 0;
    if (indent > 16) { // 4 levels deep (assuming 4 spaces)
      suggestions.push({
        file: filePath,
        line: idx + 1,
        type: 'complex-logic',
        severity: 'medium',
        message: 'Deep nesting detected',
        suggestion: 'Extract nested logic into separate function',
      });
    }

    // Long conditionals
    if (line.includes('&&') && line.includes('||') && line.length > 100) {
      suggestions.push({
        file: filePath,
        line: idx + 1,
        type: 'complex-logic',
        severity: 'low',
        message: 'Complex conditional logic',
        suggestion: 'Extract to named boolean variable or predicate function',
      });
    }

    // Inline SQL/template strings > 100 chars
    if (line.includes('`') && line.length > 120) {
      suggestions.push({
        file: filePath,
        line: idx + 1,
        type: 'complex-logic',
        severity: 'low',
        message: 'Long template string',
        suggestion: 'Consider extracting to constant or builder function',
      });
    }
  });
}

// ==================== Directory Walker ====================

function walkDir(dir: string, callback: (file: string) => void) {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .next, etc
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
        walkDir(filePath, callback);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      callback(filePath);
    }
  }
}

// ==================== Main Analysis Function ====================

/**
 * Analyze a directory for refactoring opportunities
 * @param srcDir - Root directory to analyze (e.g., '/home/ubuntu/github.gg/src')
 * @returns Analysis results with suggestions grouped by type
 */
export function analyzeCodebase(srcDir: string): RefactorAnalysisResult {
  const suggestions: RefactorSuggestion[] = [];

  // Walk and analyze all TypeScript files
  walkDir(srcDir, (file) => {
    analyzeFile(file, suggestions);
  });

  // Sort by severity
  const sorted = suggestions.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  // Group by type
  const grouped = sorted.reduce((acc, s) => {
    if (!acc[s.type]) acc[s.type] = [];
    acc[s.type].push(s);
    return acc;
  }, {} as Record<string, RefactorSuggestion[]>);

  // Calculate stats
  const stats = {
    total: suggestions.length,
    high: sorted.filter(s => s.severity === 'high').length,
    medium: sorted.filter(s => s.severity === 'medium').length,
    low: sorted.filter(s => s.severity === 'low').length,
  };

  return { suggestions: sorted, stats, grouped };
}

/**
 * Format analysis results as human-readable text
 */
export function formatAnalysisResults(
  result: RefactorAnalysisResult,
  options: { maxPerType?: number; rootPath?: string } = {}
): string {
  const { maxPerType = 10, rootPath = '' } = options;
  let output = `Found ${result.stats.total} refactoring opportunities\n\n`;

  Object.entries(result.grouped).forEach(([type, items]) => {
    output += `${'='.repeat(60)}\n`;
    output += `📋 ${type.toUpperCase().replace(/-/g, ' ')} (${items.length})\n`;
    output += `${'='.repeat(60)}\n`;

    items.slice(0, maxPerType).forEach((item) => {
      const severity = item.severity === 'high' ? '🔴' : item.severity === 'medium' ? '🟡' : '🟢';
      const location = item.line ? `:${item.line}` : '';
      const filePath = rootPath ? item.file.replace(rootPath, '') : item.file;
      output += `\n${severity} ${filePath}${location}\n`;
      output += `   ${item.message}\n`;
      output += `   💡 ${item.suggestion}\n`;
    });

    if (items.length > maxPerType) {
      output += `\n   ... and ${items.length - maxPerType} more\n`;
    }

    output += '\n';
  });

  output += `${'='.repeat(60)}\n`;
  output += '\n✨ Refactoring Summary:\n';
  output += `   🔴 High priority: ${result.stats.high}\n`;
  output += `   🟡 Medium priority: ${result.stats.medium}\n`;
  output += `   🟢 Low priority: ${result.stats.low}\n`;

  return output;
}
