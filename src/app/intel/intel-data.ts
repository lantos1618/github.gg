// Mock data for multiple repos
export const MOCK_REPOS = [
  {
    id: 1,
    owner: 'vercel',
    name: 'next.js',
    stars: 124532,
    forks: 26847,
    qualityScore: 94,
    realStars: 121847,
    suspiciousStars: 2134,
    likelyBots: 551,
    color: '#0070f3',
  },
  {
    id: 2,
    owner: 'facebook',
    name: 'react',
    stars: 218432,
    forks: 44521,
    qualityScore: 97,
    realStars: 215102,
    suspiciousStars: 2830,
    likelyBots: 500,
    color: '#61dafb',
  },
  {
    id: 3,
    owner: 'sveltejs',
    name: 'svelte',
    stars: 78234,
    forks: 4123,
    qualityScore: 91,
    realStars: 75890,
    suspiciousStars: 1844,
    likelyBots: 500,
    color: '#ff3e00',
  },
];

export type IntelRepo = (typeof MOCK_REPOS)[number];

// Mock network data - shared stargazers between repos
export const MOCK_NETWORK = {
  sharedStargazers: [
    { repos: ['next.js', 'react'], count: 45230, pct: 36 },
    { repos: ['next.js', 'svelte'], count: 12450, pct: 10 },
    { repos: ['react', 'svelte'], count: 28340, pct: 13 },
    { repos: ['next.js', 'react', 'svelte'], count: 8920, pct: 7 },
  ],
  botNetworks: [
    { name: 'star-farm-cn-01', affectedRepos: ['next.js', 'react'], accountCount: 234, detected: '2d ago' },
    { name: 'boost-network-42', affectedRepos: ['svelte'], accountCount: 89, detected: '1w ago' },
  ],
  topCrossRepoUsers: [
    { username: 'dan_abramov', repos: 3, stars: 3, prs: 12, comments: 156, influence: 98 },
    { username: 'sindresorhus', repos: 3, stars: 3, prs: 5, comments: 23, influence: 95 },
    { username: 'kentcdodds', repos: 3, stars: 3, prs: 8, comments: 89, influence: 94 },
    { username: 'tannerlinsley', repos: 2, stars: 2, prs: 3, comments: 45, influence: 88 },
  ],
};

export const MOCK_USERS = [
  { username: 'sarah-chen', name: 'Sarah Chen', avatar: 'https://avatars.githubusercontent.com/u/1?v=4', company: 'Stripe', role: 'Staff Engineer', location: 'San Francisco, CA', email: 'sarah@...', score: 94, starred: '3d ago', comments: 2, prs: 1, followers: 2341 },
  { username: 'mike-dev', name: 'Mike Johnson', avatar: 'https://avatars.githubusercontent.com/u/2?v=4', company: 'Google', role: 'Senior Developer', location: 'Seattle, WA', email: 'mike@...', score: 87, starred: '1w ago', comments: 5, prs: 0, followers: 892 },
  { username: 'alex_kumar', name: 'Alex Kumar', avatar: 'https://avatars.githubusercontent.com/u/3?v=4', company: 'Meta', role: 'Tech Lead', location: 'New York, NY', email: 'alex@...', score: 82, starred: '2w ago', comments: 1, prs: 2, followers: 1567 },
  { username: 'jennifer-w', name: 'Jennifer Wang', avatar: 'https://avatars.githubusercontent.com/u/5?v=4', company: 'Netflix', role: 'Engineering Manager', location: 'Los Angeles, CA', email: 'jen@...', score: 91, starred: '5d ago', comments: 3, prs: 1, followers: 3421 },
];

export type IntelUser = (typeof MOCK_USERS)[number];

export const MOCK_BOTS = [
  { username: 'user8847213', accountAge: '3 days', botProb: 0.87 },
  { username: 'bot_user_8823', accountAge: '2 days', botProb: 0.95 },
  { username: 'xyz123abc456', accountAge: '5 days', botProb: 0.91 },
  { username: 'star_machine_42', accountAge: '1 day', botProb: 0.98 },
];

export type ViewType = 'overview' | 'network' | 'bots' | 'gtm';
