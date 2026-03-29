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
          <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999">github.gg · Wrapped</span>
          <h1 style="margin:12px 0 0;font-size:24px;font-weight:400;letter-spacing:-0.3px">Your ${year} is ready</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 48px">

          <p style="margin:0 0 32px;font-size:15px">${recipientUsername},</p>

          <p style="margin:0 0 32px;font-size:15px">We analyzed your ${year} GitHub activity and put together a wrapped for you. Coding patterns, personality type, the whole thing.</p>

          <!-- Stats -->
          <h2 style="margin:0 0 20px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#999;border-bottom:1px solid #e8e8e8;padding-bottom:8px">Highlights</h2>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px">
            <tr>
              <td style="padding:8px 0;font-size:14px;font-weight:600;width:160px">Commits</td>
              <td style="padding:8px 0;font-size:14px">${stats.totalCommits.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;font-weight:600;border-top:1px solid #f0f0f0">Top language</td>
              <td style="padding:8px 0;font-size:14px;border-top:1px solid #f0f0f0">${stats.topLanguage}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;font-weight:600;border-top:1px solid #f0f0f0">Longest streak</td>
              <td style="padding:8px 0;font-size:14px;border-top:1px solid #f0f0f0">${stats.longestStreak} days</td>
            </tr>
          </table>

          <p style="margin:0;font-size:15px;border-top:1px solid #e8e8e8;padding-top:24px">
            See the full thing at <a href="${wrappedUrl}" style="color:#1a1a1a">${wrappedUrl.replace('https://', '')}</a>
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 48px;border-top:1px solid #e8e8e8;background:#fafafa">
          <span style="font-size:13px;color:#999">&mdash; github.gg</span><br>
          <span style="font-size:11px;color:#bbb">hello@github.gg</span>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `;
}

export function renderWrappedGiftEmail(data: WrappedGiftEmailData): string {
  const { recipientUsername, senderUsername, year, wrappedUrl, stats, personalMessage } = data;

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
          <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999">github.gg · Wrapped</span>
          <h1 style="margin:12px 0 0;font-size:24px;font-weight:400;letter-spacing:-0.3px">${senderUsername} wrapped your ${year}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 48px">

          <p style="margin:0 0 32px;font-size:15px">${recipientUsername},</p>

          <p style="margin:0 0 32px;font-size:15px">${senderUsername} analyzed your ${year} GitHub activity and created a wrapped for you.</p>

          ${personalMessage ? `
          <p style="margin:0 0 32px;font-size:15px;font-style:italic;color:#555">&ldquo;${personalMessage}&rdquo;</p>
          ` : ''}

          <!-- Stats -->
          <h2 style="margin:0 0 20px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#999;border-bottom:1px solid #e8e8e8;padding-bottom:8px">Highlights</h2>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px">
            <tr>
              <td style="padding:8px 0;font-size:14px;font-weight:600;width:160px">Commits</td>
              <td style="padding:8px 0;font-size:14px">${stats.totalCommits.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;font-weight:600;border-top:1px solid #f0f0f0">Top language</td>
              <td style="padding:8px 0;font-size:14px;border-top:1px solid #f0f0f0">${stats.topLanguage}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;font-weight:600;border-top:1px solid #f0f0f0">Longest streak</td>
              <td style="padding:8px 0;font-size:14px;border-top:1px solid #f0f0f0">${stats.longestStreak} days</td>
            </tr>
          </table>

          <p style="margin:0;font-size:15px;border-top:1px solid #e8e8e8;padding-top:24px">
            See the full thing at <a href="${wrappedUrl}" style="color:#1a1a1a">${wrappedUrl.replace('https://', '')}</a>
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 48px;border-top:1px solid #e8e8e8;background:#fafafa">
          <span style="font-size:13px;color:#999">&mdash; github.gg</span><br>
          <span style="font-size:11px;color:#bbb">hello@github.gg</span>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `;
}
