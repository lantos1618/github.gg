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
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 48px 32px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 16px;
      opacity: 0.95;
    }
    .content {
      padding: 32px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 16px;
    }
    .intro {
      color: #4b5563;
      margin-bottom: 32px;
      font-size: 15px;
    }
    .score-card {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #0ea5e9;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .score-label {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0369a1;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .score-value {
      font-size: 56px;
      font-weight: 800;
      color: #0c4a6e;
      line-height: 1;
    }
    .section {
      margin: 24px 0;
      padding: 20px;
      background: #f9fafb;
      border-radius: 12px;
      border-left: 4px solid #6366f1;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .summary-text {
      color: #374151;
      font-size: 15px;
      line-height: 1.7;
    }
    .skills-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .skill-tag {
      display: inline-block;
      background: white;
      color: #6366f1;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      border: 2px solid #6366f1;
    }
    .suggestion-item {
      padding: 14px;
      margin: 12px 0;
      background: white;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      color: #78350f;
      font-size: 14px;
      line-height: 1.6;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .cta-section {
      margin: 32px 0;
      padding: 32px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 12px;
      text-align: center;
    }
    .cta-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 12px;
    }
    .cta-text {
      color: #64748b;
      font-size: 14px;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);
      transition: all 0.2s;
    }
    .button:hover {
      box-shadow: 0 6px 12px rgba(99, 102, 241, 0.4);
    }
    .claim-box {
      background: #fef3c7;
      border: 2px dashed #f59e0b;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
      text-align: center;
    }
    .claim-box strong {
      color: #92400e;
      font-size: 15px;
    }
    .footer {
      text-align: center;
      color: #9ca3af;
      font-size: 13px;
      padding: 24px 32px;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }
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

  try {
    const response = await resend.emails.send({
      from: 'GitHub.gg <hello@github.gg>',
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

export async function sendFeatureRequestEmail(data: {
  userEmail: string;
  featureRequest: string;
}) {
  const { userEmail, featureRequest } = data;

  const html = `
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
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: white;
      padding: 48px 32px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .content {
      padding: 32px;
    }
    .label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b7280;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .email {
      background: #f3f4f6;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 16px;
      color: #1f2937;
      margin-bottom: 24px;
      font-weight: 600;
    }
    .request-box {
      background: #f9fafb;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .request-text {
      color: #374151;
      font-size: 15px;
      line-height: 1.7;
      white-space: pre-wrap;
    }
    .footer {
      text-align: center;
      color: #9ca3af;
      font-size: 13px;
      padding: 24px 32px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 New Feature Request</h1>
    </div>

    <div class="content">
      <div class="label">From</div>
      <div class="email">${userEmail}</div>

      <div class="label">Feature Request</div>
      <div class="request-box">
        <div class="request-text">${featureRequest}</div>
      </div>
    </div>

    <div class="footer">
      <p>Feature request submitted via github.gg</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const response = await resend.emails.send({
      from: 'GitHub.gg <hello@github.gg>',
      to: 'lantos1618@gmail.com', // Your email
      replyTo: userEmail,
      subject: `New Feature Request from ${userEmail}`,
      html,
    });

    console.log('✅ Feature request email sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send feature request email:', error);
    throw error;
  }
}

export async function sendBattleResultsEmail(data: {
  recipientEmail: string;
  recipientUsername: string;
  opponentUsername: string;
  won: boolean;
  yourScore: number;
  opponentScore: number;
  eloChange: number;
  newElo: number;
  reason: string;
}) {
  const { recipientEmail, recipientUsername, opponentUsername, won, yourScore, opponentScore, eloChange, newElo, reason } = data;

  const html = `
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
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
    }
    .header {
      background: linear-gradient(135deg, ${won ? '#10b981 0%, #059669 100%' : '#ef4444 0%, #dc2626 100%'});
      color: white;
      padding: 48px 32px;
      text-align: center;
    }
    .header h1 {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 18px;
      opacity: 0.95;
    }
    .content {
      padding: 32px;
    }
    .result-box {
      background: linear-gradient(135deg, ${won ? '#d1fae5 0%, #a7f3d0 100%' : '#fee2e2 0%, #fecaca 100%'});
      border: 3px solid ${won ? '#10b981' : '#ef4444'};
      border-radius: 12px;
      padding: 28px;
      text-align: center;
      margin: 24px 0;
    }
    .vs {
      font-size: 48px;
      font-weight: 900;
      color: ${won ? '#065f46' : '#991b1b'};
      margin: 16px 0;
    }
    .username {
      font-size: 24px;
      font-weight: 700;
      color: ${won ? '#065f46' : '#991b1b'};
      margin: 8px 0;
    }
    .score {
      font-size: 48px;
      font-weight: 900;
      color: ${won ? '#059669' : '#dc2626'};
      margin: 12px 0;
    }
    .elo-box {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      text-align: center;
    }
    .elo-change {
      font-size: 36px;
      font-weight: 900;
      color: ${eloChange >= 0 ? '#10b981' : '#ef4444'};
    }
    .section {
      margin: 24px 0;
      padding: 20px;
      background: #f9fafb;
      border-radius: 12px;
      border-left: 4px solid ${won ? '#10b981' : '#ef4444'};
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 18px;
      box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);
      margin-top: 16px;
    }
    .footer {
      text-align: center;
      color: #9ca3af;
      font-size: 13px;
      padding: 24px 32px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${won ? '🏆 VICTORY!' : '💪 DEFEAT'}</h1>
      <p>Your battle results are in</p>
    </div>

    <div class="content">
      <div class="result-box">
        <div class="username">${recipientUsername}</div>
        <div class="score">${yourScore}</div>
        <div class="vs">VS</div>
        <div class="score">${opponentScore}</div>
        <div class="username">${opponentUsername}</div>
      </div>

      <div class="elo-box">
        <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">ELO CHANGE</div>
        <div class="elo-change">${eloChange >= 0 ? '+' : ''}${eloChange}</div>
        <div style="font-size: 18px; color: #374151; margin-top: 8px;">New Rating: <strong>${newElo}</strong></div>
      </div>

      <div class="section">
        <div style="font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 12px;">🤖 AI Analysis</div>
        <p style="color: #374151; font-size: 15px; line-height: 1.7;">${reason}</p>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://github.gg/arena" class="button">
          View Full Battle Details →
        </a>
      </div>

      ${!won ? `
      <div style="background: #fef3c7; border: 2px dashed #f59e0b; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
        <strong style="color: #92400e; font-size: 15px;">Ready for a rematch?</strong><br>
        <span style="color: #78350f; font-size: 14px;">
          Challenge ${opponentUsername} again or find new opponents on the arena!
        </span>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <p>Battle results from github.gg Arena</p>
      <p style="margin-top: 8px;">
        <a href="https://github.gg/arena" style="color: #6366f1;">github.gg</a> - AI-Powered Developer Arena
      </p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const response = await resend.emails.send({
      from: 'GitHub.gg Arena <arena@github.gg>',
      to: recipientEmail,
      subject: `${won ? '🏆 Victory!' : '💪 Battle Results'} You ${won ? 'defeated' : 'fought'} ${opponentUsername}`,
      html,
    });

    console.log('✅ Battle results email sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send battle results email:', error);
    throw error;
  }
}

export async function sendBattleChallengeEmail(data: {
  recipientEmail: string;
  recipientUsername: string;
  challengerUsername: string;
  battleId: string;
}) {
  const { recipientEmail, recipientUsername, challengerUsername, battleId } = data;

  const html = `
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
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.07);
    }
    .header {
      background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
      color: white;
      padding: 48px 32px;
      text-align: center;
    }
    .header h1 {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 16px;
      opacity: 0.95;
    }
    .content {
      padding: 32px;
    }
    .challenge-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 3px solid #f59e0b;
      border-radius: 12px;
      padding: 28px;
      text-align: center;
      margin: 24px 0;
    }
    .vs {
      font-size: 64px;
      font-weight: 900;
      color: #dc2626;
      margin: 16px 0;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
    }
    .username {
      font-size: 24px;
      font-weight: 700;
      color: #92400e;
      margin: 8px 0;
    }
    .section {
      margin: 24px 0;
      padding: 20px;
      background: #f9fafb;
      border-radius: 12px;
      border-left: 4px solid #ef4444;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 12px;
    }
    .cta-section {
      margin: 32px 0;
      padding: 32px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 12px;
      text-align: center;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
      color: white;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 18px;
      box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);
      transition: all 0.2s;
      margin-top: 16px;
    }
    .button:hover {
      box-shadow: 0 6px 12px rgba(239, 68, 68, 0.4);
      transform: translateY(-2px);
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 20px 0;
    }
    .info-item {
      background: white;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
    }
    .info-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b7280;
      font-weight: 600;
    }
    .info-value {
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
      margin-top: 4px;
    }
    .footer {
      text-align: center;
      color: #9ca3af;
      font-size: 13px;
      padding: 24px 32px;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #ef4444;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚔️ BATTLE CHALLENGE!</h1>
      <p>You've been challenged to a coding duel</p>
    </div>

    <div class="content">
      <div class="challenge-box">
        <div class="username">${challengerUsername}</div>
        <div class="vs">VS</div>
        <div class="username">${recipientUsername}</div>
      </div>

      <div class="section">
        <div class="section-title">🎯 What's This About?</div>
        <p style="color: #374151; font-size: 15px; line-height: 1.7;">
          <strong>${challengerUsername}</strong> has challenged you to an epic developer battle on <strong>github.gg</strong>!
          Your GitHub profiles will be analyzed by AI to determine who has the superior coding prowess.
        </p>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Judged By</div>
          <div class="info-value">AI 🤖</div>
        </div>
        <div class="info-item">
          <div class="info-label">Battle Type</div>
          <div class="info-value">Arena ⚔️</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">🏆 What's At Stake?</div>
        <ul style="color: #374151; font-size: 15px; padding-left: 20px;">
          <li>ELO rating points</li>
          <li>Tier advancement (Bronze → Master)</li>
          <li>Leaderboard position</li>
          <li>Bragging rights</li>
        </ul>
      </div>

      <div class="cta-section">
        <div style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 12px;">
          Ready to Accept the Challenge?
        </div>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">
          The battle has already begun! View the results and see who claimed victory.
        </p>
        <a href="https://github.gg/arena" class="button">
          View Battle Results →
        </a>
      </div>

      <div style="background: #fef3c7; border: 2px dashed #f59e0b; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
        <strong style="color: #92400e; font-size: 15px;">Want to challenge others?</strong><br>
        <span style="color: #78350f; font-size: 14px;">
          Sign up for github.gg and start battling developers around the world!
        </span>
      </div>
    </div>

    <div class="footer">
      <p>This email was sent because ${challengerUsername} challenged you to a battle.</p>
      <p style="margin-top: 8px;">
        <a href="https://github.gg">github.gg</a> - AI-Powered Developer Arena
      </p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const response = await resend.emails.send({
      from: 'GitHub.gg Arena <arena@github.gg>',
      to: recipientEmail,
      subject: `⚔️ ${challengerUsername} challenged you to a coding battle!`,
      html,
    });

    console.log('✅ Battle challenge email sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send battle challenge email:', error);
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
      from: 'GitHub.gg <hello@github.gg>',
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
