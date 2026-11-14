import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeText,
  validateUsername,
  validatePassword,
  validateEmail,
  generateSessionToken,
  hashPassword,
  verifyPassword,
  encryptPayload,
  decryptPayload
} from './security';

test('sanitizeText strips HTML tags, escapes dangerous quotes, and enforces length limit', () => {
  const xss = '<script>alert("xss")</script>Hello <b>World</b>\u0007';
  const cleaned = sanitizeText(xss, 50);
  assert.equal(cleaned.includes('<script>'), false);
  assert.equal(cleaned.includes('<b>'), false);
  assert.equal(cleaned, 'alert(&quot;xss&quot;)Hello World');

  const truncated = sanitizeText('a'.repeat(300), 25);
  assert.equal(truncated.length, 25);
});

test('validateUsername, validatePassword, and validateEmail enforce strict rules', () => {
  assert.equal(validateUsername('ab').valid, false);
  assert.equal(validateUsername('bad user!').valid, false);
  assert.equal(validateUsername('Neon_Runner-99').valid, true);

  assert.equal(validatePassword('1234567').valid, false);
  assert.equal(validatePassword('StrongPass!2026').valid, true);

  assert.equal(validateEmail('not-an-email'), false);
  assert.equal(validateEmail('operative@cybercrypt.io'), true);
});

test('salted scrypt hashPassword and timing-safe verifyPassword work correctly', () => {
  const hash1 = hashPassword('CyberSecret99!');
  const hash2 = hashPassword('CyberSecret99!');
  assert.notEqual(hash1, hash2, 'Different random salts should produce distinct hashes');
  assert.equal(verifyPassword('CyberSecret99!', hash1), true);
  assert.equal(verifyPassword('WrongPassword', hash1), false);
});

test('AES-256-GCM encryptPayload and decryptPayload round-trip and reject tampering', () => {
  const secret = 'test-aes-256-key-material';
  const payload = JSON.stringify({ hp: 95, floor: 5, shards: 120 });

  const encrypted = encryptPayload(payload, secret);
  assert.notEqual(encrypted, payload);
  assert.equal(decryptPayload(encrypted, secret), payload);

  // Tamper with auth tag or ciphertext
  const parts = encrypted.split(':');
  parts[2] = parts[2].slice(0, -2) + (parts[2].endsWith('00') ? 'ff' : '00');
  assert.throws(() => decryptPayload(parts.join(':'), secret));
});

test('generateSessionToken creates unique CSPRNG tokens with prefix', () => {
  const t1 = generateSessionToken('tok');
  const t2 = generateSessionToken('tok');
  assert.ok(t1.startsWith('tok_'));
  assert.notEqual(t1, t2);
  assert.ok(t1.length > 40);
});
