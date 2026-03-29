export interface BattleResultsTemplateData {
  recipientUsername: string;
  opponentUsername: string;
  won: boolean;
  yourScore: number;
  opponentScore: number;
  eloChange: number;
  newElo: number;
  reason: string;
}

export function renderBattleResultsEmail(data: BattleResultsTemplateData): string {
  const { recipientUsername, opponentUsername, won, yourScore, opponentScore, eloChange, newElo, reason } = data;

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
          <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999">github.gg · Arena</span>
          <h1 style="margin:12px 0 0;font-size:24px;font-weight:400;letter-spacing:-0.3px">${recipientUsername} vs ${opponentUsername}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 48px">

          <p style="margin:0 0 32px;font-size:15px">${recipientUsername}, your battle is in. ${won ? 'You won.' : 'You lost.'}</p>

          <!-- Scores -->
          <h2 style="margin:0 0 20px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#999;border-bottom:1px solid #e8e8e8;padding-bottom:8px">Scores</h2>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px">
            <tr>
              <td style="padding:8px 0;font-size:14px;font-weight:600;width:180px">${recipientUsername}</td>
              <td style="padding:8px 0;font-size:14px">${yourScore.toFixed(1)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;font-weight:600;border-top:1px solid #f0f0f0">${opponentUsername}</td>
              <td style="padding:8px 0;font-size:14px;border-top:1px solid #f0f0f0">${opponentScore.toFixed(1)}</td>
            </tr>
          </table>

          <!-- Rating -->
          <h2 style="margin:0 0 20px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#999;border-bottom:1px solid #e8e8e8;padding-bottom:8px">Rating</h2>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px">
            <tr>
              <td style="padding:8px 0;font-size:14px;font-weight:600;width:180px">Elo change</td>
              <td style="padding:8px 0;font-size:14px">${eloChange >= 0 ? '+' : ''}${eloChange}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;font-weight:600;border-top:1px solid #f0f0f0">New rating</td>
              <td style="padding:8px 0;font-size:14px;border-top:1px solid #f0f0f0">${newElo}</td>
            </tr>
          </table>

          <!-- Analysis -->
          <h2 style="margin:0 0 20px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#999;border-bottom:1px solid #e8e8e8;padding-bottom:8px">Analysis</h2>
          <p style="margin:0 0 32px;font-size:15px">${reason}</p>

          <p style="margin:0 0 8px;font-size:15px;border-top:1px solid #e8e8e8;padding-top:24px">
            <a href="https://github.gg/arena?rematch=${encodeURIComponent(opponentUsername)}" style="color:#1a1a1a">Rematch ${opponentUsername}</a> · <a href="https://github.gg/arena" style="color:#1a1a1a">Arena</a>
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 48px;border-top:1px solid #e8e8e8;background:#fafafa">
          <span style="font-size:13px;color:#999">&mdash; github.gg</span><br>
          <span style="font-size:11px;color:#bbb">arena@github.gg</span>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
  `;
}
