'use strict';
/**
 * Run once: node scripts/generate-dkim.js
 * Generates DKIM private key + DNS TXT record to add to Cloudflare
 */
const crypto = require('crypto');
const fs     = require('fs');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength:  2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Extract raw public key for DNS TXT record
const pubKeyDer    = crypto.createPublicKey(publicKey).export({ type: 'spki', format: 'der' });
const pubKeyBase64 = pubKeyDer.toString('base64');

fs.writeFileSync('dkim-private.pem', privateKey);
console.log('\n✅ DKIM private key saved to: dkim-private.pem');
console.log('⚠️  Keep this file SECRET — add it to Coolify env as DKIM_PRIVATE_KEY\n');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Add this DNS TXT record in Cloudflare:');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Type: TXT`);
console.log(`Name: valcrown._domainkey.xogamess.com`);
console.log(`Value: v=DKIM1; k=rsa; p=${pubKeyBase64}`);
console.log('═══════════════════════════════════════════════════════════════');
console.log('\nAlso add these DNS records for full deliverability:');
console.log('─────────────────────────────────────────────────────────────');
console.log('SPF (if not exists):');
console.log('Type: TXT | Name: xogamess.com | Value: v=spf1 include:spacemail.com ~all');
console.log('─────────────────────────────────────────────────────────────');
console.log('DMARC:');
console.log('Type: TXT | Name: _dmarc.xogamess.com');
console.log('Value: v=DMARC1; p=quarantine; rua=mailto:support@xogamess.com; pct=100\n');
