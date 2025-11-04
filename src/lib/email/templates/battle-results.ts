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
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background:#f5f6f8; color:#0f172a; padding:24px; }
    .wrap { max-width:680px; margin:0 auto; }
    .topbar { background:#0b1020; color:#fff; padding:14px 20px; border-radius:12px 12px 0 0; }
    .brand { display:flex; align-items:center; gap:12px; font-weight:800; }
    .brand-badge { background:#10b981; color:#031; padding:2px 8px; border-radius:999px; font-size:12px; font-weight:700; opacity:.85; }
    .hero { background:${won ? '#0ea5e9' : '#ef4444'}14; border:1px solid ${won ? '#0ea5e9' : '#ef4444'}33; border-top:none; padding:36px 24px; text-align:center; }
    .hero-title { font-size:28px; font-weight:900; letter-spacing:.6px; color:${won ? '#065f46' : '#991b1b'}; }
    .sub { color:#475569; margin-top:6px; }
    .circle { width:64px; height:64px; border-radius:999px; display:inline-flex; align-items:center; justify-content:center; margin-bottom:14px; background:${won ? '#10b981' : '#ef4444'}1a; border:2px solid ${won ? '#10b981' : '#ef4444'}40; font-size:28px; }
    .card { background:#fff; border-radius:0 0 12px 12px; overflow:hidden; box-shadow:0 8px 20px rgba(2,6,23,.08); }
    .vs-row { display:flex; justify-content:space-between; gap:16px; padding:22px; border-bottom:1px solid #e2e8f0; }
    .col { flex:1; text-align:center; }
    .label { font-size:12px; color:#64748b; letter-spacing:1px; text-transform:uppercase; font-weight:700; margin-bottom:6px; }
    .name { font-weight:800; color:#0f172a; }
    .score { font-size:38px; font-weight:900; color:${won ? '#059669' : '#dc2626'}; }
    .vs-dot { font-weight:900; color:#334155; font-size:14px; margin-top:10px; }
    .metrics { display:flex; gap:16px; padding:18px 22px; }
    .metric { flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; text-align:center; }
    .metric .value { font-size:24px; font-weight:900; color:${eloChange >= 0 ? '#10b981' : '#ef4444'}; }
    .section { margin:18px 22px; padding:18px; background:#f8fafc; border-left:4px solid ${won ? '#10b981' : '#ef4444'}; border-radius:10px; }
    .section h3 { font-size:16px; margin-bottom:8px; }
    .cta-row { display:flex; gap:12px; padding:0 22px 22px; }
    .btn { display:block; flex:1; text-decoration:none; text-align:center; padding:14px 18px; border-radius:10px; font-weight:800; font-size:16px; }
    .btn-primary { background:#0f766e; color:#fff; }
    .btn-secondary { background:#111827; color:#fff; }
    .features { margin:12px 22px 22px; padding:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; }
    .features h4 { font-size:12px; text-transform:uppercase; letter-spacing:.8px; color:#64748b; margin-bottom:10px; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .chip { background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; font-size:14px; font-weight:600; color:#0f172a; }
    .stats { text-align:center; padding:0 22px 22px; }
    .stats a { color:#0ea5e9; text-decoration:none; font-weight:800; }
    .footer { text-align:center; color:#94a3b8; font-size:12px; margin-top:14px; }
    @media (max-width: 520px){ .grid{ grid-template-columns:1fr; } .cta-row{ flex-direction:column; } .vs-row{ flex-direction:column; } }
  </style>
  <title>github.gg battle results</title>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="topbar">
        <div class="brand">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="background:#16a34a; width:28px; height:28px; border-radius:6px; display:inline-block;"></div>
            <div style="font-size:18px;">github.gg</div>
          </div>
          <span class="brand-badge">BETA</span>
        </div>
      </div>

      <div class="hero">
        <div class="circle">${won ? '✓' : '✕'}</div>
        <div class="hero-title">${won ? 'VICTORY' : 'DEFEAT'}</div>
        <div class="sub">Learn and come back stronger</div>
      </div>

      <div class="vs-row">
        <div class="col">
          <div class="label">You</div>
          <div class="name">${recipientUsername}</div>
          <div class="score">${yourScore.toFixed(2)}</div>
        </div>
        <div class="col" style="align-self:center; max-width:60px;">
          <div class="vs-dot">VS</div>
        </div>
        <div class="col">
          <div class="label">Opponent</div>
          <div class="name">${opponentUsername}</div>
          <div class="score" style="color:#16a34a;">${opponentScore.toFixed(2)}</div>
        </div>
      </div>

      <div class="metrics">
        <div class="metric">
          <div class="label">Elo Change</div>
          <div class="value">${eloChange >= 0 ? '+' : ''}${eloChange}</div>
        </div>
        <div class="metric">
          <div class="label">New Rating</div>
          <div class="value" style="color:#0f172a;">${newElo}</div>
        </div>
      </div>

      <div class="section">
        <h3>🤖 AI Battle Analysis</h3>
        <p style="color:#334155; line-height:1.7; font-size:14px;">${reason}</p>
      </div>

      <div class="cta-row">
        <a class="btn btn-primary" href="https://github.gg/arena?rematch=${encodeURIComponent(opponentUsername)}">Rematch ${opponentUsername}</a>
        <a class="btn btn-secondary" href="https://github.gg/arena">Find New Challenger</a>
      </div>

      <div class="features">
        <h4>What you get with github.gg</h4>
        <div class="grid">
          <div class="chip">AI Code Review</div>
          <div class="chip">PR Analysis</div>
          <div class="chip">Better Dashboard</div>
          <div class="chip">Slop Detection</div>
        </div>
      </div>

      <div class="stats">
        <a href="https://github.gg/arena">View Full Battle Stats →</a>
      </div>
    </div>

    <div class="footer">
      <div><a href="https://github.gg" style="color:#0ea5e9; text-decoration:none; font-weight:700;">github.gg</a> · AI-powered code analytics & battles</div>
      <div style="margin-top:8px;">
        <a href="https://github.gg/dashboard" style="color:#64748b; text-decoration:none;">Dashboard</a> ·
        <a href="https://github.gg/rankings" style="color:#64748b; text-decoration:none;">Rankings</a> ·
        <a href="https://github.gg/settings" style="color:#64748b; text-decoration:none;">Settings</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}


