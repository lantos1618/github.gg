export function renderScorecardEmail(data: { repoName: string; analyzerUsername: string; overallScore: number }): string {
  const { repoName, analyzerUsername, overallScore } = data;

  const grade =
    overallScore >= 90 ? 'A' :
    overallScore >= 80 ? 'B' :
    overallScore >= 70 ? 'C' :
    overallScore >= 60 ? 'D' : 'F';

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
          <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999">github.gg · Repository Scorecard</span>
          <h1 style="margin:12px 0 0;font-size:24px;font-weight:400;letter-spacing:-0.3px">${repoName}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 48px">

          <p style="margin:0 0 32px;font-size:15px">${analyzerUsername} analyzed your repository and generated a scorecard across code quality, documentation, testing, and architecture.</p>

          <!-- Score -->
          <h2 style="margin:0 0 20px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#999;border-bottom:1px solid #e8e8e8;padding-bottom:8px">Result</h2>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px">
            <tr>
              <td style="padding:8px 0;font-size:14px;font-weight:600;width:120px">Score</td>
              <td style="padding:8px 0;font-size:14px">${overallScore} / 100</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;font-weight:600;border-top:1px solid #f0f0f0">Grade</td>
              <td style="padding:8px 0;font-size:14px;border-top:1px solid #f0f0f0">${grade}</td>
            </tr>
          </table>

          <p style="margin:0;font-size:15px;border-top:1px solid #e8e8e8;padding-top:24px">
            Full breakdown at <a href="https://github.gg/${repoName}/scorecard" style="color:#1a1a1a">github.gg/${repoName}/scorecard</a>
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 48px;border-top:1px solid #e8e8e8;background:#fafafa">
          <span style="font-size:13px;color:#999">&mdash; github.gg</span><br>
          <span style="font-size:11px;color:#bbb">Sent because someone analyzed your public repository</span>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `;
}
