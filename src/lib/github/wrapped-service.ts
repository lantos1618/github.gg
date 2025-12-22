import { Octokit } from '@octokit/rest';
import type { WrappedStats } from '@/db/schema/wrapped';
import { getLanguageColor, GITHUB_GG_REPO } from '@/lib/types/wrapped';

type ContributionsResponse = {
  user: {
    contributionsCollection: {
      totalCommitContributions: number;
      totalPullRequestContributions: number;
      totalPullRequestReviewContributions: number;
      totalIssueContributions: number;
      restrictedContributionsCount: number;
      contributionCalendar: {
        totalContributions: number;
        weeks: Array<{
          contributionDays: Array<{
            date: string;
            contributionCount: number;
            weekday: number;
          }>;
        }>;
      };
      commitContributionsByRepository: Array<{
        repository: {
          name: string;
          owner: { login: string };
          primaryLanguage: { name: string; color: string } | null;
          stargazerCount: number;
        };
        contributions: {
          totalCount: number;
        };
      }>;
    };
  };
};

type GitHubEvent = {
  type: string;
  created_at: string;
  payload: {
    commits?: Array<{ message: string; sha: string }>;
    action?: string;
    pull_request?: { merged: boolean };
    review?: { state: string };
    size?: number;
  };
  repo: { name: string };
};

