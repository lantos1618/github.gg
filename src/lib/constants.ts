// Curated list of popular repos to show when user is not logged in or as fallback
type CachedRepo = {
  owner: string;
  name: string;
  special?: boolean;
  sponsor?: boolean;
}

export const CACHED_REPOS: CachedRepo[] = [
  { owner: 'facebook', name: 'react' },
  { owner: 'vuejs', name: 'vue' },
  { owner: 'tensorflow', name: 'tensorflow' },
  { owner: 'torvalds', name: 'linux' },
  { owner: 'kubernetes', name: 'kubernetes' },
  { owner: 'rust-lang', name: 'rust' },
  { owner: 'golang', name: 'go' },
  { owner: 'nodejs', name: 'node' },
  { owner: 'denoland', name: 'deno' },
  { owner: 'vercel', name: 'next.js' },
  { owner: 'flutter', name: 'flutter' },
  { owner: 'apple', name: 'swift' },
  { owner: 'pytorch', name: 'pytorch' },
  { owner: 'sveltejs', name: 'svelte' },
  { owner: 'freeCodeCamp', name: 'freeCodeCamp' },
  { owner: '996icu', name: '996.ICU' },
  { owner: 'EbookFoundation', name: 'free-programming-books' },
  { owner: 'jwasham', name: 'coding-interview-university' },
  { owner: 'kamranahmedse', name: 'developer-roadmap' },
  { owner: 'sindresorhus', name: 'awesome' },
  { owner: 'public-apis', name: 'public-apis' },
  { owner: 'github', name: 'gitignore' },
  { owner: 'getify', name: 'You-Dont-Know-JS' },
  { owner: 'airbnb', name: 'javascript' },
  { owner: 'trekhleb', name: 'javascript-algorithms' },
  { owner: 'ohmyzsh', name: 'oh-my-zsh' },
  { owner: 'jlevy', name: 'the-art-of-command-line' },
  { owner: 'docker', name: 'docker-ce' },
  { owner: '0xAX', name: 'linux-insides' },
  { owner: 'gothinkster', name: 'realworld' },
  { owner: 'electron', name: 'electron' },
  { owner: 'ansible', name: 'ansible' },
  { owner: 'hashicorp', name: 'terraform' },
  { owner: 'facebook', name: 'react-native' },
  { owner: 'tailwindlabs', name: 'tailwindcss' },
  { owner: 'storybookjs', name: 'storybook' },
  { owner: 'facebook', name: 'jest' },
  { owner: 'webpack', name: 'webpack' },
  { owner: 'babel', name: 'babel' },
  { owner: 'redis', name: 'redis' },
  { owner: 'nginx', name: 'nginx' },
  { owner: 'laravel', name: 'laravel' },
  { owner: 'django', name: 'django' },
  { owner: 'pallets', name: 'flask' },
  { owner: 'tiangolo', name: 'fastapi' },
  { owner: 'rootsongjc', name: 'kubernetes-handbook' },
  { owner: 'donnemartin', name: 'system-design-primer' },
  { owner: 'danistefanovic', name: 'build-your-own-x' },
  { owner: 'tuvtran', name: 'project-based-learning' },
  { owner: 'serverless', name: 'serverless' },
  { owner: 'helm', name: 'helm' },
  { owner: 'prometheus', name: 'prometheus' },
  { owner: 'grafana', name: 'grafana' },
  { owner: 'elastic', name: 'kibana' },
  { owner: 'elastic', name: 'elasticsearch' },
  { owner: 'elastic', name: 'logstash' },
  { owner: 'jenkinsci', name: 'jenkins' },
  { owner: 'home-assistant', name: 'home-assistant' },
  { owner: 'shadowsocks', name: 'shadowsocks' },
  { owner: 'gpakosz', name: '.tmux' },
  { owner: 'romkatv', name: 'powerlevel10k' },
  { owner: 'neovim', name: 'neovim' },
  { owner: 'atom', name: 'atom' },
  { owner: 'sublimehq', name: 'sublime_text' },
  { owner: 'Mail-0', name: 'Zero', special: true, sponsor: true },
  { owner: 'lantos1618', name: 'github.gg', special: true, sponsor: true },
  { owner: 'ossdotnow', name: 'ossdotnow', special: true, sponsor: true },
  // { owner: 'vercel', name: 'next.js', special: true, sponsor: true },
  { owner: 'stripe', name: 'stripe-react-native', special: true},
  { owner: 'calcom', name: 'cal.com', special: true},
  { owner: 'supabase', name: 'supabase', special: true},
  { owner: 'langchain-ai', name: 'langchain', special: true},
  { owner: 'openai', name: 'openai-cookbook', special: true},
  { owner: 'wasp-lang', name: 'wasp', special: true},
  { owner: 'twentyhq', name: 'twenty', special: true},
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
