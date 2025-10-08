import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface ProfileAnalysisEmailData {
  recipientEmail: string;
  recipientUsername: string;
  analyzerUsername: string;
  analyzerEmail?: string;
  profileData: {
    summary: string;
    overallScore?: number;
    topSkills?: string[];
    suggestions?: string[];
  };
}

export async function sendProfileAnalysisEmail(data: ProfileAnalysisEmailData) {
  const { recipientEmail, recipientUsername, analyzerUsername, profileData } = data;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .section {
      background: white;
      padding: 20px;
      margin: 15px 0;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .score {
      font-size: 48px;
      font-weight: bold;
      color: #667eea;
      text-align: center;
      margin: 20px 0;
    }
    .skill-tag {
      display: inline-block;
      background: #e0e7ff;
      color: #4f46e5;
      padding: 5px 12px;
      border-radius: 16px;
      margin: 4px;
      font-size: 14px;
    }
    .suggestion {
      padding: 10px;
      margin: 8px 0;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 Your GitHub Profile Was Analyzed!</h1>
  </div>

  <div class="content">
    <div class="section">
      <h2>Hi ${recipientUsername}!</h2>
      <p>
        Great news! <strong>${analyzerUsername}</strong> just analyzed your GitHub profile on
        <strong>github.gg</strong> and generated a comprehensive scorecard for you.
      </p>
    </div>

    ${profileData.overallScore ? `
    <div class="section">
      <h3>Your Overall Score</h3>
      <div class="score">${profileData.overallScore}/100</div>
    </div>
    ` : ''}

    <div class="section">
      <h3>Summary</h3>
      <p>${profileData.summary}</p>
    </div>

    ${profileData.topSkills && profileData.topSkills.length > 0 ? `
    <div class="section">
      <h3>Top Skills</h3>
      <div>
        ${profileData.topSkills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
      </div>
    </div>
    ` : ''}

    ${profileData.suggestions && profileData.suggestions.length > 0 ? `
    <div class="section">
      <h3>Suggestions for Improvement</h3>
      ${profileData.suggestions.map(suggestion => `
        <div class="suggestion">${suggestion}</div>
      `).join('')}
    </div>
    ` : ''}

    <div class="section" style="text-align: center;">
      <a href="https://github.gg/${recipientUsername}" class="button">
        View Your Full Profile
      </a>
      <p style="margin-top: 10px; color: #6b7280; font-size: 14px;">
        Want to analyze other developers or compete in the arena?<br>
        Sign up for free at <a href="https://github.gg">github.gg</a>
      </p>
    </div>
  </div>

  <div class="footer">
    <p>This email was sent because someone analyzed your public GitHub profile.</p>
    <p>© 2025 github.gg - AI-Powered GitHub Analytics</p>
  </div>
</body>
</html>
  `;

  try {
    const response = await resend.emails.send({
      from: 'GitHub.gg <noreply@github.gg>',
      to: recipientEmail,
      subject: `${analyzerUsername} analyzed your GitHub profile!`,
      html,
    });

    console.log('✅ Profile analysis email sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send profile analysis email:', error);
    throw error;
  }
}

export async function sendScorecardEmail(data: {
  recipientEmail: string;
  repoName: string;
  analyzerUsername: string;
  scorecard: {
    overallScore: number;
    markdown: string;
  };
}) {
  const { recipientEmail, repoName, analyzerUsername, scorecard } = data;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .section {
      background: white;
      padding: 20px;
      margin: 15px 0;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .score {
      font-size: 48px;
      font-weight: bold;
      color: #667eea;
      text-align: center;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 12px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Your Repository Was Analyzed!</h1>
  </div>

  <div class="content">
    <div class="section">
      <h2>Your repository "${repoName}" just got a scorecard!</h2>
      <p>
        <strong>${analyzerUsername}</strong> analyzed your repository and generated a comprehensive scorecard.
      </p>

      <div class="score">${scorecard.overallScore}/100</div>

      <div style="text-align: center; margin-top: 20px;">
        <a href="https://github.gg/${repoName}/scorecard" class="button">
          View Full Scorecard
        </a>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>This email was sent because someone analyzed your public GitHub repository.</p>
    <p>© 2025 github.gg - AI-Powered GitHub Analytics</p>
  </div>
</body>
</html>
  `;

  try {
    const response = await resend.emails.send({
      from: 'GitHub.gg <noreply@github.gg>',
      to: recipientEmail,
      subject: `${analyzerUsername} analyzed your repository ${repoName}!`,
      html,
    });

    console.log('✅ Scorecard email sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send scorecard email:', error);
    throw error;
  }
}
