export interface RoadmapItem {
  title: string;
  description: string;
  completed: boolean;
}

export const roadmapItems: RoadmapItem[] = [
  {
    title: "GitHub OAuth Authentication",
    description: "Secure user authentication and session management via GitHub",
    completed: true
  },
  {
    title: "Repository File Browsing", 
    description: "Browse and view files from GitHub repositories with intelligent filtering",
    completed: true
  },
  {
    title: "File Content Viewing",
    description: "Display formatted code content with copy functionality",
    completed: true
  },
  {
    title: "GitHub App Integration",
    description: "Migrate to GitHub Apps for better integration and higher rate limits",
    completed: true
  },
  {
    title: "Webhook & Real-time Analysis",
    description: "Automated code analysis triggered by GitHub events",
    completed: false
  },
  {
    title: "Automated GitHub Comments",
    description: "Bot comments on PRs with code quality insights and suggestions",
    completed: false
  },
  {
    title: "Intelligent Documentation Generation",
    description: "Auto-generate comprehensive wikis and documentation from codebases",
    completed: false
  },
  {
    title: "Git Visualization & Diagrams",
    description: "Interactive diagrams for repository structure, history, and code evolution",
    completed: false
  },
  {
    title: "Repository Analysis & Insights",
    description: "Deep dive into repository structure, commits, and activity patterns",
    completed: false
  },
  {
    title: "Developer Profile Analytics",
    description: "Skill assessment, technology stack analysis, and contribution patterns",
    completed: false
  },
  {
    title: "Hiring Intelligence Tools",
    description: "Candidate comparison, skill matching, and automated screening for recruiters",
    completed: false
  },
  {
    title: "Startup & Team Evaluation",
    description: "Technical debt assessment, scalability indicators, and risk analysis",
    completed: false
  },
  {
    title: "Code Quality Metrics & Recommendations", 
    description: "Analyze code complexity, maintainability, and suggest improvements",
    completed: false
  },
  {
    title: "Collaboration Analytics & Team Insights",
    description: "Track team contributions, review patterns, and collaboration metrics",
    completed: false
  },
  {
    title: "Performance Optimization Suggestions",
    description: "Identify performance bottlenecks and optimization opportunities",
    completed: false
  },
  {
    title: "Security Vulnerability Scanning",
    description: "Scan for security issues, dependency vulnerabilities, and best practices",
    completed: false
  }
]; 