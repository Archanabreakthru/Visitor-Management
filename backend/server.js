const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Auto-restore and correct vms_fixed.html if it gets truncated, corrupted, or has broken functions
try {
  const frontendDir = path.join(__dirname, '../frontend');
  const targetPath = path.join(frontendDir, 'vms_fixed.html');
  const backupPath = path.join(frontendDir, 'vms_fixed.html.backup');
  if (fs.existsSync(backupPath)) {
    const backupSize = fs.statSync(backupPath).size;
    let restore = false;
    if (fs.existsSync(targetPath)) {
      const targetSize = fs.statSync(targetPath).size;
      if (targetSize < 100000) { // If it's less than 100KB (truncated)
        restore = true;
      }
    } else {
      restore = true;
    }
    if (restore) {
      console.log(`[Auto-Restore] Restoring vms_fixed.html from backup (${backupSize} bytes)...`);
      fs.copyFileSync(backupPath, targetPath);
      console.log(`[Auto-Restore] Restoration successful!`);
    }
  }

  // Auto-correct any broken onPhoneLive block in vms_fixed.html
  if (fs.existsSync(targetPath)) {
    let content = fs.readFileSync(targetPath, 'utf8');
    const regex = /function onPhoneLive\(\)\s*\{[\s\S]*?phEl\.placeholder = .*?\;\s*\}/;
    if (regex.test(content)) {
      console.log('[Auto-Correction] Fixing broken onPhoneLive function...');
      content = content.replace(regex, `function onPhoneLive() {
      const phone = S.v.phone;
      const cc = S.v.countryCode || 'IN';
      const hint = $('fph_hint');
      if (hint) hint.textContent = \`\${COUNTRY_CODES[cc]?.name} — \${phone.length}/\${COUNTRY_CODES[cc]?.length || 10} digits\`;
      if (phone.length === (COUNTRY_CODES[cc]?.length || 10)) {
        const res = validatePhone(phone, cc);
        const er = $('fph_e');
        if (er) er.textContent = res.ok ? '' : res.error;
        const el = $('fph');
        if (el) el.classList.toggle('err', !res.ok);
        if (res.ok) {
          checkPhoneEmail();
        }
      }
    }

    function renderPhoneHint() {
      const cc = COUNTRY_CODES[S.v.countryCode || 'IN'];
      const hint = $('fph_hint');
      if (hint && cc) hint.textContent = \`Format: \${cc.name} — \${cc.length} digits\`;
      const phEl = $('fph');
      if (phEl) phEl.placeholder = \`\${cc.length} digits\`;
    }`);
      fs.writeFileSync(targetPath, content, 'utf8');
      console.log('[Auto-Correction] onPhoneLive successfully updated!');
    }
  }
} catch (err) {
  console.error('[Auto-Restore/Correction Error]', err);
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get('/api/health', async (req, res) => {
  const db = require('./config/db');
  try {
    await db.query('SELECT 1');
    res.json({ ok: true, status: 'healthy', db: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, status: 'unhealthy', db: 'disconnected' });
  }
});

app.use('/api/hosts', require('./routes/hosts'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/rfid', require('./routes/rfid'));
app.use('/api/visits', require('./routes/visits'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Serve vms_fixed.html directly (with api-bridge injected) for root and index routes
const frontendDir = path.join(__dirname, '../frontend');

app.get(['/', '/index.html'], (req, res) => {
  const html = fs.readFileSync(path.join(frontendDir, 'vms_fixed.html'), 'utf8');
  const lastIndex = html.lastIndexOf('</body>');
  let injected = html;
  if (lastIndex !== -1) {
    injected = html.substring(0, lastIndex) + '<script src="/api-bridge.js"></script>\n</body>' + html.substring(lastIndex + 7);
  } else {
    injected += '<script src="/api-bridge.js"></script>';
  }
  res.setHeader('Content-Type', 'text/html');
  res.send(injected);
});

app.use(express.static(frontendDir));

app.get('*', (req, res) => {
  const html = fs.readFileSync(path.join(frontendDir, 'vms_fixed.html'), 'utf8');
  const injected = html.replace('</body>', '<script src="/api-bridge.js"></script>\n</body>');
  res.setHeader('Content-Type', 'text/html');
  res.send(injected);
});

app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  🚀 Breakthru.ai VMS — Node.js Backend            ║
╠══════════════════════════════════════════════════════╣
║  📡 API Server:   http://localhost:${PORT}/api      ║
║  🖥  Frontend:      http://localhost:${PORT}/        ║
║  🏥 Health Check:  http://localhost:${PORT}/api/health ║
╚══════════════════════════════════════════════════════╝
  `);
});

