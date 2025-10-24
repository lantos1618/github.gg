import { repositoryScorecards } from '@/db/schema';
import { generateScorecardAnalysis } from '@/lib/ai/scorecard';
import { scorecardSchema } from '@/lib/types/scorecard';
import { createAnalysisRouter } from '@/lib/trpc/factories/analysis-router-factory';

export const scorecardRouter = createAnalysisRouter({
  featureName: 'scorecard',
  table: repositoryScorecards,
  generateFn: async ({ files, repoName }) => {
    const result = await generateScorecardAnalysis({ files, repoName });
    return {
      data: result.scorecard,
      usage: result.usage,
    };
  },
  parseSchema: (data) => scorecardSchema.parse(data),
  buildInsertValues: (data, version, userId, input) => ({
    userId,
    repoOwner: input.user,
    repoName: input.repo,
    ref: input.ref || 'main',
    version,
    overallScore: data.overallScore,
    metrics: data.metrics,
    markdown: data.markdown,
    updatedAt: new Date(),
  }),
  buildResponse: (record) => ({
    metrics: record.metrics,
    markdown: record.markdown,
    overallScore: record.overallScore,
  }),
  responseKey: 'scorecard',
  errorMessage: 'Failed to generate repository scorecard',
  includeGetAll: true,
});
