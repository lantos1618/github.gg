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
  filesChanged?: string[];
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

  async fetchWrappedStats(username: string): Promise<{ stats: WrappedStats; rawData: WrappedRawData }> {
    const [commitResult, pullRequests] = await Promise.all([
      this.searchUserCommits(username),
      this.searchUserPRs(username),
    ]);
    
    const commits = commitResult.commits;
    const totalCommitsFromSearch = commitResult.totalCount;

    // Infer timezone from commit patterns
    const timezoneOffset = this.inferTimezone(commits);

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

      if (commit.repository.language) {
        languageCounts.set(commit.repository.language, (languageCounts.get(commit.repository.language) || 0) + 1);
      }
    }

    // Use the total from search API if available (may be > 1000), otherwise use fetched count
    const totalCommits = totalCommitsFromSearch > commits.length ? totalCommitsFromSearch : commits.length;

    const totalLanguageWeight = Array.from(languageCounts.values()).reduce((a, b) => a + b, 0) || 1;
    const languages = Array.from(languageCounts.entries())
      .map(([name, count]) => ({
        name,
        percentage: Math.round((count / totalLanguageWeight) * 100),
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

    const richCommits: RichCommitData[] = commits.map(c => ({
      message: c.commit.message,
      repo: c.repository.name,
      date: c.commit.author?.date || '',
    }));

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
    // Fetch PR stats in parallel batches to avoid rate limits
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
            // Update merged status from the full PR data (more reliable than search API)
            pr.merged = data.merged || false;
          } catch (error) {
            // Silently fail for individual PRs to avoid breaking the whole process
            pr.additions = 0;
            pr.deletions = 0;
            // Keep existing merged status if fetch fails
          }
        })
      );
      // Small delay between batches to be respectful of rate limits
      if (i + batchSize < prs.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
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
}
