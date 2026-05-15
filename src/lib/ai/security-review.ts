import { generateObject } from 'ai';
import { z } from 'zod';
import { retryWithBackoff } from './retry-utils';
import { GEMINI_PRO, GEMINI_FLASH } from './models';
import {
  SECURITY_SEVERITY,
  securityReviewSchema,
  type SecurityReviewData,
} from '@/lib/types/security-review';

const partialSecuritySchema = z.object({
  vulnerabilities: z.array(z.object({
    severity: z.enum(SECURITY_SEVERITY),
    category: z.string(),
    title: z.string(),
    file: z.string(),
    recommendation: z.string(),
  })),
  attackSurface: z.array(z.string()),
  detectedSecrets: z.array(z.string()),
  chunkScore: z.number().min(0).max(100),
});

export interface SecurityReviewParams {
  files: Array<{ path: string; content: string }>;
  repoName: string;
  onProgress?: (message: string, progress: number) => void;
}

export interface SecurityReviewResult {
  review: SecurityReviewData;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function formatFilesForPrompt(files: Array<{ path: string; content: string }>, maxCharsPerFile = 30000): string {
  return files.map(file => {
    let content = file.content;
    if (content.length > maxCharsPerFile) {
      content = content.slice(0, maxCharsPerFile) + '\n... (truncated)';
    }
    return `\n--- ${file.path} ---\n${content}`;
  }).join('\n');
}

const FORMAT_RULES = `CRITICAL FORMATTING RULES:
- The "markdown" field MUST use standard Markdown syntax (# for h1, ## for h2, **bold**, - for lists, etc.)
- Do NOT use HTML tags. Use only pure Markdown.`;

const SECURITY_CATEGORIES = `SECURITY CATEGORIES TO INSPECT:
- Authentication & Session Management (token storage, password handling, JWT/cookie flags, MFA)
- Authorization & Access Control (IDOR, privilege escalation, missing authz checks)
- Input Validation & Injection (SQLi, XSS, command injection, SSRF, prototype pollution, deserialization)
- Secrets & Credentials (hardcoded keys/tokens in source, env handling, key rotation)
- Cryptography (weak algos, custom crypto, IV/nonce reuse, weak randomness)
- Dependency & Supply Chain (outdated/known-CVE deps, install scripts, lockfile integrity, typosquats)
- Data Exposure (PII logging, error message leakage, debug endpoints, source maps in prod)
- Network & Transport (TLS config, mixed content, CORS, CSRF, SSRF)
- Infrastructure & Deploy (Dockerfiles, CI tokens, IaC misconfig, exposed admin routes)
- Client-side / Web (CSP, subresource integrity, dangerouslySetInnerHTML, untrusted HTML)
- Server-side framework specifics (Next.js routes, server actions, RSC trust boundary)`;

const RISK_RUBRIC = `OVERALL SCORING RUBRIC (higher = more secure):
- 90-100: Strong — defense in depth, secrets handled correctly, dependencies fresh, no critical findings
- 75-89: Solid — minor hardening opportunities, low/medium findings only
- 60-74: Adequate — some medium findings, gaps in coverage
- 40-59: Weak — multiple medium or one high finding, missing fundamentals
- Below 40: Critical — confirmed high/critical findings (RCE, exposed secrets, broken auth)

riskLevel must reflect the worst confirmed finding category.`;

async function analyzeSecurityChunk(
  files: Array<{ path: string; content: string }>,
  chunkIndex: number,
  totalChunks: number,
  repoName: string,
) {
  const fileContents = formatFilesForPrompt(files);

  const prompt = `You are a senior application-security engineer performing a code review of CHUNK ${chunkIndex + 1}/${totalChunks} of repository "${repoName}".

${SECURITY_CATEGORIES}

For each finding, cite the exact file path. Map findings to one of these categories. Use these severities only: ${SECURITY_SEVERITY.join(', ')}.
- critical: trivially exploitable, results in RCE / data breach / account takeover
- high: exploitable under realistic conditions
- medium: defense weakness or risky pattern that compounds with other issues
- low: best-practice deviation, hardening recommendation
- info: informational observation, no direct risk

Treat absence of evidence as absence — do not invent findings. Prefer high-confidence over speculative.

FILES:
${fileContents}

Return JSON with: vulnerabilities[], attackSurface[] (entry points / trust boundaries observed), detectedSecrets[] (any hardcoded-looking keys/tokens — redact the value, give file:reason), chunkScore (0-100, higher = more secure).`;

  return retryWithBackoff(async () => {
    const { object, usage } = await generateObject({
      model: GEMINI_FLASH,
      schema: partialSecuritySchema,
      messages: [{ role: 'user', content: prompt }],
    });
    return { result: object, usage };
  });
}

async function generateFinalSecurityReport(
  chunkResults: Array<z.infer<typeof partialSecuritySchema>>,
  repoName: string,
) {
  const allVulns = chunkResults.flatMap(c => c.vulnerabilities);
  const allAttackSurface = [...new Set(chunkResults.flatMap(c => c.attackSurface))];
  const allSecrets = [...new Set(chunkResults.flatMap(c => c.detectedSecrets))];
  const avgScore = Math.round(chunkResults.reduce((sum, c) => sum + c.chunkScore, 0) / chunkResults.length);

  const severityCounts = SECURITY_SEVERITY.reduce<Record<string, number>>((acc, sev) => {
    acc[sev] = allVulns.filter(v => v.severity === sev).length;
    return acc;
  }, {});

  const prompt = `You are a senior application-security engineer producing a FINAL security profile for "${repoName}" by synthesizing ${chunkResults.length} partial reviews.

CHUNK AVERAGE SCORE: ${avgScore}/100
SEVERITY COUNTS: ${JSON.stringify(severityCounts)}
ATTACK SURFACE OBSERVED: ${allAttackSurface.join(', ') || '(none reported)'}
HARDCODED-SECRET CANDIDATES: ${allSecrets.length}
RAW FINDINGS (${allVulns.length} total): ${JSON.stringify(allVulns.slice(0, 60))}

Your job:
1. Deduplicate near-identical findings across chunks. Keep the highest severity instance.
2. Compute "overallScore" using the rubric below — DO NOT just average chunk scores. Worst-case dominates.
3. Pick "riskLevel" matching the worst confirmed finding.
4. Score 5-7 metrics from these dimensions: Authentication, Authorization, Input Validation, Secrets Management, Dependencies, Cryptography, Data Exposure, Network/Transport, Client-side, Infra/Deploy.
5. Build a markdown SECURITY PROFILE for the repo.

${RISK_RUBRIC}

MARKDOWN STRUCTURE:
1. **Risk Profile** — one-paragraph executive summary, name the worst category
2. **Attack Surface** — entry points and trust boundaries (bullet list)
3. **Findings by Severity** — group findings critical → low, each with file path and recommendation
4. **Secrets & Credentials** — what was found (or "none detected"), with files
5. **Dependency & Supply-Chain Notes**
6. **Hardening Recommendations** — concrete, ordered by impact
7. **Out of Scope** — what this review did not cover

${FORMAT_RULES}

Return JSON matching: { overallScore, riskLevel, metrics, vulnerabilities, attackSurface, markdown }.`;

  return retryWithBackoff(async () => {
    const { object, usage } = await generateObject({
      model: GEMINI_PRO,
      schema: securityReviewSchema,
      messages: [{ role: 'user', content: prompt }],
    });
    return { result: object, usage };
  });
}

async function processChunksParallel<T>(
  items: T[],
  processor: (item: T, index: number) => Promise<unknown>,
  concurrency: number,
  onProgress?: (completed: number, total: number) => void,
): Promise<unknown[]> {
  const results: unknown[] = new Array(items.length);
  let completed = 0;
  let currentIndex = 0;

  async function processNext(): Promise<void> {
    const index = currentIndex++;
    if (index >= items.length) return;

    results[index] = await processor(items[index], index);
    completed++;
    onProgress?.(completed, items.length);

    await processNext();
  }

  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => processNext());

