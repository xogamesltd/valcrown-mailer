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


app.post('/send/ticket-reply', auth, async (req, res) => {
  try {
    const { email, name, ticketId, subject, reply } = req.body;
    if (!email || !reply) return res.status(400).json({ error: 'email and reply required' });
    const tpl = templates.ticketReply(name || '', ticketId || '', subject || 'Support Request', reply);
    res.json(queueMail('ticket-reply-' + Date.now(), { to: email, subject: tpl.subject, html: tpl.html, text: tpl.text }));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});


app.post('/send/custom', auth, async (req, res) => {
  try {
    const { to, subject, message, from_name } = req.body;
    if (!to || !subject || !message) return res.status(400).json({ error: 'to, subject and message required' });
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#07070f;font-family:'DM Sans',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
  <div style="background:#0e0e1c;border:1px solid #1c1c38;border-radius:14px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#7c6aff,#5549cc);padding:24px 28px">
      <div style="color:#fff;font-weight:800;font-size:18px">ValCrown</div>
      <div style="color:rgba(255,255,255,0.7);font-size:12px">Message from ${from_name || 'ValCrown Team'}</div>
    </div>
    <div style="padding:28px">
      <div style="color:#f0f0ff;font-size:14px;line-height:1.8;white-space:pre-wrap">${message}</div>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #1c1c38;text-align:center">
      <p style="color:#5a5a80;font-size:11px;margin:0">ValCrown by XOGAMESLTD · <a href="https://valcrown.com" style="color:#7c6aff;text-decoration:none">valcrown.com</a></p>
    </div>
  </div>
</div></body></html>`;
    const text = message;
    res.json(queueMail('custom-' + Date.now(), { to, subject, html, text }));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

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
