import { router } from '@/lib/trpc/trpc';
import { githubAnalysisPrFetchRouter } from './pr-fetch';
import { githubAnalysisPrAnalysisRouter } from './pr-analysis';
import { githubAnalysisIssueAnalysisRouter } from './issue-analysis';
import { githubAnalysisCacheRouter } from './cache';

export const githubAnalysisRouter = router({
  // PR fetching (list + details)
  getRepoPRs: githubAnalysisPrFetchRouter.getRepoPRs,
  getPRDetails: githubAnalysisPrFetchRouter.getPRDetails,

  // PR analysis (subscription)
  analyzePR: githubAnalysisPrAnalysisRouter.analyzePR,

  // Issue fetching + analysis
  getRepoIssues: githubAnalysisIssueAnalysisRouter.getRepoIssues,
  getIssueDetails: githubAnalysisIssueAnalysisRouter.getIssueDetails,
  analyzeIssueEndpoint: githubAnalysisIssueAnalysisRouter.analyzeIssueEndpoint,

  // Cached analyses (public)
  getCachedPRAnalysis: githubAnalysisCacheRouter.getCachedPRAnalysis,
  getCachedIssueAnalysis: githubAnalysisCacheRouter.getCachedIssueAnalysis,
});
