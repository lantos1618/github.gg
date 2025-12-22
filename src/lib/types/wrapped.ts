import type { WrappedStats, WrappedAIInsights } from '@/db/schema/wrapped';

export type { WrappedStats, WrappedAIInsights };

export type WrappedData = {
  id: string;
  userId: string;
  username: string;
  year: number;
  stats: WrappedStats;
  aiInsights: WrappedAIInsights | null;
  badgeTheme: string;
  isPublic: boolean;
  shareCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type WrappedTeaser = {
  username: string;
  year: number;
  totalCommits: number;
  topLanguage: string | null;
  personalityType: string | null;
  isLocked: true;
};

export type StarGateStatus = {
  hasStarred: boolean;
  repoUrl: string;
  username: string;
};

export type WrappedGenerationProgress = {
  type: 'progress';
  progress: number;
  message: string;
};

export type WrappedGenerationComplete = {
  type: 'complete';
  data: WrappedData;
};

export type WrappedGenerationError = {
  type: 'error';
  message: string;
};

export type WrappedGenerationEvent = 
  | WrappedGenerationProgress 
  | WrappedGenerationComplete 
  | WrappedGenerationError
  | { type: 'heartbeat'; timestamp: number };

export const PERSONALITY_TYPES = [
  { id: 'midnight-archaeologist', name: 'The Midnight Archaeologist', emoji: '🌙', pattern: 'late-night-legacy' },
  { id: 'documentation-evangelist', name: 'The Documentation Evangelist', emoji: '📚', pattern: 'docs-heavy' },
  { id: 'yolo-deployer', name: 'The YOLO Deployer', emoji: '🚀', pattern: 'friday-deploys' },
  { id: 'perfectionist', name: 'The Perfectionist', emoji: '✨', pattern: 'many-small-commits' },
  { id: 'big-bang-theorist', name: 'The Big Bang Theorist', emoji: '💥', pattern: 'few-massive-commits' },
  { id: 'social-butterfly', name: 'The Social Butterfly', emoji: '🦋', pattern: 'many-collaborators' },
  { id: 'lone-wolf', name: 'The Lone Wolf', emoji: '🐺', pattern: 'solo-commits' },
  { id: 'polyglot', name: 'The Polyglot', emoji: '🗣️', pattern: 'many-languages' },
  { id: 'specialist', name: 'The Specialist', emoji: '🎯', pattern: 'one-language' },
  { id: 'phoenix', name: 'The Phoenix', emoji: '🔥', pattern: 'repo-restarts' },
  { id: 'streak-demon', name: 'The Streak Demon', emoji: '👹', pattern: 'long-streaks' },
  { id: 'weekend-warrior', name: 'The Weekend Warrior', emoji: '⚔️', pattern: 'weekend-heavy' },
  { id: 'corporate-soldier', name: 'The Corporate Soldier', emoji: '💼', pattern: 'nine-to-five' },
  { id: 'chaos-agent', name: 'The Chaos Agent', emoji: '🎲', pattern: 'random-patterns' },
] as const;

export type PersonalityTypeId = typeof PERSONALITY_TYPES[number]['id'];

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f7df1e',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#239120',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Scala: '#c22d40',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Dart: '#00B4AB',
  Elixir: '#6e4a7e',
  Haskell: '#5e5086',
  Lua: '#000080',
  R: '#198CE7',
  Julia: '#9558B2',
  Zig: '#F7A41D',
  OCaml: '#3be133',
  Clojure: '#db5855',
  Erlang: '#B83998',
  Nim: '#FFE953',
  Crystal: '#000100',
  Default: '#8b949e',
};

export function getLanguageColor(language: string): string {
  return LANGUAGE_COLORS[language] || LANGUAGE_COLORS.Default;
}

export const GITHUB_GG_REPO = {
  owner: 'lantos1618',
  repo: 'github.gg',
  url: 'https://github.com/lantos1618/github.gg',
};
