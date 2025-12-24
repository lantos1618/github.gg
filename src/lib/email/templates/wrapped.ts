export interface WrappedEmailData {
  recipientUsername: string;
  year: number;
  wrappedUrl: string;
  stats: {
    totalCommits: number;
    topLanguage: string;
    longestStreak: number;
  };
}

export interface WrappedGiftEmailData extends WrappedEmailData {
  senderUsername: string;
  personalMessage?: string;
}

export function renderWrappedReadyEmail(data: WrappedEmailData): string {
  const { recipientUsername, year, wrappedUrl, stats } = data;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f6f8; color: #0f172a; padding: 24px; }
    .wrap { max-width: 580px; margin: 0 auto; }
    .card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(2,6,23,.1); }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); padding: 40px 24px; text-align: center; }
    .emoji { font-size: 64px; margin-bottom: 16px; }
    .title { color: #fff; font-size: 32px; font-weight: 900; margin-bottom: 8px; }
    .subtitle { color: rgba(255,255,255,0.9); font-size: 18px; }
    .stats { display: flex; justify-content: center; gap: 24px; padding: 32px 24px; background: #f8fafc; }
    .stat { text-align: center; }
    .stat-value { font-size: 32px; font-weight: 900; color: #7c3aed; }
    .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
    .body { padding: 32px 24px; text-align: center; }
    .message { font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
    .cta { display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%); color: #fff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 18px; }
    .cta:hover { opacity: 0.9; }
    .footer { text-align: center; padding: 24px; color: #94a3b8; font-size: 12px; }
    .footer a { color: #7c3aed; text-decoration: none; }
    @media (max-width: 520px) { .stats { flex-direction: column; gap: 16px; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="header">
        <div class="emoji">🎁</div>
        <div class="title">${year} Wrapped</div>
        <div class="subtitle">Your year in code is ready, @${recipientUsername}!</div>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat-value">${stats.totalCommits.toLocaleString()}</div>
          <div class="stat-label">Commits</div>
        </div>
        <div class="stat">
          <div class="stat-value">${stats.topLanguage}</div>
          <div class="stat-label">Top Language</div>
        </div>
        <div class="stat">
          <div class="stat-value">${stats.longestStreak}</div>
          <div class="stat-label">Day Streak</div>
        </div>
      </div>

      <div class="body">
        <p class="message">
          We've analyzed your ${year} GitHub activity and prepared a personalized wrapped experience just for you. 
          See your coding patterns, personality type, and more!
        </p>
        <a class="cta" href="${wrappedUrl}">View My Wrapped →</a>
      </div>
    </div>

    <div class="footer">
      <p><a href="https://github.gg">github.gg</a> · AI-powered code analytics</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function renderWrappedGiftEmail(data: WrappedGiftEmailData): string {
  const { recipientUsername, senderUsername, year, wrappedUrl, stats, personalMessage } = data;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f6f8; color: #0f172a; padding: 24px; }
    .wrap { max-width: 580px; margin: 0 auto; }
    .card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(2,6,23,.1); }
    .header { background: linear-gradient(135deg, #f97316 0%, #ec4899 50%, #7c3aed 100%); padding: 40px 24px; text-align: center; }
    .emoji { font-size: 64px; margin-bottom: 16px; }
    .title { color: #fff; font-size: 28px; font-weight: 900; margin-bottom: 8px; }
    .subtitle { color: rgba(255,255,255,0.9); font-size: 16px; }
    .sender-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 12px; padding: 20px; margin: 24px; text-align: center; }
    .sender-label { font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .sender-name { font-size: 20px; font-weight: 800; color: #78350f; }
    .personal-message { background: #f1f5f9; border-left: 4px solid #7c3aed; padding: 16px; margin: 0 24px; border-radius: 0 8px 8px 0; font-style: italic; color: #475569; }
    .stats { display: flex; justify-content: center; gap: 24px; padding: 32px 24px; background: #f8fafc; }
    .stat { text-align: center; }
    .stat-value { font-size: 28px; font-weight: 900; color: #7c3aed; }
    .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
    .body { padding: 32px 24px; text-align: center; }
    .message { font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
    .cta { display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); color: #fff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 18px; }
    .footer { text-align: center; padding: 24px; color: #94a3b8; font-size: 12px; }
    .footer a { color: #7c3aed; text-decoration: none; }
    @media (max-width: 520px) { .stats { flex-direction: column; gap: 16px; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="header">
        <div class="emoji">🎁✨</div>
        <div class="title">You've Been Wrapped!</div>
        <div class="subtitle">@${senderUsername} created a ${year} Wrapped for you</div>
      </div>

      <div class="sender-box">
        <div class="sender-label">Gift from</div>
        <div class="sender-name">@${senderUsername}</div>
      </div>

      ${personalMessage ? `
      <div class="personal-message">
        "${personalMessage}"
      </div>
      ` : ''}

      <div class="stats">
        <div class="stat">
          <div class="stat-value">${stats.totalCommits.toLocaleString()}</div>
          <div class="stat-label">Commits</div>
        </div>
        <div class="stat">
          <div class="stat-value">${stats.topLanguage}</div>
          <div class="stat-label">Top Language</div>
        </div>
        <div class="stat">
          <div class="stat-value">${stats.longestStreak}</div>
          <div class="stat-label">Day Streak</div>
        </div>
      </div>

      <div class="body">
        <p class="message">
          Your friend analyzed your ${year} GitHub activity and created a personalized wrapped experience for you!
          See your coding patterns, personality type, and more.
        </p>
        <a class="cta" href="${wrappedUrl}">Unwrap My Year →</a>
      </div>
    </div>

    <div class="footer">
      <p><a href="https://github.gg">github.gg</a> · AI-powered code analytics</p>
      <p style="margin-top: 8px;">Want to create one for a friend? <a href="https://github.gg/wrapped">Generate a Wrapped</a></p>
    </div>
  </div>
</body>
</html>
  `;
}
