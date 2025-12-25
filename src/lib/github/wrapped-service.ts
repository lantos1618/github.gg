import { Octokit } from '@octokit/rest';
import type { WrappedStats } from '@/db/schema/wrapped';
import { getLanguageColor, GITHUB_GG_REPO } from '@/lib/types/wrapped';

type SearchCommitItem = {
  sha: string;
  commit: {
    message: string;
    author: { date: string } | null;
  };
  repository: {
    name: string;
    owner: { login: string };
    language: string | null;
    stargazers_count: number;
  };
};

export type RichCommitData = {
  message: string;
  repo: string;
  date: string;
  sha?: string;
  owner?: string;
  filesChanged?: string[];
  diff?: string; // Full commit diff for AI analysis
};

export type WrappedRawData = {
  commits: RichCommitData[];
  pullRequests: Array<{ title: string; repo: string; merged: boolean; date: string }>;
  totalStats: {
    commits: number;
    prs: number;
    prsMerged: number;
    repos: number;
    languages: string[];
  };
};

export class WrappedService {
  private octokit: Octokit;
  private year: number;

  constructor(octokit: Octokit, year: number = new Date().getFullYear()) {
    this.octokit = octokit;
    this.year = year;
  }

  async hasStarredGithubGG(): Promise<boolean> {
    try {
      await this.octokit.rest.activity.checkRepoIsStarredByAuthenticatedUser({
        owner: GITHUB_GG_REPO.owner,
        repo: GITHUB_GG_REPO.repo,
      });
      return true;
    } catch (error: unknown) {
      const err = error as { status?: number };
      if (err.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Infer user's timezone by analyzing commit patterns
   * Finds the timezone offset that best aligns commits with typical working hours
   */
  private inferTimezone(commits: SearchCommitItem[]): number {
    if (commits.length === 0) return 0;
    
    // Sample commits for performance (use all if less than 500)
    const sampleSize = Math.min(commits.length, 1000);
    const sample = commits.slice(0, sampleSize);
    
    // Try different timezone offsets from -12 to +14
    let bestOffset = 0;
    let bestScore = -Infinity;
    
    for (let offset = -12; offset <= 14; offset++) {
      const hourDistribution = new Array(24).fill(0);
      let totalCommits = 0;
      
      // Build hour distribution for this timezone offset
      for (const commit of sample) {
        const dateStr = commit.commit.author?.date;
        if (!dateStr) continue;
        
        const date = new Date(dateStr);
        const localHour = (date.getUTCHours() + offset + 24) % 24;
        hourDistribution[localHour]++;
        totalCommits++;
      }
      
      if (totalCommits === 0) continue;
      
      // Calculate score based on:
      // 1. Commits during working hours (9am-5pm) - higher is better
      // 2. Commits during sleep hours (12am-6am) - lower is better
      // 3. Peak hour clarity (how distinct the peak is) - higher is better
      
      let workingHoursCommits = 0;
      let sleepHoursCommits = 0;
      
      for (let hour = 0; hour < 24; hour++) {
        if (hour >= 9 && hour < 17) {
          workingHoursCommits += hourDistribution[hour];
        }
        if (hour >= 0 && hour < 6) {
          sleepHoursCommits += hourDistribution[hour];
        }
      }
      
      const workingHoursRatio = workingHoursCommits / totalCommits;
      const sleepHoursRatio = sleepHoursCommits / totalCommits;
      
      // Find peak hour
      const maxCommits = Math.max(...hourDistribution);
      const peakHour = hourDistribution.indexOf(maxCommits);
      const peakRatio = maxCommits / totalCommits;
      
      // Score: favor working hours, penalize sleep hours, reward clear peak
      const score = (workingHoursRatio * 2) - (sleepHoursRatio * 1.5) + (peakRatio * 0.5);
      
      if (score > bestScore) {
        bestScore = score;
        bestOffset = offset;
      }
    }
    
    return bestOffset;
  }

  async fetchWrappedStats(
    username: string,
    onProgress?: (message: string, metadata?: { commits?: number; repos?: number; sampleCommits?: Array<{ repo: string; message: string }>; type?: string }) => void
  ): Promise<{ stats: WrappedStats; rawData: WrappedRawData }> {
    onProgress?.('🔍 Scanning the GitHub universe for your commits...', { type: 'init' });
    
    const [commitResult, pullRequests] = await Promise.all([
      this.searchUserCommits(username),
      this.searchUserPRs(username),
    ]);
    
    const commits = commitResult.commits;
    const totalCommitsFromSearch = commitResult.totalCount;
    
    // Pick more interesting commits for samples
    const sampleCommits = commits
      .filter(c => c.commit.message.length > 30)
      .slice(0, 5)
      .map(c => ({
        repo: c.repository.name,
        message: c.commit.message.split('\n')[0].slice(0, 60),
      }));
    
    onProgress?.(
      `✨ Found ${totalCommitsFromSearch.toLocaleString()} commits in ${this.year}!`, 
      {
        commits: totalCommitsFromSearch,
        sampleCommits: sampleCommits.length > 0 ? sampleCommits : commits.slice(0, 3).map(c => ({
          repo: c.repository.name,
          message: c.commit.message.split('\n')[0].slice(0, 60),
        })),
      }
    );
    
    const timezoneOffset = this.inferTimezone(commits);
    
    const uniqueRepos = new Map<string, { owner: string; name: string; commitCount: number }>();
    for (const commit of commits) {
      const key = `${commit.repository.owner.login}/${commit.repository.name}`;
      const existing = uniqueRepos.get(key);
      if (existing) {
        existing.commitCount++;
      } else {
        uniqueRepos.set(key, {
          owner: commit.repository.owner.login,
          name: commit.repository.name,
          commitCount: 1,
        });
      }
    }
    
    const topReposByCommits = Array.from(uniqueRepos.values())
      .sort((a, b) => b.commitCount - a.commitCount)
      .slice(0, 20);
    
    const topRepoNames = topReposByCommits.slice(0, 3).map(r => r.name);
    onProgress?.(
      `📦 Analyzing ${topReposByCommits.length} repositories... ${topRepoNames.length > 0 ? `Top repos: ${topRepoNames.join(', ')}` : ''}`,
      {
        repos: topReposByCommits.length,
      }
    );
    
    const repoLanguages = await this.fetchRepoLanguages(topReposByCommits);

    const commitsByHour = new Array(24).fill(0);
    const commitsByDay = new Array(7).fill(0);
    const commitsByMonth = new Array(12).fill(0);
    const commitMessages: string[] = [];
    const repoCommitCounts = new Map<string, number>();
    const repoData = new Map<string, { language: string | null; stars: number; owner: string }>();
    const languageCounts = new Map<string, number>();
    const commitDates = new Set<string>();
    // Contribution calendar: map of date strings (YYYY-MM-DD) to commit counts
    const contributionCalendar = new Map<string, number>();

    let lateNightCommits = 0;
    let weekendCommits = 0;
    let mondayCommits = 0;
    let firstCommitDate: string | null = null;
    let lastCommitDate: string | null = null;

    for (const commit of commits) {
      const dateStr = commit.commit.author?.date;
      if (!dateStr) continue;

      const date = new Date(dateStr);
      // Convert UTC to local time using inferred offset
      const localHour = (date.getUTCHours() + timezoneOffset + 24) % 24;
      const day = date.getUTCDay();
      const month = date.getUTCMonth();

      commitMessages.push(commit.commit.message);
      commitsByHour[localHour]++;
      commitsByDay[day]++;
      commitsByMonth[month]++;
      const dateKey = dateStr.split('T')[0];
      commitDates.add(dateKey);
      // Track contributions per day for calendar heatmap
      contributionCalendar.set(dateKey, (contributionCalendar.get(dateKey) || 0) + 1);

      if (localHour >= 0 && localHour < 5) lateNightCommits++;
      if (day === 0 || day === 6) weekendCommits++;
      if (day === 1) mondayCommits++;

      if (!firstCommitDate || dateStr < firstCommitDate) firstCommitDate = dateStr;
      if (!lastCommitDate || dateStr > lastCommitDate) lastCommitDate = dateStr;

      const repoName = commit.repository.name;
      repoCommitCounts.set(repoName, (repoCommitCounts.get(repoName) || 0) + 1);
      
      if (!repoData.has(repoName)) {
        repoData.set(repoName, {
          language: commit.repository.language,
          stars: commit.repository.stargazers_count,
          owner: commit.repository.owner.login,
        });
      }

      const repoKey = `${commit.repository.owner.login}/${commit.repository.name}`;
      const language = repoLanguages.get(repoKey) || commit.repository.language;
      if (language) {
        languageCounts.set(language, (languageCounts.get(language) || 0) + 1);
      }
    }

    // Use the total from search API if available (may be > 1000), otherwise use fetched count
    const totalCommits = totalCommitsFromSearch > commits.length ? totalCommitsFromSearch : commits.length;

    const totalLanguageWeight = Array.from(languageCounts.values()).reduce((a, b) => a + b, 0) || 1;
    const languages = Array.from(languageCounts.entries())
      .map(([name, count]) => ({
        name,
        percentage: (count / totalLanguageWeight) * 100,
        color: getLanguageColor(name),
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 8);

    const topRepos = Array.from(repoCommitCounts.entries())
      .map(([name, commitCount]) => {
        const data = repoData.get(name)!;
        return {
          name,
          owner: data.owner,
          commits: commitCount,
          stars: data.stars,
          language: data.language,
        };
      })
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 5);

    const peakHour = commitsByHour.indexOf(Math.max(...commitsByHour));
    const peakDayIndex = commitsByDay.indexOf(Math.max(...commitsByDay));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDay = dayNames[peakDayIndex];
    
    // Send analysis insights with interesting patterns
    const topLanguage = languages[0]?.name || 'Unknown';
    const topRepo = topRepos[0];
    const languageCount = languages.length;
    
    let patternMessage = `🎯 Patterns detected: ${topLanguage} is your #1 language`;
    if (topRepo) {
      patternMessage += `, ${topRepo.name} is your most active repo`;
    }
    if (languageCount > 3) {
      patternMessage += ` (polyglot: ${languageCount} languages!)`;
    }
    
    onProgress?.(patternMessage, {
      commits: totalCommits,
      repos: uniqueRepos.size,
    });

    const wordCounts = new Map<string, number>();
    for (const message of commitMessages) {
      const words = message.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      for (const word of words.slice(0, 5)) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
    const commonCommitWords = Array.from(wordCounts.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const messageCounts = new Map<string, number>();
    for (const message of commitMessages) {
      const normalized = message.toLowerCase().trim();
      messageCounts.set(normalized, (messageCounts.get(normalized) || 0) + 1);
    }
    const mostUsedEntry = Array.from(messageCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    const mostUsedCommitMessage = mostUsedEntry?.[0] || null;
    const sortedByLength = [...commitMessages].sort((a, b) => b.length - a.length);
    const longestCommitMessage = sortedByLength[0] || null;
    const avgCommitMessageLength = commitMessages.length > 0
      ? Math.round(commitMessages.reduce((sum, m) => sum + m.length, 0) / commitMessages.length)
      : 0;

    const shamefulCommits = this.analyzeShamefulCommits(commitMessages);
    const commitPatterns = this.analyzeCommitPatterns(commitDates, commitsByMonth);
    const { longestStreak, currentStreak } = this.calculateStreaks(commitDates);
    const codeQuality = this.analyzeCodeQuality(commitMessages, shamefulCommits);

    let richCommits: RichCommitData[] = commits.map(c => ({
      message: c.commit.message,
      repo: c.repository.name,
      date: c.commit.author?.date || '',
      sha: c.sha,
      owner: c.repository.owner.login,
    }));

    // Fetch commit diffs for potentially shameful commits (for AI analysis)
    onProgress?.('🔍 Fetching commit diffs for AI analysis...', { type: 'analysis' });
    richCommits = await this.fetchCommitDiffsForAnalysis(richCommits);

    // Calculate lines added/deleted from PRs
    const linesAdded = pullRequests.reduce((sum, pr) => sum + (pr.additions || 0), 0);
    const linesDeleted = pullRequests.reduce((sum, pr) => sum + (pr.deletions || 0), 0);

    const stats: WrappedStats = {
      totalCommits,
      totalPRs: pullRequests.length,
      totalPRsMerged: pullRequests.filter(pr => pr.merged).length,
      totalIssues: 0,
      totalReviews: 0,
      linesAdded,
      linesDeleted,
      topRepos,
      languages,
      commitsByHour,
      commitsByDay,
      commitsByMonth,
      contributionCalendar: Object.fromEntries(contributionCalendar),
      longestStreak,
      currentStreak,
      peakHour,
      peakDay,
      firstCommitDate,
      lastCommitDate,
      topCollaborators: [],
      commonCommitWords,
      mostUsedCommitMessage,
      longestCommitMessage,
      avgCommitMessageLength,
      lateNightCommits,
      weekendCommits,
      mondayCommits,
      shamefulCommits,
      commitPatterns,
      codeQuality,
    };

    const rawData: WrappedRawData = {
      commits: richCommits,
      pullRequests: pullRequests.map(pr => ({
        title: pr.title,
        repo: pr.repo,
        merged: pr.merged,
        date: pr.date,
      })) as Array<{ title: string; repo: string; merged: boolean; date: string }>,
      totalStats: {
        commits: totalCommits,
        prs: pullRequests.length,
        prsMerged: pullRequests.filter(pr => pr.merged).length,
        repos: topRepos.length,
        languages: languages.map(l => l.name),
      },
    };

    return { stats, rawData };
  }

  private async searchUserCommits(username: string): Promise<{ commits: SearchCommitItem[]; totalCount: number }> {
    const allCommits: SearchCommitItem[] = [];
    const q = `author:${username} committer-date:${this.year}-01-01..${this.year}-12-31`;
    let totalCount = 0;

    try {
      let page = 1;
      const perPage = 100;
      // GitHub Search API has a hard limit of 1,000 results, which is 10 pages at 100 per page
      // But we'll fetch until we hit the limit or run out of results
      const maxPages = 10; // GitHub's search API limit
      
      while (page <= maxPages) {
        const { data } = await this.octokit.rest.search.commits({
          q,
          per_page: perPage,
          page,
          sort: 'committer-date',
          order: 'desc',
        });

        // Capture total_count from first page (it's the same for all pages)
        if (page === 1) {
          totalCount = data.total_count;
        }

        allCommits.push(...(data.items as SearchCommitItem[]));

        // Stop if we've fetched all available results or hit GitHub's limit
        if (data.items.length < perPage || allCommits.length >= data.total_count || allCommits.length >= 1000) {
          break;
        }
        page++;
      }
      
      // Log if we hit the limit but there are more commits
      if (allCommits.length >= 1000 && totalCount > 1000) {
        console.warn(`⚠️  GitHub Search API limit reached: fetched ${allCommits.length} commits, but total is ${totalCount.toLocaleString()}. Using total count for stats.`);
      }
    } catch (error) {
      console.warn('Failed to search commits:', error);
      // If search fails, totalCount will be 0, and we'll use commits.length
      totalCount = allCommits.length;
    }

    return { commits: allCommits, totalCount: totalCount || allCommits.length };
  }

  private async searchUserPRs(username: string): Promise<Array<{ title: string; repo: string; merged: boolean; date: string; number: number; owner: string; additions?: number; deletions?: number }>> {
    const prs: Array<{ title: string; repo: string; merged: boolean; date: string; number: number; owner: string; additions?: number; deletions?: number }> = [];
    const q = `author:${username} type:pr created:${this.year}-01-01..${this.year}-12-31`;

    try {
      let page = 1;
      const perPage = 100;
      
      while (page <= 10) {
        const { data } = await this.octokit.rest.search.issuesAndPullRequests({
          q,
          per_page: perPage,
          page,
          sort: 'created',
          order: 'desc',
        });

        for (const item of data.items) {
          const repoUrl = item.repository_url || '';
          const repoParts = repoUrl.split('/');
          const repoName = repoParts[repoParts.length - 1] || 'unknown';
          const owner = repoParts[repoParts.length - 2] || 'unknown';
          
          prs.push({
            title: item.title,
            repo: repoName,
            owner,
            number: item.number,
            merged: item.pull_request?.merged_at !== null && item.pull_request?.merged_at !== undefined,
            date: item.created_at,
          });
        }

        if (data.items.length < perPage || prs.length >= data.total_count) {
          break;
        }
        page++;
      }

      // Fetch PR stats for lines calculation (limit to first 100 to avoid rate limits)
      // We calculate from a sample to avoid hitting rate limits, but this gives a good estimate
      if (prs.length > 0) {
        await this.fetchPRStats(prs.slice(0, Math.min(100, prs.length)));
      }
    } catch (error) {
      console.warn('Failed to search PRs:', error);
    }

    return prs;
  }

  private async fetchPRStats(prs: Array<{ owner: string; repo: string; number: number; merged?: boolean; additions?: number; deletions?: number }>): Promise<void> {
    const batchSize = 5;
    for (let i = 0; i < prs.length; i += batchSize) {
      const batch = prs.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (pr) => {
          try {
            const { data } = await this.octokit.rest.pulls.get({
              owner: pr.owner,
              repo: pr.repo,
              pull_number: pr.number,
            });
            pr.additions = data.additions || 0;
            pr.deletions = data.deletions || 0;
            pr.merged = data.merged || false;
          } catch {
            pr.additions = 0;
            pr.deletions = 0;
          }
        })
      );
      if (i + batchSize < prs.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  private async fetchRepoLanguages(repos: Array<{ owner: string; name: string }>): Promise<Map<string, string>> {
    const languageMap = new Map<string, string>();
    const batchSize = 5;
    
    for (let i = 0; i < repos.length; i += batchSize) {
      const batch = repos.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (repo) => {
          try {
            const { data } = await this.octokit.rest.repos.get({
              owner: repo.owner,
              repo: repo.name,
            });
            if (data.language) {
              languageMap.set(`${repo.owner}/${repo.name}`, data.language);
            }
          } catch {
          }
        })
      );
      if (i + batchSize < repos.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    return languageMap;
  }

  /**
   * Fetch commit diffs for potentially shameful commits (short messages, lazy patterns, etc.)
   * This allows AI to analyze actual code changes, not just message length
   */
  async fetchCommitDiffsForAnalysis(commits: RichCommitData[]): Promise<RichCommitData[]> {
    // Identify potentially shameful commits based on message patterns
    const potentiallyShameful = commits
      .filter(c => {
        const msg = c.message.trim().toLowerCase();
        const msgLength = c.message.trim().length;
        return (
          msgLength <= 10 ||
          msgLength <= 20 && (msg === 'fix' || msg === 'update' || msg === 'wip' || msg === 'temp' || msg.includes('test')) ||
          msgLength <= 5
        );
      })
      .slice(0, 10); // Limit to 10 commits to avoid rate limits and token bloat

    if (potentiallyShameful.length === 0) {
      return commits;
    }

    const batchSize = 3;
    const commitsWithDiffs = [...commits];

    for (let i = 0; i < potentiallyShameful.length; i += batchSize) {
      const batch = potentiallyShameful.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (commit) => {
          if (!commit.sha || !commit.owner || !commit.repo) return;

          try {
            const { data } = await this.octokit.rest.repos.getCommit({
              owner: commit.owner,
              repo: commit.repo,
              ref: commit.sha,
            });

            // Build diff string from changed files
            const diffParts = data.files
              ?.slice(0, 5) // Limit to first 5 files to avoid huge diffs
              .slice(0, 3) // Only first 3 files per commit
              .map(file => {
                const patch = file.patch || '';
                // Truncate each file's patch to 1500 chars to stay within token limits
                const truncatedPatch = patch.length > 1500 ? patch.slice(0, 1500) + '...' : patch;
                return `--- ${file.filename} (+${file.additions}/-${file.deletions}) ---\n${truncatedPatch}`;
              }) || [];

            const fullDiff = diffParts.join('\n\n');

            // Update the commit in the array with the diff
            const index = commitsWithDiffs.findIndex(c => c.sha === commit.sha);
            if (index !== -1) {
              commitsWithDiffs[index] = {
                ...commitsWithDiffs[index],
                diff: fullDiff,
                filesChanged: data.files?.map(f => f.filename) || [],
              };
            }
          } catch (error) {
            // Silently fail - we'll just use message-based analysis for this commit
            console.warn(`Failed to fetch diff for commit ${commit.sha}:`, error);
          }
        })
      );

      // Rate limit: wait between batches
      if (i + batchSize < potentiallyShameful.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return commitsWithDiffs;
  }

  private analyzeShamefulCommits(messages: string[]): WrappedStats['shamefulCommits'] {
    const lazyPatterns = ['fix', 'update', 'wip', 'temp', 'test', 'stuff', 'changes', 'misc', '.', '..', '...'];
    const curseWords = ['fuck', 'shit', 'damn', 'crap', 'hell', 'ass'];
    
    let singleCharCommits = 0;
    let fixOnlyCommits = 0;
    let wipCommits = 0;
    let emptyishCommits = 0;
    let allCapsCommits = 0;
    let cursingCommits = 0;
    
    const lazyMessageCounts = new Map<string, number>();
    
    for (const msg of messages) {
      const trimmed = msg.trim();
      const lower = trimmed.toLowerCase();
      
      if (trimmed.length <= 1) singleCharCommits++;
      if (trimmed.length <= 5) emptyishCommits++;
      if (lower === 'fix' || lower === 'fixed' || lower === 'fixes') fixOnlyCommits++;
      if (lower === 'wip' || lower.includes('work in progress')) wipCommits++;
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) allCapsCommits++;
      if (curseWords.some(word => lower.includes(word))) cursingCommits++;
      
      if (lazyPatterns.includes(lower) || trimmed.length <= 10) {
        lazyMessageCounts.set(trimmed, (lazyMessageCounts.get(trimmed) || 0) + 1);
      }
    }
    
    const laziestMessages = Array.from(lazyMessageCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    const sortedByLengthAsc = [...messages].sort((a, b) => a.length - b.length);
    const shortestMsg = sortedByLengthAsc[0];
    const longestMsg = [...messages].sort((a, b) => b.length - a.length)[0];
    
    return {
      laziestMessages,
      singleCharCommits,
      fixOnlyCommits,
      wcCommits: wipCommits,
      emptyishCommits,
      allCapsCommits,
      cursingCommits,
      longestMessage: longestMsg ? { message: longestMsg.slice(0, 200), length: longestMsg.length } : null,
      shortestMessage: shortestMsg ? { message: shortestMsg, length: shortestMsg.length } : null,
    };
  }

  private analyzeCommitPatterns(
    commitDates: Set<string>,
    commitsByMonth: number[]
  ): WrappedStats['commitPatterns'] {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    const maxMonth = commitsByMonth.indexOf(Math.max(...commitsByMonth));
    const nonZeroMonths = commitsByMonth.map((c, i) => ({ c, i })).filter(x => x.c > 0);
    const minMonth = nonZeroMonths.length > 0 
      ? nonZeroMonths.reduce((min, x) => x.c < min.c ? x : min).i 
      : -1;
    
    const dateCounts = new Map<string, number>();
    let fridayDeploys = 0;
    
    for (const dateStr of Array.from(commitDates)) {
      dateCounts.set(dateStr, (dateCounts.get(dateStr) || 0) + 1);
      const dayOfWeek = new Date(dateStr).getDay();
      if (dayOfWeek === 5) fridayDeploys++;
    }
    
    const sortedDays = Array.from(dateCounts.entries()).sort((a, b) => b[1] - a[1]);
    const biggestDay = sortedDays[0];
    
    const totalCommits = commitsByMonth.reduce((a, b) => a + b, 0);
    const daysWithCommits = commitDates.size;
    
    return {
      avgCommitsPerDay: daysWithCommits > 0 ? Math.round((totalCommits / daysWithCommits) * 10) / 10 : 0,
      mostProductiveMonth: monthNames[maxMonth] || 'Unknown',
      deadestMonth: minMonth >= 0 ? monthNames[minMonth] : 'None',
      fridayDeploys,
      biggestCommitDay: biggestDay ? { date: biggestDay[0], count: biggestDay[1] } : null,
    };
  }

  private calculateStreaks(commitDates: Set<string>): { longestStreak: number; currentStreak: number } {
    const sortedDates = Array.from(commitDates).sort();
    let longestStreak = 0;
    let currentStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    for (const dateStr of sortedDates) {
      const date = new Date(dateStr);
      
      if (prevDate) {
        const diffDays = Math.floor((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }

      longestStreak = Math.max(longestStreak, tempStreak);
      prevDate = date;
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().split('T')[0];

    if (commitDates.has(todayStr) || commitDates.has(yesterdayStr)) {
      currentStreak = tempStreak;
    }

    return { longestStreak, currentStreak };
  }

  private analyzeCodeQuality(
    messages: string[],
    shamefulCommits: WrappedStats['shamefulCommits']
  ): WrappedStats['codeQuality'] {
    const aiIndicators = this.detectAIPatterns(messages);
    const envLeakWarnings = this.detectEnvLeaks(messages);
    
    const aiVibeScore = this.calculateAIVibeScore(aiIndicators, messages.length);
    const slopScore = this.calculateSlopScore(shamefulCommits, messages.length);
    const suggestions = this.generateSuggestions(aiIndicators, envLeakWarnings, shamefulCommits, slopScore);
    const hygieneGrade = this.calculateHygieneGrade(aiVibeScore, slopScore, envLeakWarnings.length);

    return {
      aiVibeScore,
      aiIndicators,
      slopScore,
      envLeakWarnings,
      suggestions,
      hygieneGrade,
    };
  }

  private detectAIPatterns(messages: string[]): WrappedStats['codeQuality']['aiIndicators'] {
    let genericMessages = 0;
    let perfectFormatting = 0;
    let longDescriptions = 0;
    let buzzwordDensity = 0;

    const genericPatterns = [
      /^(update|add|fix|remove|refactor|improve|implement|create|delete|modify)\s+\w+/i,
      /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?:/i,
    ];
    
    const buzzwords = ['refactor', 'optimize', 'enhance', 'improve', 'streamline', 'modernize', 
                       'implement', 'leverage', 'utilize', 'ensure', 'maintain', 'robust'];
    
    const conventionalCommitPattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?:\s+.+/;

    for (const msg of messages) {
      const trimmed = msg.trim();
      const lower = trimmed.toLowerCase();
      const firstLine = trimmed.split('\n')[0];
      
      if (genericPatterns.some(p => p.test(firstLine))) {
        genericMessages++;
      }
      
      if (conventionalCommitPattern.test(firstLine)) {
        perfectFormatting++;
      }
      
      if (trimmed.length > 200 || trimmed.split('\n').length > 3) {
        longDescriptions++;
      }
      
      const buzzwordCount = buzzwords.filter(bw => lower.includes(bw)).length;
      if (buzzwordCount >= 2) {
        buzzwordDensity++;
      }
    }

    return { genericMessages, perfectFormatting, longDescriptions, buzzwordDensity };
  }

  private detectEnvLeaks(messages: string[]): WrappedStats['codeQuality']['envLeakWarnings'] {
    const patterns: Array<{ type: 'api_key' | 'secret' | 'password' | 'token' | 'credential'; regex: RegExp }> = [
      { type: 'api_key', regex: /api[_-]?key\s*[=:]\s*['"]?[\w-]{20,}/i },
      { type: 'secret', regex: /secret\s*[=:]\s*['"]?[\w-]{16,}/i },
      { type: 'password', regex: /password\s*[=:]\s*['"]?[^\s'"]{8,}/i },
      { type: 'token', regex: /(access[_-]?token|auth[_-]?token|bearer)\s*[=:]\s*['"]?[\w.-]{20,}/i },
      { type: 'credential', regex: /(aws|gcp|azure|stripe|twilio|sendgrid)[_-]?(key|secret|token)\s*[=:]/i },
    ];

    const warnings = new Map<string, { count: number; example?: string }>();

    for (const msg of messages) {
      for (const { type, regex } of patterns) {
        if (regex.test(msg)) {
          const existing = warnings.get(type) || { count: 0 };
          existing.count++;
          if (!existing.example) {
            existing.example = msg.slice(0, 50).replace(/[\w-]{10,}/g, '***REDACTED***') + '...';
          }
          warnings.set(type, existing);
        }
      }
    }

    return Array.from(warnings.entries()).map(([type, data]) => ({
      type: type as 'api_key' | 'secret' | 'password' | 'token' | 'credential',
      count: data.count,
      example: data.example,
    }));
  }

  private calculateAIVibeScore(
    indicators: WrappedStats['codeQuality']['aiIndicators'],
    totalMessages: number
  ): number {
    if (totalMessages === 0) return 0;
    
    const genericRatio = indicators.genericMessages / totalMessages;
    const formattingRatio = indicators.perfectFormatting / totalMessages;
    const longRatio = indicators.longDescriptions / totalMessages;
    const buzzwordRatio = indicators.buzzwordDensity / totalMessages;
    
    const score = (
      (genericRatio * 25) +
      (formattingRatio * 30) +
      (longRatio * 20) +
      (buzzwordRatio * 25)
    );
    
    return Math.min(100, Math.round(score));
  }

  private calculateSlopScore(
    shameful: WrappedStats['shamefulCommits'],
    totalMessages: number
  ): number {
    if (totalMessages === 0) return 0;
    
    const singleCharRatio = shameful.singleCharCommits / totalMessages;
    const fixOnlyRatio = shameful.fixOnlyCommits / totalMessages;
    const wipRatio = shameful.wcCommits / totalMessages;
    const emptyRatio = shameful.emptyishCommits / totalMessages;
    
    const score = (
      (singleCharRatio * 40) +
      (fixOnlyRatio * 25) +
      (wipRatio * 20) +
      (emptyRatio * 15)
    ) * 100;
    
    return Math.min(100, Math.round(score));
  }

  private generateSuggestions(
    aiIndicators: WrappedStats['codeQuality']['aiIndicators'],
    envLeaks: WrappedStats['codeQuality']['envLeakWarnings'],
    shameful: WrappedStats['shamefulCommits'],
    slopScore: number
  ): WrappedStats['codeQuality']['suggestions'] {
    const suggestions: WrappedStats['codeQuality']['suggestions'] = [];

    if (envLeaks.length > 0) {
      suggestions.push({
        category: 'security',
        title: 'Potential credential exposure detected',
        description: 'Some commit messages may contain API keys or secrets. Use environment variables and .gitignore.',
        priority: 'high',
      });
    }

    if (slopScore > 50) {
      suggestions.push({
        category: 'commit_messages',
        title: 'Improve commit message quality',
        description: 'Many commits have minimal messages. Descriptive messages help future debugging.',
        priority: 'medium',
      });
    }

    if (shameful.singleCharCommits > 10) {
      suggestions.push({
        category: 'commit_messages',
        title: 'Avoid single-character commits',
        description: `You had ${shameful.singleCharCommits} single-char commits. Each commit should explain the "why".`,
        priority: 'medium',
      });
    }

    if (aiIndicators.perfectFormatting > aiIndicators.genericMessages * 0.8) {
      suggestions.push({
        category: 'workflow',
        title: 'Great commit formatting!',
        description: 'Your conventional commit usage is excellent. Keep it up!',
        priority: 'low',
      });
    }

    if (shameful.cursingCommits > 5) {
      suggestions.push({
        category: 'consistency',
        title: 'Keep it professional',
        description: 'Some colorful language detected. Consider your commit history is public!',
        priority: 'low',
      });
    }

    return suggestions;
  }

  private calculateHygieneGrade(
    aiVibeScore: number,
    slopScore: number,
    envLeakCount: number
  ): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (envLeakCount > 0) return 'D';
    
    const combinedScore = (100 - slopScore) * 0.7 + (aiVibeScore > 50 ? 30 : aiVibeScore * 0.6);
    
    if (combinedScore >= 85) return 'A';
    if (combinedScore >= 70) return 'B';
    if (combinedScore >= 55) return 'C';
    if (combinedScore >= 40) return 'D';
    return 'F';
  }
}
