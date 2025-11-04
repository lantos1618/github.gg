export function renderFeatureRequestEmail(data: { userEmail: string; featureRequest: string }): string {
  const { userEmail, featureRequest } = data;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background: #f3f4f6; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 48px 32px; text-align: center; }
    .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    .content { padding: 32px; }
    .label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: 600; margin-bottom: 8px; }
    .email { background: #f3f4f6; padding: 12px 16px; border-radius: 8px; font-size: 16px; color: #1f2937; margin-bottom: 24px; font-weight: 600; }
    .request-box { background: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .request-text { color: #374151; font-size: 15px; line-height: 1.7; white-space: pre-wrap; }
    .footer { text-align: center; color: #9ca3af; font-size: 13px; padding: 24px 32px; border-top: 1px solid #e5e7eb; }
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
}


