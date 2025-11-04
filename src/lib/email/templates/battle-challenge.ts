export function renderBattleChallengeEmail(data: { recipientUsername: string; challengerUsername: string }): string {
  const { recipientUsername, challengerUsername } = data;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background: #f3f4f6; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); color: white; padding: 48px 32px; text-align: center; }
    .header h1 { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
    .header p { font-size: 16px; opacity: 0.95; }
    .content { padding: 32px; }
    .challenge-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 3px solid #f59e0b; border-radius: 12px; padding: 28px; text-align: center; margin: 24px 0; }
    .vs { font-size: 64px; font-weight: 900; color: #dc2626; margin: 16px 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.1); }
    .username { font-size: 24px; font-weight: 700; color: #92400e; margin: 8px 0; }
    .section { margin: 24px 0; padding: 20px; background: #f9fafb; border-radius: 12px; border-left: 4px solid #ef4444; }
    .section-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 12px; }
    .cta-section { margin: 32px 0; padding: 32px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; text-align: center; }
    .button { display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 18px; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3); transition: all 0.2s; margin-top: 16px; }
    .button:hover { box-shadow: 0 6px 12px rgba(239, 68, 68, 0.4); transform: translateY(-2px); }
    .footer { text-align: center; color: #9ca3af; font-size: 13px; padding: 24px 32px; border-top: 1px solid #e5e7eb; }
    .footer a { color: #ef4444; text-decoration: none; }
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
      <div class="cta-section">
        <a href="https://github.gg/arena" class="button">View Battle Results →</a>
      </div>
      <div style="background: #fef3c7; border: 2px dashed #f59e0b; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
        <strong style="color: #92400e; font-size: 15px;">Want to challenge others?</strong><br>
        <span style="color: #78350f; font-size: 14px;">Sign up for github.gg and start battling developers around the world!</span>
      </div>
    </div>
    <div class="footer">
      <p>This email was sent because ${challengerUsername} challenged you to a battle.</p>
      <p style="margin-top: 8px;"><a href="https://github.gg">github.gg</a> - AI-Powered Developer Arena</p>
    </div>
  </div>
</body>
</html>
  `;
}


