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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#fafafa;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a1a;line-height:1.6">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa">
    <tr><td align="center" style="padding:40px 20px">
      <table width="700" cellpadding="0" cellspacing="0" style="max-width:700px;width:100%;background:#ffffff;border:1px solid #e8e8e8">

        <!-- Header -->
        <tr><td style="padding:48px 48px 32px;border-bottom:1px solid #e8e8e8">
          <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999">github.gg · ${recipientUsername}</span>
          <h1 style="margin:12px 0 0;font-size:24px;font-weight:400;letter-spacing:-0.3px">Developer Profile, analyzed by ${analyzerUsername}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 48px">

          <p style="margin:0 0 32px;font-size:15px">${recipientUsername},</p>

          <p style="margin:0 0 32px;font-size:15px">Someone ran an AI analysis on your public GitHub repositories and generated a developer profile for you on github.gg. Here's what came back.</p>

          ${profileData.overallScore != null ? `
          <!-- Score -->
          <h2 style="margin:0 0 20px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#999;border-bottom:1px solid #e8e8e8;padding-bottom:8px">Score</h2>
          <p style="margin:0 0 32px;font-size:42px;font-weight:300;letter-spacing:-1px">${profileData.overallScore}<span style="font-size:18px;color:#999"> / 100</span></p>
          ` : ''}

          <!-- Summary -->
          <h2 style="margin:0 0 20px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#999;border-bottom:1px solid #e8e8e8;padding-bottom:8px">Summary</h2>
          <p style="margin:0 0 32px;font-size:15px">${profileData.summary}</p>

          ${profileData.topSkills && profileData.topSkills.length > 0 ? `
          <!-- Skills -->
          <h2 style="margin:0 0 20px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#999;border-bottom:1px solid #e8e8e8;padding-bottom:8px">Top Skills</h2>
          <p style="margin:0 0 32px;font-size:15px">${profileData.topSkills.join(' · ')}</p>
          ` : ''}

          ${profileData.suggestions && profileData.suggestions.length > 0 ? `
          <!-- Suggestions -->
          <h2 style="margin:0 0 20px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#999;border-bottom:1px solid #e8e8e8;padding-bottom:8px">Suggestions</h2>
          ${profileData.suggestions.map((s, i) => `
            <p style="margin:0 0 ${i === (profileData.suggestions?.length ?? 0) - 1 ? 32 : 12}px;font-size:14px">${s}</p>
          `).join('')}
          ` : ''}

          <p style="margin:0 0 8px;font-size:15px;border-top:1px solid #e8e8e8;padding-top:24px">
            View your full profile at <a href="https://github.gg/${recipientUsername}" style="color:#1a1a1a">github.gg/${recipientUsername}</a>
          </p>
          <p style="margin:0;font-size:14px;color:#999">Sign in to choose which repos are included and make it yours.</p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 48px;border-top:1px solid #e8e8e8;background:#fafafa">
          <span style="font-size:13px;color:#999">&mdash; github.gg</span><br>
          <span style="font-size:11px;color:#bbb">Sent because someone analyzed your public GitHub profile</span>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `;
}
