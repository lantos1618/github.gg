import { db } from '@/db';
import { githubWrapped } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest } from 'next/server';

interface Params {
  params: Promise<{ year: string; username: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { year: yearStr, username } = await params;
  const year = parseInt(yearStr, 10);

  if (isNaN(year)) {
    return new Response(generatePlaceholderBadge(username), {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  const searchParams = request.nextUrl.searchParams;
  const theme = searchParams.get('theme') || 'dark';

  const wrapped = await db
    .select()
    .from(githubWrapped)
    .where(
      and(
        eq(githubWrapped.username, username.toLowerCase()),
        eq(githubWrapped.year, year),
        eq(githubWrapped.isPublic, true)
      )
    )
    .limit(1);

  if (!wrapped.length) {
    return new Response(generatePlaceholderBadge(username, year), {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  const data = wrapped[0];
  const personalityType = data.aiInsights?.personalityType || 'Developer';
  const personalityEmoji = data.aiInsights?.personalityEmoji || '💻';
  const commits = data.stats.totalCommits;
  const streak = data.stats.longestStreak;
  const topLang = data.stats.languages[0]?.name || 'Code';
  const grade = data.aiInsights?.overallGrade ?? null;

  const svg = generateBadgeSVG({
    username,
    year,
    personalityType,
    personalityEmoji,
    commits,
    streak,
    topLang,
    grade,
    theme,
  });

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

function generatePlaceholderBadge(username: string, year?: number): string {
  const displayYear = year || new Date().getFullYear();
  return `<svg width="400" height="100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1f2937"/>
      <stop offset="100%" style="stop-color:#111827"/>
    </linearGradient>
  </defs>
  
  <rect width="400" height="100" rx="10" fill="url(#bg)"/>
  
  <text x="20" y="35" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500">
    @${escapeXml(username)}
  </text>
  
  <text x="20" y="60" fill="#f3f4f6" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700">
    ${displayYear} GitHub Wrapped
  </text>
  
  <text x="20" y="82" fill="#6b7280" font-family="system-ui, -apple-system, sans-serif" font-size="11">
    Visit github.gg/wrapped to generate
  </text>
  
  <text x="380" y="90" fill="#4b5563" font-family="system-ui, -apple-system, sans-serif" font-size="10" text-anchor="end">
    github.gg
  </text>
</svg>`;
}

interface BadgeOptions {
  username: string;
  year: number;
  personalityType: string;
  personalityEmoji: string;
  commits: number;
  streak: number;
  topLang: string;
  grade: string | null;
  theme: string;
}

function generateBadgeSVG(options: BadgeOptions): string {
  const { username, year, personalityType, personalityEmoji, commits, streak, topLang, grade, theme } = options;

  const themes: Record<string, { bg1: string; bg2: string; text: string; textMuted: string; accent: string }> = {
    dark: {
      bg1: '#1a1a2e',
      bg2: '#16213e',
      text: '#f3f4f6',
      textMuted: '#9ca3af',
      accent: '#a855f7',
    },
    light: {
      bg1: '#ffffff',
      bg2: '#f9fafb',
      text: '#111827',
      textMuted: '#6b7280',
      accent: '#7c3aed',
    },
    transparent: {
      bg1: 'transparent',
      bg2: 'transparent',
      text: '#f3f4f6',
      textMuted: '#9ca3af',
      accent: '#a855f7',
    },
  };

  const t = themes[theme] || themes.dark;
  const formattedCommits = commits >= 1000 ? `${(commits / 1000).toFixed(1)}k` : commits.toString();

  return `<svg width="400" height="140" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${t.bg1}"/>
      <stop offset="100%" style="stop-color:${t.bg2}"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#a855f7"/>
      <stop offset="50%" style="stop-color:#ec4899"/>
      <stop offset="100%" style="stop-color:#06b6d4"/>
    </linearGradient>
  </defs>
  
  <rect width="400" height="140" rx="12" fill="url(#bg)" ${theme !== 'transparent' ? 'stroke="#374151" stroke-width="1"' : ''}/>
  
  <rect x="0" y="0" width="400" height="4" rx="2" fill="url(#accent)"/>
  
  <text x="20" y="32" fill="${t.textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="500">
    @${escapeXml(username)}'s ${year} GitHub Wrapped
  </text>
  
  <text x="20" y="62" fill="${t.text}" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700">
    ${personalityEmoji} ${escapeXml(personalityType)}
  </text>
  
  <g transform="translate(20, 80)">
    <text fill="${t.accent}" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600">
      ${formattedCommits}
    </text>
    <text x="40" fill="${t.textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">
      commits
    </text>
    
    <text x="100" fill="${t.accent}" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600">
      ${streak}
    </text>
    <text x="125" fill="${t.textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11">
      day streak
    </text>
    
    <text x="200" fill="${t.accent}" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600">
      ${escapeXml(topLang)}
    </text>
  </g>
  
  ${grade ? `
  <g transform="translate(350, 50)">
    <rect x="-20" y="-18" width="40" height="36" rx="6" fill="${t.accent}" fill-opacity="0.2"/>
    <text x="0" y="6" fill="${t.accent}" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="800" text-anchor="middle">
      ${escapeXml(grade)}
    </text>
  </g>
  ` : ''}
  
  <text x="380" y="125" fill="${t.textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="10" text-anchor="end">
    github.gg/wrapped
  </text>
</svg>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
