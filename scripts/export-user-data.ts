import postgres from 'postgres';
import * as fs from 'fs';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

const client = postgres(DATABASE_URL);

async function exportUserData() {
  try {
    // Query to get all users with their latest profile summary, improvements, and top repos
    const results = await client`
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
    `;

    // Convert to CSV
    const csvHeader = 'Name,Email,Rank,Tier,ELO Rating,Profile Score,Skills,Professional Summary,Rooms for Improvement,Top Repos\n';
    const csvRows = results
      .map((row) => {
        const name = escapeCSV(row.name);
        const email = escapeCSV(row.email ?? '');
        const rank = row.rank ?? '';
        const tier = escapeCSV(row.tier ?? '');
        const eloRating = row.elo_rating ?? '';
        
        // Calculate profile score from skill assessment
        let profileScore = '';
        let skillsText = '';
        if (row.skill_assessment && Array.isArray(row.skill_assessment)) {
          const skills = row.skill_assessment as any[];
          const avg = skills.reduce((sum, skill) => sum + skill.score, 0) / skills.length;
          profileScore = avg.toFixed(1);
          
          // Format skills as: Skill (score), Skill (score), etc.
          skillsText = skills
            .map((skill: any) => `${skill.metric} (${skill.score})`)
            .join('; ');
        }
        
        const summary = escapeCSV(row.professional_summary ?? '');
        
        // Extract suggestions (rooms for improvement)
        const suggestions = (row.suggestions || [])
          .map((s: any) => s.replace(/^(-\s*|\d+\.\s*)/, '').trim())
          .join('; ');
        const improvementText = escapeCSV(suggestions);
        
        // Extract top repos
        const repos = (row.top_repos || [])
          .map((repo: any) => `${repo.name} (${repo.description})`)
          .join('; ');
        const reposText = escapeCSV(repos);
        
        const skillsEscaped = escapeCSV(skillsText);
        
        return `${name},${email},${rank},${tier},${eloRating},${profileScore},${skillsEscaped},${summary},${improvementText},${reposText}`;
      })
      .join('\n');

    const csvContent = csvHeader + csvRows;

    // Write to file
    const filename = `user_export_${new Date().toISOString().split('T')[0]}.csv`;
    fs.writeFileSync(filename, csvContent);
    console.log(`✓ Export completed! File saved as: ${filename}`);
    console.log(`✓ Total unique records: ${results.length}`);
    
    // Show some stats
    const withEmail = results.filter(r => r.email).length;
    const withRank = results.filter(r => r.rank).length;
    const withImprovements = results.filter(r => r.suggestions && (r.suggestions as any[]).length > 0).length;
    console.log(`✓ Records with email: ${withEmail}`);
    console.log(`✓ Records with rank: ${withRank}`);
    console.log(`✓ Records with improvement suggestions: ${withImprovements}`);
  } catch (error) {
    console.error('Error exporting data:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

function escapeCSV(value: string | null | undefined): string {
  if (!value) return '';
  // Escape quotes and wrap in quotes if contains comma, newline, or quote
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

exportUserData();
