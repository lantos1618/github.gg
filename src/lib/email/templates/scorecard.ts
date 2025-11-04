export function renderScorecardEmail(data: { repoName: string; analyzerUsername: string; overallScore: number }): string {
  const { repoName, analyzerUsername, overallScore } = data;
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .section { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .score { font-size: 48px; font-weight: bold; color: #667eea; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="header"><h1>📊 Your Repository Was Analyzed!</h1></div>
  <div class="content">
    <div class="section">
      <h2>Your repository "${repoName}" just got a scorecard!</h2>
      <p><strong>${analyzerUsername}</strong> analyzed your repository and generated a comprehensive scorecard.</p>
      <div class="score">${overallScore}/100</div>
      <div style="text-align: center; margin-top: 20px;">
        <a href="https://github.gg/${repoName}/scorecard" class="button">View Full Scorecard</a>
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
}


