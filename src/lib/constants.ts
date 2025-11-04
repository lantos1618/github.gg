// Curated list of popular repos to show when user is not logged in or as fallback
type CachedRepo = {
  owner: string;
  name: string;
  special?: boolean;
  sponsor?: boolean;
  stargazersCount?: number;
}

export const CACHED_REPOS: CachedRepo[] = [
  { owner: 'facebook', name: 'react', stargazersCount: 232000 },
  { owner: 'vuejs', name: 'vue', stargazersCount: 209000 },
  { owner: 'tensorflow', name: 'tensorflow', stargazersCount: 190000 },
  { owner: 'torvalds', name: 'linux', stargazersCount: 183000 },
  { owner: 'kubernetes', name: 'kubernetes', stargazersCount: 113000 },
  { owner: 'rust-lang', name: 'rust', stargazersCount: 101000 },
  { owner: 'golang', name: 'go', stargazersCount: 126000 },
  { owner: 'nodejs', name: 'node', stargazersCount: 109000 },
  { owner: 'denoland', name: 'deno', stargazersCount: 98000 },
  { owner: 'vercel', name: 'next.js', stargazersCount: 130000 },
  { owner: 'flutter', name: 'flutter', stargazersCount: 168000 },
  { owner: 'apple', name: 'swift', stargazersCount: 68000 },
  { owner: 'pytorch', name: 'pytorch', stargazersCount: 86000 },
  { owner: 'sveltejs', name: 'svelte', stargazersCount: 81000 },
  { owner: 'freeCodeCamp', name: 'freeCodeCamp', stargazersCount: 410000 },
  { owner: '996icu', name: '996.ICU', stargazersCount: 270000 },
  { owner: 'EbookFoundation', name: 'free-programming-books', stargazersCount: 345000 },
  { owner: 'jwasham', name: 'coding-interview-university', stargazersCount: 312000 },
  { owner: 'kamranahmedse', name: 'developer-roadmap', stargazersCount: 305000 },
  { owner: 'sindresorhus', name: 'awesome', stargazersCount: 337000 },
  { owner: 'public-apis', name: 'public-apis', stargazersCount: 324000 },
  { owner: 'github', name: 'gitignore', stargazersCount: 164000 },
  { owner: 'getify', name: 'You-Dont-Know-JS', stargazersCount: 181000 },
  { owner: 'airbnb', name: 'javascript', stargazersCount: 149000 },
  { owner: 'trekhleb', name: 'javascript-algorithms', stargazersCount: 192000 },
  { owner: 'ohmyzsh', name: 'oh-my-zsh', stargazersCount: 176000 },
  { owner: 'jlevy', name: 'the-art-of-command-line', stargazersCount: 156000 },
  { owner: 'docker', name: 'docker-ce', stargazersCount: 28000 },
  { owner: '0xAX', name: 'linux-insides', stargazersCount: 31000 },
  { owner: 'gothinkster', name: 'realworld', stargazersCount: 81000 },
  { owner: 'electron', name: 'electron', stargazersCount: 115000 },
  { owner: 'ansible', name: 'ansible', stargazersCount: 63000 },
  { owner: 'hashicorp', name: 'terraform', stargazersCount: 43000 },
  { owner: 'facebook', name: 'react-native', stargazersCount: 120000 },
  { owner: 'tailwindlabs', name: 'tailwindcss', stargazersCount: 87000 },
  { owner: 'storybookjs', name: 'storybook', stargazersCount: 85000 },
  { owner: 'facebook', name: 'jest', stargazersCount: 45000 },
  { owner: 'webpack', name: 'webpack', stargazersCount: 65000 },
  { owner: 'babel', name: 'babel', stargazersCount: 43000 },
  { owner: 'redis', name: 'redis', stargazersCount: 68000 },
  { owner: 'nginx', name: 'nginx', stargazersCount: 25000 },
  { owner: 'laravel', name: 'laravel', stargazersCount: 79000 },
  { owner: 'django', name: 'django', stargazersCount: 82000 },
  { owner: 'pallets', name: 'flask', stargazersCount: 68000 },
  { owner: 'tiangolo', name: 'fastapi', stargazersCount: 81000 },
  { owner: 'rootsongjc', name: 'kubernetes-handbook', stargazersCount: 11000 },
  { owner: 'donnemartin', name: 'system-design-primer', stargazersCount: 284000 },
  { owner: 'danistefanovic', name: 'build-your-own-x', stargazersCount: 321000 },
  { owner: 'tuvtran', name: 'project-based-learning', stargazersCount: 208000 },
  { owner: 'serverless', name: 'serverless', stargazersCount: 47000 },
  { owner: 'helm', name: 'helm', stargazersCount: 27000 },
  { owner: 'prometheus', name: 'prometheus', stargazersCount: 57000 },
  { owner: 'grafana', name: 'grafana', stargazersCount: 66000 },
  { owner: 'elastic', name: 'kibana', stargazersCount: 20000 },
  { owner: 'elastic', name: 'elasticsearch', stargazersCount: 71000 },
  { owner: 'elastic', name: 'logstash', stargazersCount: 14000 },
  { owner: 'jenkinsci', name: 'jenkins', stargazersCount: 23000 },
  { owner: 'home-assistant', name: 'home-assistant', stargazersCount: 75000 },
  { owner: 'shadowsocks', name: 'shadowsocks', stargazersCount: 35000 },
  { owner: 'gpakosz', name: '.tmux', stargazersCount: 22000 },
  { owner: 'romkatv', name: 'powerlevel10k', stargazersCount: 47000 },
  { owner: 'neovim', name: 'neovim', stargazersCount: 85000 },
  { owner: 'atom', name: 'atom', stargazersCount: 61000 },
  { owner: 'sublimehq', name: 'sublime_text', stargazersCount: 7000 },
  { owner: 'Mail-0', name: 'Zero', special: true, sponsor: true, stargazersCount: 20 },
  { owner: 'lantos1618', name: 'github.gg', special: true, sponsor: true, stargazersCount: 44 },
  { owner: 'ossdotnow', name: 'ossdotnow', special: true, sponsor: true, stargazersCount: 15 },
  // { owner: 'vercel', name: 'next.js', special: true, sponsor: true },
  { owner: 'stripe', name: 'stripe-react-native', special: true, stargazersCount: 1400 },
  { owner: 'calcom', name: 'cal.com', special: true, stargazersCount: 34000 },
  { owner: 'supabase', name: 'supabase', special: true, stargazersCount: 76000 },
  { owner: 'langchain-ai', name: 'langchain', special: true, stargazersCount: 98000 },
  { owner: 'openai', name: 'openai-cookbook', special: true, stargazersCount: 62000 },
  { owner: 'wasp-lang', name: 'wasp', special: true, stargazersCount: 14000 },
  { owner: 'twentyhq', name: 'twenty', special: true, stargazersCount: 23000 },
]; 

/**
 * Get the base URL for the application
 * Uses NEXT_PUBLIC_APP_URL from environment, falls back to window.location.origin in browser
 */
export function getBaseUrl(): string {
  // Client-side: use window.location.origin for dynamic domain support
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Server-side: use environment variable
  return process.env.NEXT_PUBLIC_APP_URL || 'https://github.gg';
}

export const GITHUB_APP_NAME = 'gh-gg';
