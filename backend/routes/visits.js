const express = require('express');
const router = express.Router();
const db = require('../config/db');
const crypto = require('crypto');
const telegramService = require('../services/telegramService');
const os = require('os');

const generateToken = () => crypto.randomBytes(40).toString('hex');

// Get local IPv4 address dynamically to route email links from local devices like phones
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1'; // fallback
}

async function sendHostEmail(visit, token) {
  const port = process.env.PORT || 3001;
  const localIp = getLocalIpAddress();
  const host = process.env.BASE_URL || `http://${localIp}:${port}`;
  const approveUrl = `${host}/api/visits/action/${token}?decision=approved`;
  const denyUrl = `${host}/api/visits/action/${token}?decision=denied`;

  if (!process.env.MAIL_USER) {
    console.log(`\n[EMAIL] SMTP not configured — approval link(s) for ${visit.name}`);
    console.log('APPROVE:', approveUrl);
    console.log('DENY   :', denyUrl);
    return false;
  }

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: false,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });

  // Prepare photo attachment if present
  let htmlPhotoTag = '';
  let attachments = [];
  if (visit.photo_b64 && visit.photo_b64.includes(';base64,')) {
    try {
      const parts = visit.photo_b64.split(';base64,');
      const contentType = parts[0].split(':')[1] || 'image/jpeg';
      const base64Data = parts[1];
      attachments.push({
        filename: 'visitor_photo.jpg',
        content: Buffer.from(base64Data, 'base64'),
        cid: 'visitorPhoto' // cid to reference in html
      });
      htmlPhotoTag = `
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="cid:visitorPhoto" alt="Visitor Photo" style="width: 130px; height: 130px; border-radius: 50%; border: 3px solid #BFDBFE; object-fit: cover; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />
        </div>
      `;
    } catch (photoErr) {
      console.error('[Email Photo Embed Error]', photoErr);
    }
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Visitor Approval Required</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #F1F5FB; margin: 0; padding: 20px; color: #0F172A; }
        .card { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.05); border: 1px solid #E2E8F0; }
        .header { background: #0A1628; padding: 32px 24px; text-align: center; color: #FFFFFF; }
        .logo { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: #FFFFFF; text-decoration: none; display: inline-block; }
        .logo span { color: #2563EB; }
        .title { font-size: 18px; margin: 12px 0 0 0; font-weight: 500; color: #E2E8F0; }
        .body { padding: 32px 24px; }
        .grid { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .grid td { padding: 10px 0; border-bottom: 1px solid #F1F5F9; font-size: 14px; }
        .label { color: #64748B; font-weight: 500; width: 35%; }
        .value { color: #0F172A; font-weight: 600; text-align: right; }
        .btn-group { display: flex; gap: 12px; margin-top: 10px; justify-content: center; }
        .btn { display: inline-block; flex: 1; text-align: center; padding: 14px 18px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; transition: transform 0.1s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .btn-approve { background-color: #16A34A; color: #FFFFFF !important; border: 1px solid #15803D; }
        .btn-deny { background-color: #DC2626; color: #FFFFFF !important; border: 1px solid #B91C1C; }
        .footer { padding: 24px; background: #F8FAFC; text-align: center; border-top: 1px solid #E2E8F0; }
        .footer-text { font-size: 11px; color: #94A3B8; margin: 0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="logo">breakthru<span>.ai</span></div>
          <div class="title">Visitor Access Request</div>
        </div>
        <div class="body">
          ${htmlPhotoTag}
          <table class="grid">
            <tr>
              <td class="label">Visitor Name</td>
              <td class="value">${visit.name}</td>
            </tr>
            <tr>
              <td class="label">Mobile Number</td>
              <td class="value">${visit.phone || '—'}</td>
            </tr>
            <tr>
              <td class="label">Purpose of Visit</td>
              <td class="value" style="color: #2563EB;">${visit.purpose}</td>
            </tr>
            <tr>
              <td class="label">Host Name</td>
              <td class="value">${visit.host_name || '—'}</td>
            </tr>
            ${visit.company ? `
            <tr>
              <td class="label">Company</td>
              <td class="value">${visit.company}</td>
            </tr>` : ''}
            ${visit.email ? `
            <tr>
              <td class="label">Email Address</td>
              <td class="value">${visit.email}</td>
            </tr>` : ''}
            ${visit.id_type ? `
            <tr>
              <td class="label">Verified ID</td>
              <td class="value">${visit.id_type} ${visit.id_number ? `(${visit.id_number})` : ''}</td>
            </tr>` : ''}
            <tr>
              <td class="label">Visit ID</td>
              <td class="value" style="font-family: monospace; font-size: 12px; color: #64748B;">${visit.id}</td>
            </tr>
          </table>
          
          <div style="text-align: center; margin-bottom: 12px; font-weight: 500; font-size: 14px; color: #475569;">
            Action Required: Approve or deny this visitor access.
          </div>
          
          <div class="btn-group">
            <a href="${approveUrl}" class="btn btn-approve" style="margin-right: 6px;">✅ Approve Access</a>
            <a href="${denyUrl}" class="btn btn-deny" style="margin-left: 6px;">❌ Deny Access</a>
          </div>
        </div>
        <div class="footer">
          <p class="footer-text">This is a secure system notification from Breakthru.ai Visitor Management.</p>
          <p class="footer-text" style="margin-top: 4px;">Approval link is active for 24 hours.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: visit.host_email,
      subject: `🚪 Visitor Approval Required: ${visit.name}`,
      html: htmlContent,
      attachments: attachments
    });
    console.log(`[EMAIL] Premium notification sent to ${visit.host_email}`);
    return true;
  } catch (err) {
    console.error('[Email Error]', err);
    return false;
  }
}

// POST /api/visits - Create visit
router.post('/', async (req, res) => {
  let {
    name, company, phone, email, purpose, host_id,
    id_type, id_number, photo_b64, had_appointment, appointment_id,
    visitor_type, team_name, team_count, team_members,
    countryCode, country_code
  } = req.body;

  let cc = countryCode || country_code;
  if (cc && phone && !phone.startsWith('+')) {
    phone = `${cc} ${phone}`;
  }

  if (!name || !phone || !purpose || !host_id) {
      return res.status(400).json({ ok: false, error: 'Name, phone, purpose, and host are required' });
    }

    // Duplicate active session check disabled for now (allows multiple active visits)
// const { rows: activeVisits } = await db.query(
//   `SELECT id FROM visits WHERE phone = $1 AND status = 'active'`,
//   [phone]
// );
// if (activeVisits.length > 0) {
//   return res.status(400).json({ ok: false, error: 'Visitor already has an active session' });
// }

  try {
    const { rows } = await db.query(
      `INSERT INTO visits
        (name, company, phone, email, purpose, host_id,
         id_type, id_number, photo_b64, had_appointment, appointment_id,
         visitor_type, team_name, team_count, status)
       VALUES
        ($1,$2,$3,$4,$5,$6,
         $7,$8,$9,$10,$11,
         $12,$13,$14,'registered')
       RETURNING id, session_id`,
      [
        name,
        company || '',
        phone,
        email || '',
        purpose,
        host_id,
        id_type || '',
        id_number || '',
        photo_b64 || '',
        had_appointment || false,
        appointment_id || null,
        visitor_type || 'Individual',
        team_name || '',
        team_count || 2
      ]
    );

    const visit = rows[0];

    if (team_members && Array.isArray(team_members) && team_members.length > 0) {
      for (const member of team_members) {
        const memberName = typeof member === 'string' ? member : member.name;
        const memberIdType = typeof member === 'string' ? '' : (member.idType || member.id_type || '');
        const memberIdNumber = typeof member === 'string' ? '' : (member.idNumber || member.id_number || '');
        if (!memberName) continue;

        await db.query(
          `INSERT INTO team_members (visit_id, name, id_type, id_number)
           VALUES ($1,$2,$3,$4)`,
          [visit.id, memberName, memberIdType, memberIdNumber]
        );
      }
    }

    res.json({ ok: true, data: { id: visit.id, session_id: visit.session_id } });
  } catch (err) {
    console.error('[Create Visit Error]', err);
    res.status(500).json({ ok: false, error: 'Failed to save visit' });
  }
});

// PATCH /api/visits/:id/photo  — save or update the visitor photo independently
// of the visit lifecycle (covers the demo / short-circuit path as well).
router.patch('/:id/photo', async (req, res) => {
  const { id } = req.params;
  const { photo_b64 } = req.body;

  if (!photo_b64 || !photo_b64.startsWith('data:image/')) {
    return res.status(400).json({ ok: false, error: 'Valid base64 photo required' });
  }

  try {
    // Basic validation: ensure visit exists
    const { rows } = await db.query('SELECT id FROM visits WHERE id=$1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Visit not found' });
    }

    // Persist the base64 photo data to the visits table
    await db.query('UPDATE visits SET photo_b64=$1 WHERE id=$2', [photo_b64, id]);
    res.json({ ok: true, message: 'Photo saved' });
  } catch (err) {
    console.error('[Photo Upload Error]', err);
    res.status(500).json({ ok: false, error: 'Failed to save photo' });
  }
});

// PATCH /api/visits/:id/agreement
router.patch('/:id/agreement', async (req, res) => {
  const { id } = req.params;
  const { signed } = req.body;

  if (!signed) return res.status(400).json({ ok: false, error: 'Agreement not signed' });

  try {
    await db.query('UPDATE visits SET agreement_signed = TRUE WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Agreement Error]', err);
    res.status(500).json({ ok: false, error: 'Failed to sign agreement' });
  }
});

// POST /api/visits/:id/notify
router.post('/:id/notify', async (req, res) => {
  const { id } = req.params;
  const token = generateToken();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  try {
    const { rows: visitRows } = await db.query(
      `SELECT v.*, h.name as host_name, h.email as host_email
       FROM visits v
       LEFT JOIN hosts h ON v.host_id = h.id
       WHERE v.id=$1`,
      [id]
    );

    if (visitRows.length === 0) return res.status(404).json({ ok: false, error: 'Visit not found' });

    const visit = visitRows[0];

    await db.query(
      'UPDATE visits SET approval_token=$1, token_expires=$2 WHERE id=$3',
      [token, expires, id]
    );

    // Send email notification
    const emailSent = await sendHostEmail(visit, token);
    
    // Send Telegram notification
    const telegramSent = await telegramService.sendVisitorNotification(visit);

    res.json({ 
      ok: true, 
      data: { 
        email_sent: emailSent,
        telegram_sent: telegramSent,
        host: visit.host_name || 'Unknown' 
      } 
    });
  } catch (err) {
    console.error('[Notify Error]', err);
    res.status(500).json({ ok: false, error: 'Failed to send notification' });
  }
});

// GET /api/visits/:id/status
router.get('/:id/status', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(
      'SELECT approval_status, status, agreement_signed FROM visits WHERE id=$1',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Visit not found' });
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    console.error('[Status Error]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/visits/action/:token?decision=approved|denied
router.get('/action/:token', async (req, res) => {
  const { token } = req.params;
  const { decision } = req.query;

  if (!decision || !['approved', 'denied'].includes(decision)) {
    return res.status(400).send('<h1>Invalid decision</h1>');
  }

  try {
    const { rows } = await db.query(
      `SELECT * FROM visits
       WHERE approval_token=$1
         AND token_expires > NOW()
         AND approval_status='pending'`,
      [token]
    );

    if (rows.length === 0) return res.status(400).send('<h1>Invalid or expired token</h1>');

    const visit = rows[0];

    await db.query(
      'UPDATE visits SET approval_status=$1, approval_token=NULL WHERE id=$2',
      [decision, visit.id]
    );

    res.send(`<h1>Access ${decision === 'approved' ? 'APPROVED' : 'DENIED'}</h1><p>Visitor: ${visit.name}</p>`);
  } catch (err) {
    console.error('[Action Error]', err);
    res.status(500).send('Server error');
  }
});

// POST /api/visits/:id/activate
router.post('/:id/activate', async (req, res) => {
  const { id } = req.params;

  const CANONICAL_TAGS = Array.from({ length: 10 }, (_, i) =>
    `VISITOR-${String(i + 1).padStart(2, '0')}`
  );

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Fetch visitor details
    const { rows: visitRows } = await client.query('SELECT name FROM visits WHERE id=$1', [id]);
    if (visitRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, error: 'Visit not found' });
    }
    const visitorName = visitRows[0].name;

    // 2. Fetch all RFID cards to find the smallest available card
    const { rows: dbRows } = await client.query(
      'SELECT tag, available, status, assigned_to_visit FROM rfid_cards WHERE tag = ANY($1::text[]) FOR UPDATE',
      [CANONICAL_TAGS]
    );

    const dbMap = {};
    dbRows.forEach(r => { dbMap[r.tag] = r; });

    let assignedTag = null;
    for (let i = 1; i <= 10; i++) {
      const tag = `VISITOR-${String(i).padStart(2, '0')}`;
      const dbRow = dbMap[tag];
      // Card is available if:
      // - It does not exist in DB (missing/deleted)
      // - OR it is marked as available in DB (status = 'AVAILABLE' or available = true)
      if (!dbRow || dbRow.status === 'AVAILABLE' || dbRow.available === true) {
        assignedTag = tag;
        break;
      }
    }

    if (!assignedTag) {
      await client.query('ROLLBACK');
      return res.status(400).json({ ok: false, error: 'No RFID cards available currently.' });
    }

    const now = new Date();

    // 3. Insert or Update rfid_cards
    const dbRow = dbMap[assignedTag];
    if (!dbRow) {
      // Re-create missing tag
      await client.query(
        `INSERT INTO rfid_cards (tag, label, available, status, assigned_to_visit, assigned_to_name)
         VALUES ($1, $2, FALSE, 'ACTIVE', $3, $4)`,
        [assignedTag, `Visitor ${parseInt(assignedTag.split('-')[1], 10)}`, id, visitorName]
      );
    } else {
      // Update existing tag
      await client.query(
        `UPDATE rfid_cards
         SET available=FALSE, status='ACTIVE', assigned_to_visit=$1, assigned_to_name=$2
         WHERE tag=$3`,
        [id, visitorName, assignedTag]
      );
    }

    // 4. Update visits record
    await client.query(
      `UPDATE visits
       SET rfid_tag=$1, in_time=$2, status='active'
       WHERE id=$3`,
      [assignedTag, now, id]
    );

    await client.query('COMMIT');
    res.json({ ok: true, data: { in_time: now, rfid_tag: assignedTag } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Activate Error]', err);
    res.status(500).json({ ok: false, error: 'Activation failed' });
  } finally {
    client.release();
  }
});

// POST /api/visits/:id/checkout
router.post('/:id/checkout', async (req, res) => {
  const { id } = req.params;
  const { rfid_confirmed } = req.body;

  if (!rfid_confirmed) return res.status(400).json({ ok: false, error: 'RFID confirmation required' });

  try {
    const { rows } = await db.query('SELECT in_time, rfid_tag, name FROM visits WHERE id=$1', [id]);
    if (rows.length === 0) return res.status(404).json({ ok: false, error: 'Visit not found' });

    const visit = rows[0];
    const outTime = new Date();
    const durationMinutes = Math.round((outTime - new Date(visit.in_time)) / 60000);

    await db.query(
      `UPDATE visits
       SET out_time=$1, duration_minutes=$2, status='completed'
       WHERE id=$3`,
      [outTime, durationMinutes, id]
    );

    if (visit.rfid_tag) {
      await db.query(
        `UPDATE rfid_cards
         SET available=TRUE, status='AVAILABLE', assigned_to_visit=NULL, assigned_to_name=NULL
         WHERE tag=$1`,
        [visit.rfid_tag]
      );
    }

    res.json({ ok: true, data: { out_time: outTime, duration_minutes: durationMinutes, name: visit.name } });
  } catch (err) {
    console.error('[Checkout Error]', err);
    res.status(500).json({ ok: false, error: 'Checkout failed' });
  }
});

// GET /api/visits/search?q=&status=
router.get('/search', async (req, res) => {
  const { q, status = 'active' } = req.query;
  if (!q || q.trim() === '') return res.status(400).json({ ok: false, error: 'Search query required' });

  try {
    const { rows } = await db.query(
      `SELECT
         v.id, v.session_id, v.name, v.company, v.rfid_tag, v.in_time, v.status,
         v.visitor_type, v.team_name, v.team_count,
         h.name as host
       FROM visits v
       LEFT JOIN hosts h ON v.host_id = h.id
       WHERE v.status=$1
         AND (v.name ILIKE $2 OR v.rfid_tag ILIKE $2)
       ORDER BY v.in_time DESC
       LIMIT 10`,
      [status, `%${q.trim()}%`]
    );

    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[Search Error]', err);
    res.status(500).json({ ok: false, error: 'Search failed' });
  }
});

// GET /api/visitor/by-phone?phone=XXXXXXXXXX
router.get('/by-phone', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || !phone.trim()) {
      return res.json({ ok: true, data: { visitor: null } });
    }

    const digitsOnly = String(phone).replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      return res.json({ ok: true, data: { visitor: null } });
    }

    const last10 = digitsOnly.slice(-10);

    const { rows: matches } = await db.query(
      `WITH n AS (SELECT REPLACE(REPLACE(REPLACE($1, '+', ''), '-', ''), ' ', '') AS p)
       SELECT v.*, h.name AS host_name
         FROM visits v
         JOIN n ON true
         LEFT JOIN hosts h ON v.host_id = h.id
        WHERE v.status IN ('registered', 'active', 'completed')
          AND SUBSTRING(REPLACE(REPLACE(REPLACE(v.phone, '+', ''), '-', ''), ' ', ''),
                        GREATEST(LENGTH(REPLACE(REPLACE(REPLACE(v.phone, '+', ''), '-', ''), ' ', '')) - 9, 1))
            = n.p
        ORDER BY v.created_at DESC
        LIMIT 1`,
      [last10]
    );

    const visitor = matches.length > 0 ? matches[0] : null;
    res.json({ ok: true, data: { visitor } });
  } catch (err) {
    console.error('[by-phone Error]', err.message || err);
    res.status(500).json({ ok: false, error: 'Lookup failed' });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: visitRows } = await db.query(
      `SELECT v.*, h.name as host_name
       FROM visits v
       LEFT JOIN hosts h ON v.host_id = h.id
       WHERE v.id=$1`,
      [id]
    );

    if (visitRows.length === 0) return res.status(404).json({ ok: false, error: 'Visit not found' });

    const { rows: teamRows } = await db.query(
      'SELECT name, id_type, id_number FROM team_members WHERE visit_id=$1',
      [id]
    );

    res.json({ ok: true, data: { ...visitRows[0], team_members: teamRows } });
  } catch (err) {
    console.error('[Visit Report Error]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/visits/telegram/webhook - Handle Telegram callback queries
router.post('/telegram/webhook', async (req, res) => {
  try {
    const { callback_query } = req.body;
    
    if (!callback_query) {
      return res.status(400).json({ ok: false, error: 'No callback query provided' });
    }
    
    const callbackData = telegramService.handleCallbackQuery(callback_query);
    
    if (!callbackData) {
      return res.status(400).json({ ok: false, error: 'Invalid callback data' });
    }
    
    const { action, visitId, messageId, chatId } = callbackData;
    
    // Validate visit exists and is pending
    const { rows: visitRows } = await db.query(
      'SELECT name, approval_status FROM visits WHERE id=$1',
      [visitId]
    );
    
    if (visitRows.length === 0) {
      await telegramService.bot.answerCallbackQuery(callback_query.id, {
        text: 'Visitor not found or already processed',
        show_alert: true
      });
      return res.json({ ok: false, error: 'Visitor not found' });
    }
    
    const visit = visitRows[0];
    
    if (visit.approval_status !== 'pending') {
      await telegramService.bot.answerCallbackQuery(callback_query.id, {
        text: 'Visitor request already processed',
        show_alert: true
      });
      return res.json({ ok: false, error: 'Visitor request already processed' });
    }
    
    // Update visit status based on action
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    await db.query(
      'UPDATE visits SET approval_status=$1 WHERE id=$2',
      [newStatus, visitId]
    );
    
    // Send confirmation to Telegram
    await telegramService.sendActionConfirmation(
      chatId,
      messageId,
      action,
      visit.name
    );
    
    // Answer callback query to remove loading state
    await telegramService.bot.answerCallbackQuery(callback_query.id, {
      text: `Visitor ${action === 'approve' ? 'approved' : 'rejected'}!`
    });
    
    res.json({ ok: true, data: { action, visitId } });
  } catch (err) {
    console.error('[Telegram Webhook Error]', err);
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// GET /api/visits/:id/pdf - Generate and download PDF report
router.get('/:id/pdf', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: visitRows } = await db.query(
      `SELECT v.*, h.name as host_name
       FROM visits v
       LEFT JOIN hosts h ON v.host_id = h.id
       WHERE v.id::text=$1 OR v.session_id=$1`,
      [id]
    );

    if (visitRows.length === 0) return res.status(404).json({ ok: false, error: 'Visit not found' });
    const visit = visitRows[0];

    // Sanitize filename
    let sanitizedName = (visit.name || '').trim().replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
    if (!sanitizedName || sanitizedName === '_') sanitizedName = 'report';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedName}.pdf"`);

    const pdfBuffer = generateMinimalPDF(visit);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[PDF Download Error]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

function generateMinimalPDF(visit) {
  let pdf = "%PDF-1.4\n";
  const objects = [];
  
  function addObject(content) {
    objects.push(content);
    return objects.length;
  }
  
  addObject("<< /Type /Catalog /Pages 2 0 R >>");
  addObject("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  
  const lines = [
    `breakthru.ai Visitor Report`,
    `--------------------------------`,
    `Visitor Name: ${visit.name}`,
    `Company: ${visit.company || '—'}`,
    `Purpose: ${visit.purpose || '—'}`,
    `Host: ${visit.host_name || '—'}`,
    `Check-in: ${visit.in_time ? new Date(visit.in_time).toLocaleString('en-IN') : '—'}`,
    `Check-out: ${visit.out_time ? new Date(visit.out_time).toLocaleString('en-IN') : '—'}`,
    `Status: ${visit.status || '—'}`
  ];
  
  let streamContent = "BT\n/F1 18 Tf\n50 750 Td\n";
  for (const line of lines) {
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    if (line.includes('Visitor Report')) {
      streamContent += `(${escaped}) Tj\n/F1 12 Tf\n0 -30 Td\n`;
    } else {
      streamContent += `(${escaped}) Tj\n0 -20 Td\n`;
    }
  }
  streamContent += "ET";
  
  addObject(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`);
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  addObject(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`);
  
  let body = "";
  const offsets = [];
  let currentOffset = pdf.length;
  
  for (let i = 0; i < objects.length; i++) {
    offsets.push(currentOffset);
    const objStr = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    body += objStr;
    currentOffset += objStr.length;
  }
  
  pdf += body;
  const xrefOffset = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 0; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  
  pdf += "trailer\n";
  pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefOffset}\n`;
  pdf += "%%EOF\n";
  
  return Buffer.from(pdf, 'binary');
}

module.exports = router;
