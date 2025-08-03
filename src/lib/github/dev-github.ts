

// Mock repository data for development
const MOCK_REPOS = {
  'dev/dev-project': {
    id: 987654321,
    name: 'dev-project',
    full_name: 'dev/dev-project',
    owner: {
      login: 'dev',
      id: 123456,
      avatar_url: 'https://github.com/github.png',
      type: 'User'
    },
    description: 'A sample development project for testing',
    private: false,
    fork: false,
    created_at: '2024-06-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
    pushed_at: '2024-12-01T00:00:00Z',
    size: 512,
    stargazers_count: 15,
    watchers_count: 15,
    language: 'JavaScript',
    has_issues: true,
    has_projects: false,
    has_downloads: true,
    has_wiki: false,
    has_pages: false,
    has_discussions: false,
    forks_count: 2,
    archived: false,
    disabled: false,
    license: {
      key: 'apache-2.0',
      name: 'Apache License 2.0',
      url: 'https://api.github.com/licenses/apache-2.0'
    },
    default_branch: 'main',
    topics: ['javascript', 'testing', 'development'],
    visibility: 'public',
    open_issues_count: 1,
    network_count: 2,
    subscribers_count: 5
  }
};

// Mock user data
const MOCK_USERS = {
  'dev': {
    login: 'dev',
    id: 123456,
    avatar_url: 'https://github.com/github.png',
    gravatar_id: '',
    url: 'https://api.github.com/users/dev',
    html_url: 'https://github.com/dev',
    followers_url: 'https://api.github.com/users/dev/followers',
    following_url: 'https://api.github.com/users/dev/following{/other_user}',
    gists_url: 'https://api.github.com/users/dev/gists{/gist_id}',
    starred_url: 'https://api.github.com/users/dev/starred{/owner}{/repo}',
    subscriptions_url: 'https://api.github.com/users/dev/subscriptions',
    organizations_url: 'https://api.github.com/users/dev/orgs',
    repos_url: 'https://api.github.com/users/dev/repos',
    events_url: 'https://api.github.com/users/dev/events{/privacy}',
    received_events_url: 'https://api.github.com/users/dev/received_events',
    type: 'User',
    site_admin: false,
    name: 'Development User',
    company: null,
    blog: 'https://dev.dev',
    location: 'Development City, DC',
    email: 'dev@github.gg',
    hireable: true,
    bio: 'Development user for testing GitHub.gg features',
    twitter_username: 'dev',
    public_repos: 25,
    public_gists: 5,
    followers: 150,
    following: 50,
    created_at: '2020-01-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z'
  }
};

// Mock file data
const MOCK_FILES = {
  'dev/dev-project': {
    'package.json': {
      name: 'dev-project',
      version: '1.0.0',
      description: 'A sample development project for testing',
      main: 'index.js',
      scripts: {
        dev: 'node server.js',
        start: 'node server.js',
        test: 'jest'
      },
      dependencies: {
        'express': '^4.18.0',
        'jest': '^29.0.0',
        'nodemon': '^3.0.0'
      }
    },
    'README.md': `# Dev Project

A sample development project for testing GitHub.gg features.

## Features

- 🧪 Testing environment
- 📝 Sample documentation
- 🔧 Development tools
- 📊 Example analytics

## Installation

\`\`\`bash
npm install
npm run dev
\`\`\`

## Testing

\`\`\`bash
npm test
\`\`\`

## License

Apache-2.0 License`,
    'server.js': `const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Dev Project Server Running' });
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});`,
    'src/index.js': `// Main application entry point
console.log('Dev Project Started');

const config = {
  environment: 'development',
  version: '1.0.0',
  features: ['testing', 'development', 'mock-data']
};

module.exports = config;`,
    'tests/unit.test.js': `const { expect } = require('jest');

describe('Dev Project', () => {
  test('should have correct configuration', () => {
    const config = require('../src/index.js');
    expect(config.version).toBe('1.0.0');
  });
});`
  }
};

// Mock branches data
const MOCK_BRANCHES = {
  'dev/dev-project': [
    {
      name: 'main',
      commit: {
        sha: 'dev123abc456',
        url: 'https://api.github.com/repos/dev/dev-project/commits/dev123abc456'
      },
      protected: false
    },
    {
      name: 'feature/testing',
      commit: {
        sha: 'test456def789',
        url: 'https://api.github.com/repos/dev/dev-project/commits/test456def789'
      },
      protected: false
    }
  ]
};

export class DevGitHubService {
  private isDevMode: boolean;

  constructor() {
    this.isDevMode = process.env.NODE_ENV === 'development' && 
      process.env.NEXT_PUBLIC_USE_DEV_AUTH === 'true';
  }

