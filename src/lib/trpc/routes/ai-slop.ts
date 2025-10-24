import { aiSlopAnalyses } from '@/db/schema';
import { generateAISlopAnalysis, aiSlopSchema } from '@/lib/ai/ai-slop';
import { createAnalysisRouter } from '@/lib/trpc/factories/analysis-router-factory';

export const aiSlopRouter = createAnalysisRouter({
  featureName: 'ai-slop',
  table: aiSlopAnalyses,
  generateFn: async ({ files, repoName }) => {
    const result = await generateAISlopAnalysis({ files, repoName });
    return {
      data: result.analysis,
      usage: result.usage,
    };
  },
  parseSchema: (data) => aiSlopSchema.parse(data),
  buildInsertValues: (data, version, userId, input) => ({
    userId,
    repoOwner: input.user,
    repoName: input.repo,
    ref: input.ref || 'main',
    version,
    overallScore: data.overallScore,
    aiGeneratedPercentage: data.aiGeneratedPercentage,
    detectedPatterns: data.detectedPatterns,
    metrics: data.metrics,
    markdown: data.markdown,
    updatedAt: new Date(),
  }),
  buildResponse: (record) => ({
    metrics: record.metrics,
    markdown: record.markdown,
    overallScore: record.overallScore,
    aiGeneratedPercentage: record.aiGeneratedPercentage,
    detectedPatterns: record.detectedPatterns,
  }),
  responseKey: 'analysis',
  errorMessage: 'Failed to generate AI slop analysis',
  includeGetAll: false,
});
