import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { developerProfileCache, developerRankings, user } from '@/db/schema';
import { eq, sql, isNotNull } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// Helper to escape CSV fields
function escapeCSV(value: string | null | undefined): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin status
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
    if (!adminEmails.includes(session.user.email.toLowerCase())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Query to get all users with their latest profile summary
    const results = await db.execute(sql`
      WITH latest_profiles AS (
        SELECT 
          username,
          profile_data,
          (profile_data->>'summary')::text as professional_summary,
          (profile_data->'suggestions')::jsonb as suggestions,
          (profile_data->'topRepos')::jsonb as top_repos,
          (profile_data->'skillAssessment')::jsonb as skill_assessment,
          ROW_NUMBER() OVER (PARTITION BY username ORDER BY version DESC) as rn
        FROM developer_profile_cache
        WHERE (profile_data->>'summary')::text IS NOT NULL
      )
      SELECT 
        COALESCE(u.name, lp.username) as name,
        u.email,
        dr.rank,
        dr.tier,
        dr.elo_rating,
        lp.professional_summary,
        lp.skill_assessment,
        lp.suggestions,
        lp.top_repos
      FROM latest_profiles lp
      LEFT JOIN "user" u ON u.github_username = lp.username
      LEFT JOIN developer_rankings dr ON lp.username = dr.username
      WHERE lp.rn = 1
      ORDER BY COALESCE(dr.rank, 999999), COALESCE(u.name, lp.username);
    `);

    // Convert to CSV
    const csvHeader = 'Name,Email,Rank,Tier,ELO Rating,Profile Score,Skills,Professional Summary,Rooms for Improvement,Top Repos\n';
    const csvRows = (results as any[])
      .map((row) => {
        const name = escapeCSV(row.name);
        const email = escapeCSV(row.email ?? '');
        const rank = row.rank ?? '';
        const tier = escapeCSV(row.tier ?? '');
        const eloRating = row.elo_rating ?? '';
        
        // Calculate profile score from skill assessment
        let profileScore = '';
        let skillsText = '';
        const skillAssessment = row.skill_assessment;
        if (skillAssessment && Array.isArray(skillAssessment)) {
          const avg = skillAssessment.reduce((sum: number, skill: any) => sum + skill.score, 0) / skillAssessment.length;
          profileScore = avg.toFixed(1);
          
          // Format skills as: Skill (score), Skill (score), etc.
          skillsText = skillAssessment
            .map((skill: any) => `${skill.metric} (${skill.score})`)
            .join('; ');
        }
        
        const summary = escapeCSV(row.professional_summary ?? '');
        
        // Extract suggestions (rooms for improvement)
        const suggestions = row.suggestions || [];
        const suggestionsText = suggestions
          .map((s: any) => (typeof s === 'string' ? s : '').replace(/^(-\s*|\d+\.\s*)/, '').trim())
          .filter((s: string) => s.length > 0)
          .join('; ');
        const improvementText = escapeCSV(suggestionsText);
        
        // Extract top repos
        const topRepos = row.top_repos || [];
        const reposText = topRepos
          .map((repo: any) => `${repo.name} (${repo.description})`)
          .join('; ');
        const reposEscaped = escapeCSV(reposText);
        
        const skillsEscaped = escapeCSV(skillsText);
        
        return `${name},${email},${rank},${tier},${eloRating},${profileScore},${skillsEscaped},${summary},${improvementText},${reposEscaped}`;
      })
      .join('\n');

    const csvContent = csvHeader + csvRows;

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="developer-profiles-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting developer profiles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
