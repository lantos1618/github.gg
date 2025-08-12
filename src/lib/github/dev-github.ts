

// Mock repository data for development
const MOCK_REPOS: Record<string, unknown> = {
  'dev/dev-project': {
    id: 123456789,
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
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    pushed_at: '2024-01-01T00:00:00Z',
    language: 'JavaScript',
    has_issues: true,
    has_projects: true,
    has_downloads: true,
    has_wiki: true,
    has_pages: false,
    has_discussions: false,
    forks_count: 0,
    archived: false,
    disabled: false,
    license: null,
    allow_forking: true,
    is_template: false,
    web_commit_signoff_required: false,
    topics: ['development', 'testing'],
    visibility: 'public',
    default_branch: 'main',
    permissions: {
      admin: false,
      maintain: false,
      push: false,
      triage: false,
      pull: true
    },
    allow_squash_merge: true,
    allow_merge_commit: true,
    allow_rebase_merge: true,
    delete_branch_on_merge: false,
    subscribers_count: 0
  }
};

// Mock user data
const MOCK_USERS: Record<string, unknown> = {
  'dev': {
    login: 'dev',
    id: 123456,
    avatar_url: 'https://github.com/github.png',
    name: 'Development User',
    company: null,
    blog: null,
    location: null,
    email: 'dev@github.gg',
    bio: 'Development user for testing',
    twitter_username: null,
    public_repos: 1,
    public_gists: 0,
    followers: 0,
    following: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
};

// Mock file data
const MOCK_FILES: Record<string, Record<string, unknown>> = {
  'dev/dev-project': {
    'package.json': {
      name: 'dev-project',
      version: '1.0.0',
      description: 'A sample development project for testing',
      main: 'server.js',
      scripts: {
        start: 'node server.js',
        test: 'jest',
        dev: 'nodemon server.js'
      },
      dependencies: {
        express: '^4.18.2',
        cors: '^2.8.5'
      },
      devDependencies: {
        nodemon: '^3.0.1',
        jest: '^29.5.0'
      }
    },
    'README.md': '# Dev Project\n\nThis is a sample development project for testing the GitHub.gg application.\n\n## Features\n\n- Sample Express server\n- Basic routing\n- Test setup\n\n## Getting Started\n\n```bash\nnpm install\nnpm start\n```\n\n## Testing\n\n```bash\nnpm test\n```',
    'server.js': 'const express = require(\'express\');\nconst cors = require(\'cors\');\n\nconst app = express();\nconst PORT = process.env.PORT || 3000;\n\napp.use(cors());\napp.use(express.json());\n\napp.get(\'/\', (req, res) => {\n  res.json({ message: \'Dev Project Server Running!\' });\n});\n\napp.get(\'/api/status\', (req, res) => {\n  res.json({ \n    status: \'ok\', \n    timestamp: new Date().toISOString(),\n    environment: process.env.NODE_ENV || \'development\'\n  });\n});\n\napp.listen(PORT, () => {\n  console.log(`Server running on port ${PORT}`);\n});',
    'src/index.js': '// Main application entry point\nconsole.log(\'Dev Project Application Starting...\');\n\n// Import and initialize modules\nconst server = require(\'../server\');\n\nconsole.log(\'Dev Project Application Ready!\');',
    'tests/unit.test.js': 'const { expect } = require(\'jest\');\n\ndescribe(\'Dev Project Tests\', () => {\n  test(\'should pass basic test\', () => {\n    expect(true).toBe(true);\n  });\n  \n  test(\'should handle basic math\', () => {\n    expect(2 + 2).toBe(4);\n  });\n});'
  }
};

// Mock branches data
const MOCK_BRANCHES: Record<string, unknown[]> = {
  'dev/dev-project': [
    {
      name: 'main',
      commit: {
        sha: 'abc123def456',
        url: 'https://api.github.com/repos/dev/dev-project/commits/abc123def456'
      },
      protected: false
    },
    {
      name: 'develop',
      commit: {
        sha: 'def456ghi789',
        url: 'https://api.github.com/repos/dev/dev-project/commits/def456ghi789'
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
    return Object.values(MOCK_REPOS).filter(repo => {
      const repoObj = repo as { owner?: { login?: string } };
      return repoObj.owner?.login === username || username === 'dev';
    });
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