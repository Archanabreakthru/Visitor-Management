const fs = require('fs');
let c = fs.readFileSync('vms_fixed.html', 'utf8');

const startIdx = c.indexOf('async function pAccess() {');
const endIdx = c.indexOf('function selectRFIDSlot(tag)');

if (startIdx > -1 && endIdx > -1) {
    const newPAccess = `async function pAccess() {
      const h = gh(S.v.hostId);
      const mode = S.accessMode || 'rfid';
      
      const available = await Store.getAvailableTags();
      const selected = S.rfid;
      const slotOptions = available.length === 0
        ? \`<option value="">— All RFID cards currently in use</option>\`
        : [\`<option value="">Select a card slot.</option>\`, ...available.map(t => \`<option value="\${t.tag}" \${selected === t.tag ? 'selected' : ''}>\${t.label}</option>\`)].join('');
        
      const toggleHtml = \`
      <div style="display:flex; background:var(--bg); border-radius:var(--r-sm); padding:4px; margin-bottom:14px;">
        <div style="flex:1; text-align:center; padding:6px; font-size:12px; font-weight:600; cursor:pointer; border-radius:4px; \${mode === 'rfid' ? 'background:var(--card); box-shadow:var(--sh-sm); color:var(--blue);' : 'color:var(--muted);'}" onclick="setAccessMode('rfid')">Physical Visitor ID Card</div>
        <div style="flex:1; text-align:center; padding:6px; font-size:12px; font-weight:600; cursor:pointer; border-radius:4px; \${mode === 'qr' ? 'background:var(--card); box-shadow:var(--sh-sm); color:var(--blue);' : 'color:var(--muted);'}" onclick="setAccessMode('qr')">QR Scanner</div>
      </div>
      \`;

      let bodyHtml = '';
      let btnHtml = '';

      if (mode === 'rfid') {
         bodyHtml = \`
      <div style="margin-bottom:14px">
        <span class="rfid-slot-label">ID Card Selection (Visitor 1-10)</span>
        \${available.length === 0
          ? \`<div class="info-box err">\${ic(I.alert, 12)} All 10 RFID cards are currently in use.</div>\`
          : \`<select class="rfid-slot-select" id="rfidSlotSelect" onchange="selectRFIDSlot(this.value)">\${slotOptions}</select>
             <div style="margin-top:5px;font-size:9.5px;color:var(--faint)">\${available.length} of 10 cards available</div>\`}
        \${selected ? \`<div class="rfid-slot-selected"><div class="rfid-slot-num">RFID Tag Assigned</div><div class="rfid-slot-code">\${selected}</div><div class="rfid-slot-sub">Select physical card &amp; Hand to visitor</div></div>\` : ''}
      </div>
         \`;
         btnHtml = \`
      <button class="btn btn-g" style="flex:1" onclick="activateVisit()" \${(!selected || available.length === 0) ? 'disabled' : ''}>
        \${ic(I.check, 13, 2.5)} Activate &amp; Begin Visit
      </button>
         \`;
      } else {
         bodyHtml = \`
      <div class="bp-wrap" style="text-align:center; padding:20px;">
         <div style="margin-bottom:10px; font-weight:600; font-size:14px;">Visitor QR Badge Preview</div>
         <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=\${encodeURIComponent(S.v.name + '-' + (S.dbVisitId || S.sessionId))}" style="width:120px; height:120px; border-radius:8px; border:1px solid var(--border); margin: 0 auto; display:block;" />
         <div style="margin-top:10px; font-size:12px; color:var(--text); font-weight:700;">\${S.v.name} &bull; \${S.v.company || 'Visitor'}</div>
         <div style="font-size:11px; color:var(--muted); margin-top:4px;">Scan at turnstile for entry</div>
      </div>
         \`;
         btnHtml = \`
      <button class="btn btn-g" style="flex:1" onclick="activateVisit()">
        \${ic(I.check, 13, 2.5)} Activate &amp; Begin Visit
      </button>
         \`;
      }

      return \`<div class="card" style="border-color:var(--green-b)">
    <div class="card-hd" style="background:var(--green-t);border-bottom-color:var(--green-b);text-align:center;padding:24px 24px 18px">
      <div class="success-icon">\${ic(I.check, 26, 1.5)}</div>
      <div class="card-title" style="color:var(--green)">Access Approved!</div>
      <div class="card-sub" style="color:#166534">
        <strong>\${h ? h.name : 'Your host'}</strong> approved this visit. Assign access below.
      </div>
    </div>
    <div class="card-body">
      \${toggleHtml}
      \${bodyHtml}
    </div>
    <div class="card-ft" style="display:flex;">
      \${btnHtml}
    </div>
  </div>\`;
    }

    function setAccessMode(mode) {
      if (S.accessMode !== mode) {
        S.accessMode = mode;
        if (mode === 'qr') S.rfid = null; // Reset irrelevant state
        renderPanel();
      }
    }

    `;
    
    // Also remove function printBadge()
    c = c.substring(0, startIdx) + newPAccess + c.substring(endIdx);
    fs.writeFileSync('vms_fixed.html', c);
    console.log('Replaced successfully');
} else {
    console.log('Not found');
}
