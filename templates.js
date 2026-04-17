'use strict';
/**
 * Email HTML templates
 * - Plain-text fallback for every email
 * - Preheader text (shows in inbox preview)
 * - Unsubscribe header (required for CAN-SPAM / GDPR)
 * - Mobile responsive
 */

function base({ preheader = '', content = '', unsubToken = '' }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<title>ValCrown</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{mso-table-lspace:0;mso-table-rspace:0}
  img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}
  body{margin:0!important;padding:0!important;background-color:#07070f;width:100%!important}
  .wrapper{background-color:#07070f;padding:20px 0 40px}
  .container{max-width:560px;margin:0 auto;padding:0 20px}
  .logo-wrap{text-align:center;padding:28px 0 20px}
  .logo-v{display:inline-block;width:44px;height:44px;line-height:44px;background:linear-gradient(135deg,#7c6aff,#a89fff);border-radius:12px;font-size:20px;font-weight:900;color:#ffffff;text-align:center;text-decoration:none;font-family:-apple-system,sans-serif;vertical-align:middle}
  .logo-name{display:inline-block;font-size:19px;font-weight:800;color:#f0f0ff;letter-spacing:-.5px;vertical-align:middle;margin-left:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif}
  .card{background-color:#0e0e1c;border:1px solid rgba(255,255,255,.09);border-radius:18px;padding:36px 32px}
  h1{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:22px;font-weight:800;color:#f0f0ff;margin:0 0 10px;letter-spacing:-.5px;line-height:1.3}
  p{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#9090c0;line-height:1.75;margin:0 0 14px}
  .btn{display:block;width:220px;margin:22px auto;padding:14px 0;background:linear-gradient(135deg,#7c6aff,#a89fff);color:#ffffff!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;text-align:center;text-decoration:none;border-radius:12px;mso-padding-alt:0}
  .code-box{display:block;font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:900;color:#7c6aff;background-color:rgba(124,106,255,.1);border:1px solid rgba(124,106,255,.2);border-radius:10px;text-align:center;padding:14px 20px;letter-spacing:4px;margin:16px 0}
  .alert-box{border-radius:12px;padding:14px 18px;margin:16px 0}
  .alert-green{background-color:rgba(0,232,122,.07);border:1px solid rgba(0,232,122,.2)}
  .alert-yellow{background-color:rgba(255,184,0,.07);border:1px solid rgba(255,184,0,.2)}
  .divider{height:1px;background-color:rgba(255,255,255,.07);margin:22px 0}
  .note{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#505080;line-height:1.75}
  .note a{color:#7c6aff;text-decoration:none}
  .footer-wrap{text-align:center;padding-top:18px}
  .footer-text{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#404070;line-height:1.85}
  .footer-text a{color:#7c6aff;text-decoration:none}
  @media only screen and (max-width:480px){
    .card{padding:24px 18px!important;border-radius:14px!important}
    .btn{width:180px!important}
  }
</style>
</head>
<body>
<!-- Preheader (hidden, shows in inbox preview) -->
<div style="display:none;font-size:1px;color:#07070f;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>
<div class="wrapper">
  <div class="container">
    <!-- Logo -->
    <div class="logo-wrap">
      <a href="https://valcrown.com" style="text-decoration:none">
        <span class="logo-v">V</span>
        <span class="logo-name">ValCrown</span>
      </a>
    </div>
    <!-- Card -->
    <div class="card">${content}</div>
    <!-- Footer -->
    <div class="footer-wrap">
      <p class="footer-text">
        © 2026 ValCrown by XOGAMESLTD<br>
        <a href="https://valcrown.com">valcrown.com</a> ·
        <a href="https://valcrown.com/terms.html">Terms</a> ·
        <a href="https://valcrown.com/privacy.html">Privacy</a> ·
        <a href="mailto:support@xogamess.com">Support</a>
        ${unsubToken ? `<br><a href="https://valcrown.com/unsubscribe.html?token=${unsubToken}" style="color:#404070">Unsubscribe</a>` : ''}
      </p>
    </div>
  </div>
</div>
</body></html>`;
}

// ── TEMPLATES ─────────────────────────────────────────────────────────────────

function resetPassword(email, resetUrl) {
  return {
    subject:   'Reset your ValCrown password',
    preheader: 'Click here to set a new password — expires in 1 hour',
    html: base({
      preheader: 'Click here to set a new password — expires in 1 hour',
      content: `
        <h1>Reset Your Password</h1>
        <p>Hi there,</p>
        <p>We received a request to reset the password for your account <strong style="color:#f0f0ff">${email}</strong>.</p>
        <p>Click the button below. This link <strong style="color:#f0f0ff">expires in 1 hour</strong>.</p>
        <a href="${resetUrl}" class="btn">Reset Password →</a>
        <div class="divider"></div>
        <p class="note">Button not working? Copy this link:<br>
          <a href="${resetUrl}">${resetUrl}</a></p>
        <p class="note" style="margin-top:10px">Didn't request this? Ignore this email — your password won't change.</p>
      `
    }),
    text: `Reset your ValCrown password\n\nClick here: ${resetUrl}\n\nExpires in 1 hour. If you didn't request this, ignore this email.`
  };
}

function welcome(email, fullName, trialDays) {
  return {
    subject:   `Welcome to ValCrown — your ${trialDays}-day trial is live 🎮`,
    preheader: `Your ${trialDays}-day free trial just started — no card needed`,
    html: base({
      preheader: `Your ${trialDays}-day free trial just started — no card needed`,
      content: `
        <h1>Welcome to ValCrown! 🎮</h1>
        <p>Hi ${fullName || 'there'},</p>
        <p>Your account is ready. Your <strong style="color:#00e87a">${trialDays}-day free trial</strong> is now active — no credit card needed.</p>
        <div class="alert-box alert-green">
          <p style="color:#00e87a;font-weight:700;margin:0 0 5px">✓ Trial active — ${trialDays} days remaining</p>
          <p style="margin:0;font-size:13px">Download ValCrown and start boosting your games right now.</p>
        </div>
        <a href="https://valcrown.com/download.html" class="btn">Download ValCrown →</a>
        <div class="divider"></div>
        <p class="note">Need help? <a href="https://valcrown.com/contact.html">Contact support</a> or reply to this email.</p>
      `
    }),
    text: `Welcome to ValCrown, ${fullName || 'there'}!\n\nYour ${trialDays}-day free trial is active.\n\nDownload: https://valcrown.com/download.html\n\nQuestions? support@xogamess.com`
  };
}

function licenseKey(email, fullName, key, plan) {
  return {
    subject:   `Your ValCrown ${plan} license key`,
    preheader: `Your license key is inside — keep this email safe`,
    html: base({
      preheader: 'Your license key is inside — keep this email safe',
      content: `
        <h1>Your License Key 🎉</h1>
        <p>Hi ${fullName || 'there'},</p>
        <p>Thank you for purchasing ValCrown <strong style="color:#f0f0ff">${plan}</strong>. Here is your license key:</p>
        <div class="code-box">${key}</div>
        <p style="font-size:13px;color:#9090c0"><strong style="color:#f0f0ff">How to activate:</strong> Download ValCrown → Sign in → Enter this key when prompted.</p>
        <a href="https://valcrown.com/download.html" class="btn">Download Now →</a>
        <div class="divider"></div>
        <p class="note">Keep this email as proof of purchase. Lost your key? Email <a href="mailto:support@xogamess.com">support@xogamess.com</a></p>
      `
    }),
    text: `Your ValCrown ${plan} License Key\n\n${key}\n\nDownload: https://valcrown.com/download.html\n\nKeep this email as proof of purchase.`
  };
}

function trialExpiry(email, fullName, daysLeft) {
  const expired = daysLeft === 0;
  return {
    subject:   expired ? 'Your ValCrown trial has ended' : `Your ValCrown trial ends in ${daysLeft} day${daysLeft===1?'':'s'}`,
    preheader: expired ? 'Upgrade now to keep all your boosts and AI features' : `${daysLeft} day${daysLeft===1?'':'s'} left — upgrade to keep ValCrown`,
    html: base({
      preheader: expired ? 'Upgrade now to keep all your boosts and AI features' : `${daysLeft} day${daysLeft===1?'':'s'} left`,
      content: `
        <h1>${expired ? 'Your trial has ended' : `Trial ends in ${daysLeft} day${daysLeft===1?'':'s'}`}</h1>
        <p>Hi ${fullName || 'there'},</p>
        <p>${expired
          ? 'Your ValCrown free trial has ended. Upgrade to keep your game boosts, AI advisor, and network optimizer.'
          : `Your ValCrown free trial ends in <strong style="color:#ffb800">${daysLeft} day${daysLeft===1?'':'s'}</strong>. Don't lose your boosts — upgrade now to keep everything.`
        }</p>
        <a href="https://valcrown.com/pricing.html" class="btn">Upgrade Now →</a>
        <div class="divider"></div>
        <p class="note">Plans from $4.19/month. Cancel anytime. Questions? <a href="mailto:support@xogamess.com">support@xogamess.com</a></p>
      `
    }),
    text: `${expired ? 'Your ValCrown trial has ended.' : `Your ValCrown trial ends in ${daysLeft} day${daysLeft===1?'':'s'}.`}\n\nUpgrade: https://valcrown.com/pricing.html`
  };
}

function ticketConfirmation(name, ticketId, ticketSubject) {
  return {
    subject:   `[#${ticketId}] Support ticket received — ValCrown`,
    preheader: `We got your message — reply within 24 hours`,
    html: base({
      preheader: 'We got your message — reply within 24 hours',
      content: `
        <h1>We got your message ✓</h1>
        <p>Hi ${name || 'there'},</p>
        <p>Your support ticket has been received. We reply within <strong style="color:#f0f0ff">24 hours</strong>.</p>
        <div class="alert-box" style="background:rgba(124,106,255,.07);border:1px solid rgba(124,106,255,.15)">
          <p style="margin:0 0 5px;font-size:11px;color:#505080;text-transform:uppercase;letter-spacing:.8px">Ticket Details</p>
          <p style="margin:0 0 4px;color:#f0f0ff;font-size:14px"><strong>ID:</strong> #${ticketId}</p>
          <p style="margin:0;color:#9090c0;font-size:14px"><strong>Subject:</strong> ${ticketSubject}</p>
        </div>
        <p class="note">Reply directly to this email to add more information to your ticket.</p>
      `
    }),
    text: `Support ticket received #${ticketId}\n\nSubject: ${ticketSubject}\n\nWe'll reply within 24 hours. Reply to this email to add more info.`
  };
}

module.exports = { resetPassword, welcome, licenseKey, trialExpiry, ticketConfirmation };