type CommitData = {
  sha: string;
  commit: {
    message: string;
    author: { date: string };
  };
  stats?: { additions: number; deletions: number };
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
    const startDate = new Date(`${this.year}-01-01T00:00:00Z`);
    const endDate = new Date(`${this.year}-12-31T23:59:59Z`);

    const [contributions, events, repos, commitStats] = await Promise.all([
      this.fetchYearContributions(username),
      this.fetchYearEvents(username, startDate, endDate),
      this.fetchUserRepos(username),
      this.fetchCommitStats(username, startDate, endDate),
    ]);

    const commitsByHour = new Array(24).fill(0);
    const commitsByDay = new Array(7).fill(0);
    const commitsByMonth = new Array(12).fill(0);
    const commitMessages: string[] = [];
    const collaboratorMap = new Map<string, { avatar: string; count: number }>();
    const repoCommitCounts = new Map<string, number>();
    const languageCounts = new Map<string, number>();

    // GraphQL contributionsCollection returns full year; Events API only has 90 days
    let totalCommits = contributions?.totalCommitContributions || 0;
    let totalPRs = contributions?.totalPullRequestContributions || 0;
    let totalPRsMerged = 0;
    let totalIssues = contributions?.totalIssueContributions || 0;
    let totalReviews = contributions?.totalPullRequestReviewContributions || 0;

    if (contributions?.contributionCalendar) {
      for (const week of contributions.contributionCalendar.weeks) {
        for (const day of week.contributionDays) {
          if (day.contributionCount > 0) {
            const date = new Date(day.date);
            const month = date.getMonth();
            commitsByDay[day.weekday] += day.contributionCount;
            commitsByMonth[month] += day.contributionCount;
          }
        }
      }
    }

    if (contributions?.commitContributionsByRepository) {
      for (const repoContrib of contributions.commitContributionsByRepository) {
        const repoName = repoContrib.repository.name;
        repoCommitCounts.set(repoName, repoContrib.contributions.totalCount);
        if (repoContrib.repository.primaryLanguage) {
          const lang = repoContrib.repository.primaryLanguage.name;
          languageCounts.set(lang, (languageCounts.get(lang) || 0) + repoContrib.contributions.totalCount);
        }
      }
    }
    let linesAdded = 0;
    let linesDeleted = 0;
    let lateNightCommits = 0;
    let weekendCommits = 0;
    let mondayCommits = 0;
    let firstCommitDate: string | null = null;
    let lastCommitDate: string | null = null;

    for (const event of events) {
      const eventDate = new Date(event.created_at);
      const hour = eventDate.getHours();

      switch (event.type) {
        case 'PushEvent':
          const commits = event.payload.commits || [];
          
          for (const commit of commits) {
            commitMessages.push(commit.message);
            commitsByHour[hour]++;

            if (hour >= 0 && hour < 5) lateNightCommits++;
            if (eventDate.getDay() === 0 || eventDate.getDay() === 6) weekendCommits++;
            if (eventDate.getDay() === 1) mondayCommits++;

            if (!firstCommitDate || event.created_at < firstCommitDate) {
              firstCommitDate = event.created_at;
            }
            if (!lastCommitDate || event.created_at > lastCommitDate) {
              lastCommitDate = event.created_at;
            }
          }
          break;

        case 'PullRequestEvent':
          if (event.payload.pull_request?.merged) {
            totalPRsMerged++;
          }
          break;
      }
    }

    linesAdded = commitStats.additions;
    linesDeleted = commitStats.deletions;

    for (const repo of repos) {
      if (repo.language) {
        languageCounts.set(
          repo.language,
          (languageCounts.get(repo.language) || 0) + (repo.stargazers_count || 1)
        );
      }
    }

    const totalLanguageWeight = Array.from(languageCounts.values()).reduce((a, b) => a + b, 0);
    const languages = Array.from(languageCounts.entries())
      .map(([name, count]) => ({
        name,
        percentage: Math.round((count / totalLanguageWeight) * 100),
        color: getLanguageColor(name),
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 8);

    let topRepos: Array<{ name: string; owner: string; commits: number; stars: number; language: string | null }> = [];
    
    if (contributions?.commitContributionsByRepository) {
      topRepos = contributions.commitContributionsByRepository
        .map(repoContrib => ({
          name: repoContrib.repository.name,
          owner: repoContrib.repository.owner.login,
          commits: repoContrib.contributions.totalCount,
          stars: repoContrib.repository.stargazerCount,
          language: repoContrib.repository.primaryLanguage?.name ?? null,
        }))
        .sort((a, b) => b.commits - a.commits)
        .slice(0, 5);
    } else {
      for (const repo of repos) {
        if (repoCommitCounts.has(repo.name)) {
          topRepos.push({
            name: repo.name,
            owner: repo.owner?.login || username,
            commits: repoCommitCounts.get(repo.name) || 0,
            stars: repo.stargazers_count || 0,
            language: repo.language ?? null,
          });
        }
      }
      topRepos = topRepos.sort((a, b) => b.commits - a.commits).slice(0, 5);
    }

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

    const shamefulCommits = this.analyzeShamefulCommits(commitMessages, messageCounts);
    const commitPatterns = this.analyzeCommitPatterns(events, commitsByMonth, this.year);

    const { longestStreak, currentStreak } = this.calculateStreaks(events, this.year);

    return {
      totalCommits,
      totalPRs,
      totalPRsMerged,
      totalIssues,
      totalReviews,
      linesAdded,
      linesDeleted,
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
      topCollaborators: Array.from(collaboratorMap.entries())
        .map(([username, data]) => ({
          username,
          avatar: data.avatar,
          sharedPRs: data.count,
        }))
        .sort((a, b) => b.sharedPRs - a.sharedPRs)
        .slice(0, 5),
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

  private analyzeShamefulCommits(
    messages: string[],
    messageCounts: Map<string, number>
  ): WrappedStats['shamefulCommits'] {
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
    
    const sortedByLength = [...messages].sort((a, b) => a.length - b.length);
    const shortestMsg = sortedByLength[0];
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
    events: GitHubEvent[],
    commitsByMonth: number[],
    year: number
  ): WrappedStats['commitPatterns'] {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    const maxMonth = commitsByMonth.indexOf(Math.max(...commitsByMonth));
    const minMonth = commitsByMonth.indexOf(Math.min(...commitsByMonth.filter(c => c > 0)));
    
    const commitsByDate = new Map<string, number>();
    let fridayDeploys = 0;
    
    for (const event of events) {
      if (event.type === 'PushEvent') {
        const date = new Date(event.created_at);
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();
        const commits = event.payload.commits?.length || 0;
        
        commitsByDate.set(dateStr, (commitsByDate.get(dateStr) || 0) + commits);
        if (dayOfWeek === 5) fridayDeploys += commits;
      }
    }
    
    const sortedDays = Array.from(commitsByDate.entries()).sort((a, b) => b[1] - a[1]);
    const biggestDay = sortedDays[0];
    
    const daysWithCommits = commitsByDate.size;
    const totalCommits = Array.from(commitsByDate.values()).reduce((a, b) => a + b, 0);
    
    return {
      avgCommitsPerDay: daysWithCommits > 0 ? Math.round((totalCommits / daysWithCommits) * 10) / 10 : 0,
      mostProductiveMonth: monthNames[maxMonth] || 'Unknown',
      deadestMonth: minMonth >= 0 ? monthNames[minMonth] : 'None',
      fridayDeploys,
      biggestCommitDay: biggestDay ? { date: biggestDay[0], count: biggestDay[1] } : null,
    };
  }

  private async fetchYearContributions(username: string): Promise<ContributionsResponse['user']['contributionsCollection'] | null> {
    const query = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            totalPullRequestContributions
            totalPullRequestReviewContributions
            totalIssueContributions
            restrictedContributionsCount
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                  weekday
                }
              }
            }
            commitContributionsByRepository(maxRepositories: 20) {
              repository {
                name
                owner { login }
                primaryLanguage { name color }
                stargazerCount
              }
              contributions {
                totalCount
              }
            }
          }
        }
      }
    `;

    try {
      const response = await this.octokit.graphql<ContributionsResponse>(query, {
        username,
        from: `${this.year}-01-01T00:00:00Z`,
        to: `${this.year}-12-31T23:59:59Z`,
      });
      return response.user?.contributionsCollection || null;
    } catch (error) {
      console.warn('Failed to fetch contributions via GraphQL:', error);
      return null;
    }
  }

  private async fetchYearEvents(
    username: string,
    startDate: Date,
    endDate: Date
  ): Promise<GitHubEvent[]> {
    const allEvents: GitHubEvent[] = [];
    
    try {
      const events = await this.octokit.paginate(
        'GET /users/{username}/events',
        { username, per_page: 100 }
      );

      for (const event of events as GitHubEvent[]) {
        const eventDate = new Date(event.created_at);
        if (eventDate >= startDate && eventDate <= endDate) {
          allEvents.push(event);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch events:', error);
    }

    return allEvents;
  }

  private async fetchUserRepos(username: string) {
    try {
      const repos = await this.octokit.paginate(
        'GET /users/{username}/repos',
        { username, per_page: 100, sort: 'pushed' }
      );
      return repos.filter((repo: { private?: boolean }) => !repo.private);
    } catch (error) {
      console.warn('Failed to fetch repos:', error);
      return [];
    }
  }

  private async fetchCommitStats(
    username: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ additions: number; deletions: number }> {
    let additions = 0;
    let deletions = 0;

    try {
      const repos = await this.fetchUserRepos(username);
      const topRepos = repos.slice(0, 5);

      for (const repo of topRepos) {
        try {
          const commits = await this.octokit.paginate(
            'GET /repos/{owner}/{repo}/commits',
            {
              owner: repo.owner?.login || username,
              repo: repo.name,
              author: username,
              since: startDate.toISOString(),
              until: endDate.toISOString(),
              per_page: 50,
            }
          );

          for (const commit of (commits as CommitData[]).slice(0, 20)) {
            try {
              const { data: commitDetail } = await this.octokit.rest.repos.getCommit({
                owner: repo.owner?.login || username,
                repo: repo.name,
                ref: commit.sha,
              });
              additions += commitDetail.stats?.additions || 0;
              deletions += commitDetail.stats?.deletions || 0;
            } catch {
              continue;
            }
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch commit stats:', error);
    }

    return { additions, deletions };
  }

  private calculateStreaks(events: GitHubEvent[], _year: number): { longestStreak: number; currentStreak: number } {
    const commitDates = new Set<string>();
    
    for (const event of events) {
      if (event.type === 'PushEvent') {
        const date = event.created_at.split('T')[0];
        commitDates.add(date);
      }
    }

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
