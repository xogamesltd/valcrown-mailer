'use strict';

const express    = require('express');
const nodemailer = require('nodemailer');
const queue      = require('./queue');
const templates  = require('./templates');
const app        = express();
const PORT       = process.env.PORT || 3001;

app.use(express.json({ limit: '50kb' }));

const MAILER_KEY = process.env.MAILER_KEY || 'valcrown-mailer-secret-2026';

function auth(req, res, next) {
  if (req.headers['x-mailer-key'] !== MAILER_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

let transport = null;

function getTransport() {
  if (transport) return transport;
  const opts = {
    host:   process.env.SMTP_HOST || 'mail.spacemail.com',
    port:   parseInt(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER || 'support@xogamess.com',
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
    pool:           true,
    maxConnections: 3,
    maxMessages:    100,
  };
  transport = nodemailer.createTransport(opts);
  console.log('[Mail] Transport created');
  return transport;
}

async function sendMail({ to, subject, html, text }) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error('Invalid email: ' + to);
  const t    = getTransport();
  const info = await t.sendMail({
    from:    '"ValCrown" <support@xogamess.com>',
    replyTo: 'support@xogamess.com',
    to, subject, html,
    text:    text || html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    headers: {
      'X-Mailer':              'ValCrown Mailer 2.0',
      'X-Entity-Ref-ID':       Math.random().toString(36).slice(2),
      'List-Unsubscribe':      '<mailto:unsubscribe@xogamess.com>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'Precedence':            'bulk',
    },
  });
  console.log('[Mail] Sent to ' + to + ' | ' + subject + ' | ' + info.messageId);
  return { success: true, messageId: info.messageId };
}

function queueMail(id, opts) {
  queue.enqueue({ id, fn: () => sendMail(opts) });
  return { success: true, queued: true, id };
}

app.get('/health', async (req, res) => {
  try {
    await getTransport().verify();
    res.json({ status: 'ok', smtp: 'connected', queue: queue.getStats(), service: 'valcrown-mailer', version: '2.0.0' });
  } catch(e) {
    res.status(503).json({ status: 'degraded', smtp: 'error', error: e.message });
  }
});

app.post('/send/reset', auth, async (req, res) => {
  try {
    const { email, token } = req.body;
    if (!email || !token) return res.status(400).json({ error: 'email and token required' });
    const resetUrl = 'https://valcrown.com/reset-password.html?reset=' + token;
    const tpl      = templates.resetPassword(email, resetUrl);
    res.json(queueMail('reset-' + Date.now(), { to: email, subject: tpl.subject, html: tpl.html, text: tpl.text }));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/send/welcome', auth, async (req, res) => {
  try {
    const { email, fullName, trialDays = 3 } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    const tpl = templates.welcome(email, fullName, trialDays);
    res.json(queueMail('welcome-' + Date.now(), { to: email, subject: tpl.subject, html: tpl.html, text: tpl.text }));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/send/license', auth, async (req, res) => {
  try {
    const { email, fullName, licenseKey, plan } = req.body;
    if (!email || !licenseKey) return res.status(400).json({ error: 'email and licenseKey required' });
    const tpl = templates.licenseKey(email, fullName, licenseKey, plan || 'Pro');
    res.json(queueMail('license-' + Date.now(), { to: email, subject: tpl.subject, html: tpl.html, text: tpl.text }));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/send/trial-expiry', auth, async (req, res) => {
  try {
    const { email, fullName, daysLeft = 1 } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    const tpl = templates.trialExpiry(email, fullName, daysLeft);
    res.json(queueMail('trial-' + Date.now(), { to: email, subject: tpl.subject, html: tpl.html, text: tpl.text }));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/send/ticket', auth, async (req, res) => {
  try {
    const { email, name, ticketId, subject: ticketSubject } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    const tpl = templates.ticketConfirmation(name, ticketId || 'N/A', ticketSubject || 'Support Request');
    res.json(queueMail('ticket-' + Date.now(), { to: email, subject: tpl.subject, html: tpl.html, text: tpl.text }));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/queue', auth, (req, res) => res.json(queue.getStats()));
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log('\n📧 ValCrown Mailer v2.0 on port ' + PORT);
  setTimeout(() => {
    getTransport().verify()
      .then(() => console.log('[Mail] SMTP connected and ready\n'))
      .catch(e  => console.error('[Mail] SMTP error:', e.message, '\n'));
  }, 2000);
});
