const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

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
const fs = require('fs');
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

