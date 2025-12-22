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

  async fetchWrappedStats(username: string): Promise<WrappedStats> {
    const commits = await this.searchUserCommits(username);

    const commitsByHour = new Array(24).fill(0);
    const commitsByDay = new Array(7).fill(0);
    const commitsByMonth = new Array(12).fill(0);
    const commitMessages: string[] = [];
    const repoCommitCounts = new Map<string, number>();
    const repoData = new Map<string, { language: string | null; stars: number; owner: string }>();
    const languageCounts = new Map<string, number>();
    const commitDates = new Set<string>();

    let lateNightCommits = 0;
    let weekendCommits = 0;
    let mondayCommits = 0;
    let firstCommitDate: string | null = null;
    let lastCommitDate: string | null = null;

    for (const commit of commits) {
      const dateStr = commit.commit.author?.date;
      if (!dateStr) continue;

      const date = new Date(dateStr);
      const hour = date.getUTCHours();
      const day = date.getUTCDay();
      const month = date.getUTCMonth();

      commitMessages.push(commit.commit.message);
      commitsByHour[hour]++;
      commitsByDay[day]++;
      commitsByMonth[month]++;
      commitDates.add(dateStr.split('T')[0]);

      if (hour >= 0 && hour < 5) lateNightCommits++;
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

    const totalCommits = commits.length;

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

    return {
      totalCommits,
      totalPRs: 0,
      totalPRsMerged: 0,
      totalIssues: 0,
      totalReviews: 0,
      linesAdded: 0,
      linesDeleted: 0,
      topRepos,
      languages,
      commitsByHour,
      commitsByDay,
      commitsByMonth,
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
  }

  private async searchUserCommits(username: string): Promise<SearchCommitItem[]> {
    const allCommits: SearchCommitItem[] = [];
    const q = `author:${username} committer-date:${this.year}-01-01..${this.year}-12-31`;

    try {
      let page = 1;
      const perPage = 100;
      
      while (page <= 10) {
        const { data } = await this.octokit.rest.search.commits({
          q,
          per_page: perPage,
          page,
          sort: 'committer-date',
          order: 'desc',
        });

        allCommits.push(...(data.items as SearchCommitItem[]));

        if (data.items.length < perPage || allCommits.length >= data.total_count) {
          break;
        }
        page++;
      }
    } catch (error) {
      console.warn('Failed to search commits:', error);
    }

    return allCommits;
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
    
    for (const dateStr of commitDates) {
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
