const fs = require('fs');
let f = fs.readFileSync('routes/visits.js', 'utf8');

const puppeteerRequire = "const puppeteer = require('puppeteer');\n";
if (!f.includes('puppeteer')) {
  f = puppeteerRequire + f;
}

const newPdfLogic = `
async function generatePuppeteerPDF(visit) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  const inT = visit.in_time ? new Date(visit.in_time).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
  const outT = visit.out_time ? new Date(visit.out_time).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
  let dur = '0';
  if (visit.in_time && visit.out_time) {
    dur = Math.round((new Date(visit.out_time) - new Date(visit.in_time)) / 60000);
  }
  
  const h = visit.host_name || '—';
  const name = visit.name || '—';
  const company = visit.company || '—';
  const purpose = visit.purpose || '—';
  const photo = visit.photo_b64 || '';
  const rfid = visit.rfid_tag || '—';
  const idType = visit.id_type || '—';
  const isTeam = visit.visitor_type === 'Team';
  const teamName = visit.team_name || '—';
  const teamCount = visit.team_count || 0;
  
  function initials(n) {
    if(!n || n === '—') return '';
    return n.split(' ').map(s=>s[0]).join('').substring(0,2).toUpperCase();
  }
  
  const iconCheck = \`<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>\`;
  const iconStar = \`<svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>\`;
  
  const html = \`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
    :root {
      --navy: #0A1628; --blue: #2563EB; --blue-t: #EFF4FF; --blue-b: #BFDBFE;
      --green: #16A34A; --green-t: #F0FDF4; --green-b: #BBF7D0;
      --bg: #F1F5FB; --card: #FFFFFF; --text: #0F172A; --text-m: #334155; --muted: #64748B;
      --border: #E2E8F0; --r-sm: 8px;
      --font: 'Outfit', sans-serif; --mono: 'Space Mono', monospace;
    }
    body { font-family: var(--font); color: var(--text); padding: 40px; background: #fff; }
    .card { background: var(--card); border: 1px solid var(--green-b); border-radius: 12px; overflow: hidden; }
    .card-hd { background: var(--green-t); border-bottom: 1px solid var(--green-b); text-align: center; padding: 24px; }
    .success-icon { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #fff; color: var(--green); border-radius: 50%; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.15); margin-bottom: 12px; }
    .card-title { font-size: 20px; font-weight: 700; color: var(--green); letter-spacing: -0.3px; margin-bottom: 4px; }
    .card-sub { font-size: 13px; color: #166534; }
    .card-body { padding: 20px; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--blue); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex-shrink: 0; }
    .badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
    .badge-green { background: var(--green-t); color: var(--green); border: 1px solid var(--green-b); }
    .rg { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .rg-card { background: var(--bg); padding: 12px 14px; border-radius: var(--r-sm); border: 1px solid rgba(0,0,0,0.03); }
    .rg-lbl { font-size: 10.5px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .rg-val { font-size: 14px; font-weight: 700; color: var(--text); }
    .mono { font-family: var(--mono); color: var(--blue); font-weight: 700; letter-spacing: 0.5px; }
    .data-box { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .dr { display: flex; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--border); }
    .dr:last-child { border-bottom: none; }
    .dl { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; width: 110px; flex-shrink: 0; }
    .dv { font-size: 13.5px; font-weight: 600; color: var(--text-m); flex: 1; text-align: right; }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-hd">
      <div class="success-icon">\${iconStar}</div>
      <div class="card-title">Visit Recorded</div>
      <div class="card-sub">All data saved securely. RFID card released back to pool.</div>
    </div>
    <div class="card-body">
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:14px;padding:11px;background:var(--bg);border-radius:var(--r-sm)">
        \${photo ? \`<img src="\${photo}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0">\` : \`<div class="avatar">\${initials(name)}</div>\`}
        <div style="flex:1">
          <div style="font-size:13.5px;font-weight:700">\${name}</div>
          <div style="font-size:11px;color:var(--muted)">\${company} &middot; \${purpose}</div>
        </div>
        <span class="badge badge-green">\${iconCheck} Done</span>
      </div>
      <div class="rg">
        <div class="rg-card"><div class="rg-lbl">Check-in</div><div class="rg-val mono">\${inT}</div></div>
        <div class="rg-card"><div class="rg-lbl">Check-out</div><div class="rg-val mono">\${outT}</div></div>
        <div class="rg-card"><div class="rg-lbl">Duration</div><div class="rg-val">\${dur} min</div></div>
        <div class="rg-card"><div class="rg-lbl">RFID Card</div><div class="rg-val mono" style="font-size:10px">\${rfid}</div></div>
      </div>
      <div class="data-box">
        <div class="dr"><div class="dl">Host</div><div class="dv">\${h}</div></div>
        \${isTeam ? \`<div class="dr"><div class="dl">Visitor Type</div><div class="dv">Team</div></div>
          <div class="dr"><div class="dl">Team Name</div><div class="dv">\${teamName}</div></div>
          <div class="dr"><div class="dl">Team Count</div><div class="dv">\${teamCount}</div></div>\` : ''}
        <div class="dr"><div class="dl">ID Type</div><div class="dv">\${idType}</div></div>
        <div class="dr"><div class="dl">Agreement</div><div class="dv"><span class="badge badge-green">\${iconCheck} Signed</span></div></div>
      </div>
    </div>
  </div>
</body>
</html>\`;
  
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  return pdfBuffer;
}
`;

f = f.replace(/function generateMinimalPDF\([\s\S]*?return Buffer\.from\(pdf, 'binary'\);\n\}/, newPdfLogic);
f = f.replace('const pdfBuffer = generateMinimalPDF(visit);', 'const pdfBuffer = await generatePuppeteerPDF(visit);');

fs.writeFileSync('routes/visits.js', f, 'utf8');
console.log('Fixed');
