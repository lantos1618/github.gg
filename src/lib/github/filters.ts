// File filtering configuration
export const FILE_FILTER_CONFIG = {
  // A more organized and comprehensive allow-list for file extensions and names.
  allowList: {
    // Common Languages
    languages: [
      '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.rb', '.java', '.c', '.cpp', '.h', '.hpp', 
      '.cs', '.go', '.rs', '.swift', '.kt', '.scala', '.php', '.pl', '.sh', '.bash', '.zsh', 
      '.ps1', '.lua', '.groovy', '.r', '.dart', '.hs', '.erl', '.ex', '.exs'
    ],
    // Web & Frontend
    web: ['.html', '.htm', '.css', '.scss', '.sass', '.less', '.styl', '.vue', '.svelte'],
    // Config Files
    config: [
      '.json', '.xml', '.yml', '.yaml', '.toml', '.ini', '.env', '.properties', '.babelrc', 
      '.eslintrc', '.prettierrc', '.browserslistrc', '.gitattributes', '.gitignore', '.editorconfig', 
      'tsconfig.json', 'package.json', 'webpack.config.js', 'vite.config.js', 'next.config.js',
      'tailwind.config.js', 'postcss.config.js', 'jest.config.js', 'cypress.config.js',
      'playwright.config.js', '.npmrc', '.yarnrc'
    ],
    // Documentation & Data
    docs: ['.md', '.mdx', '.txt', '.rst', '.adoc', '.csv', '.tsv', '.sql', '.graphql', '.gql'],
    // Build & Infrastructure
    build: [
      'Dockerfile', 'docker-compose.yml', '.dockerignore', 'Makefile', 'CMakeLists.txt', 
      'pom.xml', 'build.gradle', 'Vagrantfile', '.tf', '.tfvars'
    ],
    // Exact filenames to always include
    exactNames: ['README', 'LICENSE', 'CONTRIBUTING', 'CHANGELOG', 'CODE_OF_CONDUCT']
  },

  // Deny-list for extensions that are often binary, generated, or not useful.
  deniedExtensions: new Set([
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
    // Fonts
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    // Videos & Audio
    '.mp4', '.avi', '.mov', '.mp3', '.wav', '.flac',
    // Compiled/Binary
    '.exe', '.dll', '.so', '.a', '.o', '.class', '.pyc', '.wasm',
    // Archives
    '.zip', '.tar', '.gz', '.rar', '.7z',
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    // Other
    '.lock', '.log', '.tmp', '.cache', '.suo', '.ntvs_analysis.dat',
    '.pdb', '.db', '.sqlite', '.sqlite3'
  ]),

  // Deny-list for paths. Any file within these directories will be skipped.
  deniedPaths: [
    'node_modules/', 'vendor/', 'dist/', 'build/', 'bin/', 'obj/', '.git/', 
    '.svn/', '.hg/', '.idea/', '.vscode/', '__pycache__/', 'target/', 'out/'
  ]
};

// Combine all allowed extensions into a single Set for fast lookups.
export const ALLOWED_EXTENSIONS = new Set([
  ...FILE_FILTER_CONFIG.allowList.languages,
  ...FILE_FILTER_CONFIG.allowList.web,
  ...FILE_FILTER_CONFIG.allowList.config,
  ...FILE_FILTER_CONFIG.allowList.docs
]);

export function shouldProcessFile(filePath: string, path?: string): boolean {
  const lowerFilePath = filePath.toLowerCase();
  const fileName = filePath.split('/').pop() || '';

  // 0. Filter by path if specified
  if (path && !filePath.startsWith(path + '/') && filePath !== path) {
    return false;
  }

  // 1. Deny if it's in a denied directory.
  if (FILE_FILTER_CONFIG.deniedPaths.some(p => lowerFilePath.startsWith(p))) {
    return false;
  }

  // 2. Deny if it has a denied extension.
  const extension = (fileName.includes('.') ? '.' + fileName.split('.').pop() : '').toLowerCase();
  if (extension && FILE_FILTER_CONFIG.deniedExtensions.has(extension)) {
    return false;
  }
  
  // 3. Deny minified files
  if (lowerFilePath.endsWith('.min.js') || lowerFilePath.endsWith('.min.css')) {
    return false;
  }

  // 4. Allow if it's an exact name match (e.g., README).
  if (FILE_FILTER_CONFIG.allowList.exactNames.includes(fileName)) {
    return true;
  }

  // 5. Allow if it has an allowed extension.
  if (extension && ALLOWED_EXTENSIONS.has(extension)) {
    return true;
  }

  // 6. Allow common config file patterns that don't have extensions.
  if (FILE_FILTER_CONFIG.allowList.build.includes(fileName) || fileName.endsWith('rc')) {
    return true;
  }

  return false;
} 