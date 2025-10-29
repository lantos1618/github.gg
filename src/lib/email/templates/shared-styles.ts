export const baseStyles = `
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
  .content {
    padding: 32px;
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
  .section {
    margin: 24px 0;
    padding: 20px;
    background: #f9fafb;
    border-radius: 12px;
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
`;

export const profileStyles = `
  ${baseStyles}
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
    border-left: 4px solid #6366f1;
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
`;

export function wrapInHTML(content: string, styles: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${styles}</style>
</head>
<body>
  ${content}
</body>
</html>
  `;
}