  // Get repository information
  async getRepo(owner: string, repo: string) {
    if (!this.isDevMode) {
      throw new Error('Dev GitHub service only available in development mode');
    }

    const key = `${owner}/${repo}`;
    const mockRepo = MOCK_REPOS[key];
    
    if (!mockRepo) {
      throw new Error(`Repository ${owner}/${repo} not found in mock data`);
    }

    return mockRepo;
  }

  // Get user information
  async getUser(username: string) {
    if (!this.isDevMode) {
      throw new Error('Dev GitHub service only available in development mode');
    }

    const mockUser = MOCK_USERS[username];
    
    if (!mockUser) {
      throw new Error(`User ${username} not found in mock data`);
    }

    return mockUser;
  }

  // Get repository files
  async getRepoFiles(owner: string, repo: string, path: string = '') {
    if (!this.isDevMode) {
      throw new Error('Dev GitHub service only available in development mode');
    }

    const key = `${owner}/${repo}`;
    const mockFiles = MOCK_FILES[key];
    
    if (!mockFiles) {
      return [];
    }

    if (!path) {
      // Return root files and directories
      const rootFiles = Object.keys(mockFiles).filter(filename => !filename.includes('/'));
      const rootDirs = [...new Set(Object.keys(mockFiles).filter(filename => filename.includes('/')).map(filename => filename.split('/')[0]))];
      
      const files = [
        ...rootFiles.map(filename => ({
          name: filename,
          path: filename,
          type: 'file' as const,
          size: JSON.stringify(mockFiles[filename]).length,
          content: typeof mockFiles[filename] === 'string' ? mockFiles[filename] : JSON.stringify(mockFiles[filename], null, 2)
        })),
        ...rootDirs.map(dirname => ({
          name: dirname,
          path: dirname,
          type: 'directory' as const,
          size: 0
        }))
      ];
      return files;
    }

    // Handle subdirectory requests
    const pathFiles = Object.keys(mockFiles).filter(filename => 
      filename.startsWith(path + '/') && 
      filename.split('/').length === path.split('/').length + 1
    );
    
    const files = pathFiles.map(filename => ({
      name: filename.split('/').pop() || filename,
      path: filename,
      type: 'file' as const,
      size: JSON.stringify(mockFiles[filename]).length,
      content: typeof mockFiles[filename] === 'string' ? mockFiles[filename] : JSON.stringify(mockFiles[filename], null, 2)
    }));
    
    return files;
  }

  // Get repository content
  async getRepoContent(owner: string, repo: string, path: string) {
    if (!this.isDevMode) {
      throw new Error('Dev GitHub service only available in development mode');
    }

    const key = `${owner}/${repo}`;
    const mockFiles = MOCK_FILES[key];
    
    if (!mockFiles || !mockFiles[path]) {
      throw new Error(`File ${path} not found in mock data`);
    }

    const content = mockFiles[path];
    
    return {
      name: path.split('/').pop() || path,
      path,
      sha: `mock-sha-${path}`,
      size: JSON.stringify(content).length,
      url: `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      git_url: `https://api.github.com/repos/${owner}/${repo}/git/blobs/mock-sha-${path}`,
      html_url: `https://github.com/${owner}/${repo}/blob/main/${path}`,
      download_url: `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`,
      type: 'file',
      content: typeof content === 'string' ? Buffer.from(content).toString('base64') : Buffer.from(JSON.stringify(content)).toString('base64'),
      encoding: 'base64'
    };
  }

  // Get repository branches
  async getRepoBranches(owner: string, repo: string) {
    if (!this.isDevMode) {
      throw new Error('Dev GitHub service only available in development mode');
    }

    const key = `${owner}/${repo}`;
    const mockBranches = MOCK_BRANCHES[key];
    
    if (!mockBranches) {
      return [];
    }

    return mockBranches;
  }

  // Get user repositories
  async getUserRepos(username: string) {
    if (!this.isDevMode) {
      throw new Error('Dev GitHub service only available in development mode');
    }

    // Return all repos for the user
    return Object.values(MOCK_REPOS).filter(repo => 
      repo.owner.login === username || username === 'dev'
    );
  }

  // Check if repository exists
  async repoExists(owner: string, repo: string): Promise<boolean> {
    if (!this.isDevMode) {
      throw new Error('Dev GitHub service only available in development mode');
    }

    const key = `${owner}/${repo}`;
    return key in MOCK_REPOS;
  }

  // Get repository languages
  async getRepoLanguages(owner: string, repo: string) {
    if (!this.isDevMode) {
      throw new Error('Dev GitHub service only available in development mode');
    }

    const key = `${owner}/${repo}`;
    const mockRepo = MOCK_REPOS[key];
    
    if (!mockRepo) {
      return {};
    }

    // Return mock language breakdown
    return {
      TypeScript: 70,
      JavaScript: 20,
      CSS: 8,
      HTML: 2
    };
  }
}

// Export singleton instance
export const devGitHubService = new DevGitHubService(); 