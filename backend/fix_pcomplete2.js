const fs = require('fs');
let f = fs.readFileSync('../frontend/vms_fixed.html', 'utf8');

const startIdx = f.indexOf('function pComplete() {');
const endIdx = f.indexOf('ACTION HANDLERS');
let targetStr = f.substring(startIdx, endIdx);
const lastBrace = targetStr.lastIndexOf('}');
targetStr = targetStr.substring(0, lastBrace + 1);

const newCode = `function pComplete() {
      const sess = Store.findSession(S.lastCompletedSessionId || S.sessionId) || {};
      const h = sess.host || (gh(S.v.hostId) ? gh(S.v.hostId).name : '—');
      const dur = sess.duration ?? (S.outTime && S.inTime ? Math.round((S.outTime - S.inTime) / 60000) : 0);
      const inT = sess.inTime ? fmtT(sess.inTime) : (S.inTime ? fmtT(S.inTime) : '—');
      const outT = sess.outTime ? fmtT(sess.outTime) : (S.outTime ? fmtT(S.outTime) : '—');
      const purpose = sess.purpose || (S.v.purpose === 'Other' ? (S.v.purposeCustom || 'Other') : S.v.purpose);
      const name = sess.name || S.v.name || '—';
      const company = sess.company || S.v.company || '—';
      const photo = sess.photo || S.photo;
      const rfid = sess.rfid || S.rfid || '—';
      const idType = sess.idType || S.v.idType || '—';
      const isTeam = sess.visitorType === 'Team' || S.v.visitorType === 'Team';
      const teamName = sess.teamName || S.v.teamName || '—';
      const teamCount = sess.teamCount || S.v.teamCount || 0;
      const downloadId = sess.id || S.sessionId || S.lastCompletedSessionId;
      return \`<div class="card" style="border-color:var(--green-b)">
    <div class="card-hd" style="background:var(--green-t);border-bottom-color:var(--green-b);text-align:center;padding:24px">
      <div class="success-icon">\${ic(I.star, 26, 1.5)}</div>
      <div class="card-title" style="color:var(--green)">Visit Recorded</div>
      <div class="card-sub" style="color:#166534">All data saved securely. RFID card released back to pool.</div>
    </div>
    <div class="card-body">
      <div style="display:flex;align-items:center;gap:11px;margin-bottom:14px;padding:11px;background:var(--bg);border-radius:var(--r-sm)">
        \${photo ? \`<img src="\${photo}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0">\` : \`<div class="avatar" style="width:40px;height:40px;font-size:13px;flex-shrink:0">\${initials(name)}</div>\`}
        <div style="flex:1">
          <div style="font-size:13.5px;font-weight:700">\${name}</div>
          <div style="font-size:11px;color:var(--muted)">\${company} · \${purpose}</div>
        </div>
        <span class="badge badge-green">\${ic(I.check, 9, 2.5)} Done</span>
      </div>
      <div class="rg">
        <div class="rg-card"><div class="rg-lbl">Check-in</div><div class="rg-val mono">\${inT}</div></div>
        <div class="rg-card"><div class="rg-lbl">Check-out</div><div class="rg-val mono">\${outT}</div></div>
        <div class="rg-card"><div class="rg-lbl">Duration</div><div class="rg-val">\${dur} min</div></div>
        <div class="rg-card"><div class="rg-lbl">RFID Card</div><div class="rg-val mono" style="font-size:10px">\${rfid}</div></div>
      </div>
      <div class="data-box">
        <div class="dr"><div class="dl">Host</div><div class="dv">\${h}</div></div>
        \${isTeam ? \`
          <div class="dr"><div class="dl">Visitor Type</div><div class="dv">Team</div></div>
          <div class="dr"><div class="dl">Team Name</div><div class="dv">\${teamName}</div></div>
          <div class="dr"><div class="dl">Team Count</div><div class="dv">\${teamCount}</div></div>\` : ''}
        <div class="dr"><div class="dl">ID Type</div><div class="dv">\${idType}</div></div>
        <div class="dr"><div class="dl">Agreement</div><div class="dv"><span class="badge badge-green">\${ic(I.check, 9)} Signed</span></div></div>
      </div>
    </div>
    <div class="card-ft">
      <button class="btn btn-s" onclick="\${downloadId ? \`downloadReport('\${downloadId}')\` : ''}" \${!downloadId ? 'disabled' : ''}>
        \${ic(I.dl, 13)} Download Report
      </button>
      <button class="btn btn-p" style="flex:1" onclick="doReset()">
        \${ic(I.user, 13)} New Visitor
      </button>
    </div>
  </div>\`;
    }`;

f = f.replace(targetStr, newCode);
fs.writeFileSync('../frontend/vms_fixed.html', f, 'utf8');
console.log('Successfully replaced');
