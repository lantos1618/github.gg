export function renderFeatureRequestEmail(data: { userEmail: string; featureRequest: string }): string {
  const { userEmail, featureRequest } = data;
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
          <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999">github.gg · Feedback</span>
          <h1 style="margin:12px 0 0;font-size:24px;font-weight:400;letter-spacing:-0.3px">Feature request from ${userEmail}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 48px">
          <p style="margin:0 0 32px;font-size:15px;white-space:pre-wrap">${featureRequest}</p>
          <p style="margin:0;font-size:14px;color:#999">Reply to this email to respond to ${userEmail}.</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 48px;border-top:1px solid #e8e8e8;background:#fafafa">
          <span style="font-size:11px;color:#bbb">Submitted via github.gg</span>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `;
}
