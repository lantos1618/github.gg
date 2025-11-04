export interface ProfileAnalysisTemplateData {
  recipientUsername: string;
  analyzerUsername: string;
  profileData: {
    summary: string;
    overallScore?: number;
    topSkills?: string[];
    suggestions?: string[];
  };
}

export function renderProfileAnalysisEmail(data: ProfileAnalysisTemplateData): string {
  const { recipientUsername, analyzerUsername, profileData } = data;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f3f4f6;
      padding: 20px;
    }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 48px 32px; text-align: center; }
    .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    .header p { font-size: 16px; opacity: 0.95; }
    .content { padding: 32px; }
    .greeting { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; }
    .intro { color: #4b5563; margin-bottom: 32px; font-size: 15px; }
    .score-card { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0ea5e9; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
    .score-label { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #0369a1; font-weight: 600; margin-bottom: 8px; }
    .score-value { font-size: 56px; font-weight: 800; color: #0c4a6e; line-height: 1; }
    .section { margin: 24px 0; padding: 20px; background: #f9fafb; border-radius: 12px; border-left: 4px solid #6366f1; }
    .section-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .summary-text { color: #374151; font-size: 15px; line-height: 1.7; }
    .skills-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .skill-tag { display: inline-block; background: white; color: #6366f1; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; border: 2px solid #6366f1; }
    .suggestion-item { padding: 14px; margin: 12px 0; background: white; border-left: 4px solid #f59e0b; border-radius: 8px; color: #78350f; font-size: 14px; line-height: 1.6; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .cta-section { margin: 32px 0; padding: 32px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; text-align: center; }
    .cta-title { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 12px; }
    .cta-text { color: #64748b; font-size: 14px; margin-bottom: 24px; line-height: 1.6; }
    .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3); transition: all 0.2s; }
    .button:hover { box-shadow: 0 6px 12px rgba(99, 102, 241, 0.4); }
    .claim-box { background: #fef3c7; border: 2px dashed #f59e0b; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center; }
    .claim-box strong { color: #92400e; font-size: 15px; }
    .footer { text-align: center; color: #9ca3af; font-size: 13px; padding: 24px 32px; border-top: 1px solid #e5e7eb; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Your GitHub Profile Was Analyzed!</h1>
      <p>Someone just scored your coding skills</p>
    </div>

    <div class="content">
      <div class="greeting">Hey ${recipientUsername}! 👋</div>
      <p class="intro">
        <strong>${analyzerUsername}</strong> just analyzed your GitHub profile on <strong>github.gg</strong>
        and generated a comprehensive scorecard based on your public repositories.
      </p>

      ${profileData.overallScore ? `
      <div class="score-card">
        <div class="score-label">Overall Score</div>
        <div class="score-value">${profileData.overallScore}<span style="font-size: 32px; color: #0369a1;">/100</span></div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">📋 Summary</div>
        <p class="summary-text">${profileData.summary}</p>
      </div>

      ${profileData.topSkills && profileData.topSkills.length > 0 ? `
      <div class="section">
        <div class="section-title">⚡ Top Skills</div>
        <div class="skills-grid">
          ${profileData.topSkills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
        </div>
      </div>
      ` : ''}

      ${profileData.suggestions && profileData.suggestions.length > 0 ? `
      <div class="section">
        <div class="section-title">💡 Suggestions for Growth</div>
        ${profileData.suggestions.map(suggestion => `
          <div class="suggestion-item">${suggestion}</div>
        `).join('')}
      </div>
      ` : ''}

      <div class="claim-box">
        <strong>🔑 Is this you?</strong><br>
        <span style="color: #78350f; font-size: 14px;">
          Sign in to github.gg and select which repos to analyze for a more accurate profile!
        </span>
      </div>

      <div class="cta-section">
        <div class="cta-title">View Your Complete Profile</div>
        <p class="cta-text">
          See your detailed analysis, compete in the developer arena,<br>
          and customize your profile with your best repositories.
        </p>
        <a href="https://github.gg/${recipientUsername}" class="button">
          View Full Profile →
        </a>
      </div>
    </div>

    <div class="footer">
      <p>This email was sent because someone analyzed your public GitHub profile.</p>
      <p style="margin-top: 8px;">
        <a href="https://github.gg">github.gg</a> - AI-Powered GitHub Analytics
      </p>
    </div>
  </div>
</body>
</html>
  `;
}


