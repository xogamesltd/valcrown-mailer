'use strict';

const express   = require('express');
const nodemailer = require('nodemailer');
const queue     = require('./queue');
const templates = require('./templates');
const app       = express();
const PORT      = process.env.PORT || 3001;

app.use(express.json({ limit: '50kb' }));

// ── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
const MAILER_KEY = process.env.MAILER_KEY || 'valcrown-mailer-secret-2026';

function auth(req, res, next) {
  if (req.headers['x-mailer-key'] !== MAILER_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── RATE LIMIT (per IP, simple in-memory) ─────────────────────────────────────
const rlMap = new Map();
function rateLimit(max = 60, windowMs = 60000) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const rl  = rlMap.get(key) || { count: 0, reset: now + windowMs };
    if (now > rl.reset) { rl.count = 0; rl.reset = now + windowMs; }
    rl.count++;
    rlMap.set(key, rl);
    if (rl.count > max) return res.status(429).json({ error: 'Too many requests' });
    next();
  };
}
app.use(rateLimit());

// ── SMTP TRANSPORT ────────────────────────────────────────────────────────────
let transport = null;

function getTransport() {
  if (transport) return transport;

  const opts = {
    host:   process.env.SMTP_HOST || 'mail.spacemail.com',
    port:   parseInt(process.env.SMTP_PORT) || 465,
    secure: true, // SSL
    auth: {
      user: process.env.SMTP_USER || 'support@xogamess.com',
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: true, // enforce valid TLS cert
      minVersion: 'TLSv1.2',
    },
    // Connection pool — reuse connections
    pool:           true,
    maxConnections: 3,
    maxMessages:    100,
    rateDelta:      1000, // 1 message per second max
    rateLimit:      1,
  };

  // DKIM signing (if private key provided)
  if (process.env.DKIM_PRIVATE_KEY) {
    opts.dkim = {
      domainName:   process.env.DKIM_DOMAIN    || 'xogamess.com',
      keySelector:  process.env.DKIM_SELECTOR  || 'valcrown',
      privateKey:   process.env.DKIM_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    console.log('[Mail] ✅ DKIM signing enabled');
  } else {
    console.log('[Mail] ⚠️  DKIM not configured — emails may land in spam');
  }

  transport = nodemailer.createTransport(opts);
  return transport;
}

// ── SEND FUNCTION ─────────────────────────────────────────────────────────────
async function sendMail({ to, subject, html, text, replyTo, headers = {} }) {
  const t = getTransport();

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error(`Invalid email: ${to}`);

  const info = await t.sendMail({
    from:    `"ValCrown" <support@xogamess.com>`,
    replyTo: replyTo || 'support@xogamess.com',
    to,
    subject,
    html,
    text,
    // Headers that improve deliverability
    headers: {
      'X-Mailer':                  'ValCrown Mailer 2.0',
      'X-Entity-Ref-ID':           Math.random().toString(36).slice(2),
      'List-Unsubscribe':          `<mailto:unsubscribe@xogamess.com>`,
      'List-Unsubscribe-Post':     'List-Unsubscribe=One-Click',
      'Precedence':                'bulk',
      'Feedback-ID':               `valcrown:${to.split('@')[1]}:nodemailer`,
      ...headers,
    },
  });

  console.log(`[Mail] ✅ Sent → ${to} | ${subject} | MsgID: ${info.messageId}`);
  return { success: true, messageId: info.messageId };
}

// ── QUEUE SEND (non-blocking with retry) ──────────────────────────────────────
function queueMail(id, mailOpts) {
  return new Promise((resolve) => {
    queue.enqueue({
      id,
      fn: async () => {
        const result = await sendMail(mailOpts);
        resolve(result);
      }
    });
    // Resolve immediately with queued status
    resolve({ success: true, queued: true, id });
  });
}

// ── HEALTH ────────────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await getTransport().verify();
    res.json({
      status:  'ok',
      smtp:    'connected',
      dkim:    !!process.env.DKIM_PRIVATE_KEY,
      queue:   queue.getStats(),
      service: 'valcrown-mailer',
      version: '2.0.0',
    });
  } catch(e) {
    res.status(503).json({ status: 'degraded', smtp: 'error', error: e.message });
  }
});

// ── PASSWORD RESET ────────────────────────────────────────────────────────────
app.post('/send/reset', auth, async (req, res) => {
  try {
    const { email, token } = req.body;
    if (!email || !token) return res.status(400).json({ error: 'email and token required' });

    const resetUrl = `https://valcrown.com/reset-password.html?reset=${token}`;
    const tpl      = templates.resetPassword(email, resetUrl);

    const result = await queueMail(`reset-${Date.now()}`, {
      to:      email,
      subject: tpl.subject,
      html:    tpl.html,
      text:    tpl.text,
    });
    res.json(result);
  } catch(e) {
    console.error('[Mail] Reset error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── WELCOME ───────────────────────────────────────────────────────────────────
app.post('/send/welcome', auth, async (req, res) => {
  try {
    const { email, fullName, trialDays = 3 } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    const tpl    = templates.welcome(email, fullName, trialDays);
    const result = await queueMail(`welcome-${Date.now()}`, {
      to: email, subject: tpl.subject, html: tpl.html, text: tpl.text,
    });
    res.json(result);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── LICENSE KEY ───────────────────────────────────────────────────────────────
app.post('/send/license', auth, async (req, res) => {
  try {
    const { email, fullName, licenseKey, plan } = req.body;
    if (!email || !licenseKey) return res.status(400).json({ error: 'email and licenseKey required' });

    const tpl    = templates.licenseKey(email, fullName, licenseKey, plan || 'Pro');
    const result = await queueMail(`license-${Date.now()}`, {
      to: email, subject: tpl.subject, html: tpl.html, text: tpl.text,
    });
    res.json(result);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── TRIAL EXPIRY ──────────────────────────────────────────────────────────────
app.post('/send/trial-expiry', auth, async (req, res) => {
  try {
    const { email, fullName, daysLeft = 1 } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    const tpl    = templates.trialExpiry(email, fullName, daysLeft);
    const result = await queueMail(`trial-${Date.now()}`, {
      to: email, subject: tpl.subject, html: tpl.html, text: tpl.text,
    });
    res.json(result);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── TICKET CONFIRMATION ───────────────────────────────────────────────────────
app.post('/send/ticket', auth, async (req, res) => {
  try {
    const { email, name, ticketId, subject: ticketSubject } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    const tpl    = templates.ticketConfirmation(name, ticketId || 'N/A', ticketSubject || 'Support Request');
    const result = await queueMail(`ticket-${Date.now()}`, {
      to: email, subject: tpl.subject, html: tpl.html, text: tpl.text,
      replyTo: 'support@xogamess.com',
    });
    res.json(result);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── QUEUE STATS ───────────────────────────────────────────────────────────────
app.get('/queue', auth, (req, res) => res.json(queue.getStats()));

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n📧 ValCrown Mailer v2.0 on port ${PORT}`);
  console.log(`🔐 SMTP: ${process.env.SMTP_HOST || 'mail.spacemail.com'}:${process.env.SMTP_PORT || 465}`);
  console.log(`🔑 Auth key configured: ${MAILER_KEY.slice(0,8)}...`);

  // Verify SMTP on startup
  setTimeout(() => {
    getTransport().verify()
      .then(()  => console.log('[Mail] ✅ SMTP connected and ready\n'))
      .catch(e  => console.error('[Mail] ❌ SMTP error:', e.message, '\n'));
  }, 2000);
});
