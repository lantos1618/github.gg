// Socket API service for security analysis
// Based on https://docs.socket.dev/reference/introduction-to-socket-api

export interface SocketVulnerability {
  id: string
  title: string
  severity: "critical" | "high" | "medium" | "low"
  package: string
  currentVersion: string
  patchedVersion: string
  description: string
  createdAt: string
  cve?: string
}

export interface SocketSecurityScore {
  score: number // 0-100
  grade: "A" | "B" | "C" | "D" | "F"
  issues: {
    critical: number
    high: number
    medium: number
    low: number
  }
}

export interface SocketDependency {
  name: string
  version: string
  latestVersion: string
  securityScore: SocketSecurityScore
  vulnerabilities: SocketVulnerability[]
  license: string
}

export interface SocketRepoAnalysis {
  overallScore: SocketSecurityScore
  dependencies: SocketDependency[]
  vulnerabilities: SocketVulnerability[]
  securityPolicies: {
    hasSecurityPolicy: boolean
    hasDependabotEnabled: boolean
    hasCodeScanning: boolean
    hasSecretScanning: boolean
  }
}

// This would be your actual Socket API key in a real implementation
const SOCKET_API_KEY = process.env.SOCKET_API_KEY || ""

export async function analyzeRepositoryWithSocket(owner: string, repo: string): Promise<SocketRepoAnalysis> {
  // In a real implementation, this would make actual API calls to Socket
  // For now, we'll return mock data that matches the Socket API structure

  // This simulates a Socket API call
  // In production, you would use:
  // const response = await fetch('https://api.socket.dev/v1/repo-analysis', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${SOCKET_API_KEY}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({ owner, repo })
  // });
  // return await response.json();

  // Mock data for demonstration
  return {
    overallScore: {
      score: 78,
      grade: "B",
      issues: {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
      },
    },
    dependencies: [
      {
        name: "lodash",
        version: "4.17.15",
        latestVersion: "4.17.21",
        securityScore: {
          score: 65,
          grade: "C",
          issues: {
            critical: 0,
            high: 1,
            medium: 0,
            low: 0,
          },
        },
        vulnerabilities: [
          {
            id: "CVE-2021-23337",
            title: "Prototype Pollution in Lodash",
            severity: "high",
            package: "lodash",
            currentVersion: "4.17.15",
            patchedVersion: "4.17.21",
            description:
              "Prototype pollution vulnerability in lodash before 4.17.21 allows attackers to modify object properties via the set, setWith, and update functions.",
            createdAt: "2021-02-15T00:00:00Z",
            cve: "CVE-2021-23337",
          },
        ],
        license: "MIT",
      },
      {
        name: "express",
        version: "4.17.1",
        latestVersion: "4.17.3",
        securityScore: {
          score: 72,
          grade: "C",
          issues: {
            critical: 0,
            high: 0,
            medium: 1,
            low: 1,
          },
        },
        vulnerabilities: [
          {
            id: "CVE-2022-24999",
            title: "Regular Expression Denial of Service in Express",
            severity: "medium",
            package: "express",
            currentVersion: "4.17.1",
            patchedVersion: "4.17.3",
            description:
              "The express package before 4.17.3 for Node.js has a Regular Expression Denial of Service vulnerability via the req.fresh property.",
            createdAt: "2022-03-10T00:00:00Z",
            cve: "CVE-2022-24999",
          },
        ],
        license: "MIT",
      },
    ],
    vulnerabilities: [
      {
        id: "CVE-2021-23337",
        title: "Prototype Pollution in Lodash",
        severity: "high",
        package: "lodash",
        currentVersion: "4.17.15",
        patchedVersion: "4.17.21",
        description:
          "Prototype pollution vulnerability in lodash before 4.17.21 allows attackers to modify object properties via the set, setWith, and update functions.",
        createdAt: "2021-02-15T00:00:00Z",
        cve: "CVE-2021-23337",
      },
      {
        id: "CVE-2022-24999",
        title: "Regular Expression Denial of Service in Express",
        severity: "medium",
        package: "express",
        currentVersion: "4.17.1",
        patchedVersion: "4.17.3",
        description:
          "The express package before 4.17.3 for Node.js has a Regular Expression Denial of Service vulnerability via the req.fresh property.",
        createdAt: "2022-03-10T00:00:00Z",
        cve: "CVE-2022-24999",
      },
    ],
    securityPolicies: {
      hasSecurityPolicy: true,
      hasDependabotEnabled: true,
      hasCodeScanning: false,
      hasSecretScanning: true,
    },
  }
}