  await Promise.all(workers);
  return results;
}

export async function generateSecurityReview({
  files,
  repoName,
  onProgress,
}: SecurityReviewParams): Promise<SecurityReviewResult> {
  const TOKENS_PER_CHUNK = 100000;
  const MAX_CONCURRENCY = 3;

  const totalEstimatedTokens = files.reduce(
    (sum, f) => sum + estimateTokens(f.content) + estimateTokens(f.path),
    0,
  );
  console.log(`🔐 Security review: ${files.length} files, ~${totalEstimatedTokens} tokens`);
  onProgress?.('Preparing security review...', 15);

  const chunks: Array<Array<typeof files[0]>> = [];
  let currentChunk: Array<typeof files[0]> = [];
  let currentChunkTokens = 0;

  for (const file of files) {
    const fileTokens = estimateTokens(file.content) + estimateTokens(file.path);
    if (currentChunkTokens + fileTokens > TOKENS_PER_CHUNK && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [file];
      currentChunkTokens = fileTokens;
    } else {
      currentChunk.push(file);
      currentChunkTokens += fileTokens;
    }
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);

  console.log(`📦 Security review split into ${chunks.length} chunk(s)`);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  if (chunks.length === 1) {
    onProgress?.('Scanning for vulnerabilities...', 20);
    const { result, usage } = await analyzeSecurityChunk(chunks[0], 0, 1, repoName);
    totalInputTokens += usage.inputTokens || 0;
    totalOutputTokens += usage.outputTokens || 0;

    onProgress?.('Building security profile...', 70);
    const { result: finalResult, usage: finalUsage } = await generateFinalSecurityReport([result], repoName);
    totalInputTokens += finalUsage.inputTokens || 0;
    totalOutputTokens += finalUsage.outputTokens || 0;

    return {
      review: finalResult,
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
      },
    };
  }

  onProgress?.(`Scanning ${chunks.length} chunks in parallel...`, 20);

  const chunkResults = await processChunksParallel(
    chunks,
    async (chunk, index) => {
      console.log(`🔎 Security chunk ${index + 1}/${chunks.length} (${chunk.length} files)`);
      const { result, usage } = await analyzeSecurityChunk(chunk, index, chunks.length, repoName);
      totalInputTokens += usage.inputTokens || 0;
      totalOutputTokens += usage.outputTokens || 0;
      return result;
    },
    MAX_CONCURRENCY,
    (completed, total) => {
      const progress = 20 + Math.round((completed / total) * 50);
      onProgress?.(`Scanned ${completed}/${total} chunks...`, progress);
    },
  ) as Array<z.infer<typeof partialSecuritySchema>>;

  onProgress?.('Synthesizing security profile...', 75);

  const { result, usage } = await generateFinalSecurityReport(chunkResults, repoName);
  totalInputTokens += usage.inputTokens || 0;
  totalOutputTokens += usage.outputTokens || 0;

  return {
    review: result,
    usage: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
    },
  };
}
