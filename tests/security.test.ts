import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPrivateOrReservedIP,
  validateSubmissionUrl,
  encryptCredentials,
  decryptCredentials,
  buildCaptureIdempotencyKey,
  buildVoidIdempotencyKey,
} from '../lib/security';

test('SSRF Protection & IP Range Blocklist (FR-15, NFR-S5)', async (t) => {
  await t.test('Identifies loopback and private IPv4 ranges', () => {
    assert.equal(isPrivateOrReservedIP('127.0.0.1'), true);
    assert.equal(isPrivateOrReservedIP('10.0.1.25'), true);
    assert.equal(isPrivateOrReservedIP('172.16.5.10'), true);
    assert.equal(isPrivateOrReservedIP('192.168.1.1'), true);
    assert.equal(isPrivateOrReservedIP('169.254.169.254'), true); // AWS metadata endpoint
    assert.equal(isPrivateOrReservedIP('0.0.0.0'), true);
  });

  await t.test('Identifies IPv6 loopback and link-local', () => {
    assert.equal(isPrivateOrReservedIP('::1'), true);
    assert.equal(isPrivateOrReservedIP('fe80::1'), true);
    assert.equal(isPrivateOrReservedIP('fc00::1'), true);
  });

  await t.test('Allows public Internet IPs', () => {
    assert.equal(isPrivateOrReservedIP('8.8.8.8'), false);
    assert.equal(isPrivateOrReservedIP('1.1.1.1'), false);
    assert.equal(isPrivateOrReservedIP('93.184.216.34'), false);
  });

  await t.test('Blocks non-HTTPS submission URLs', async () => {
    const res = await validateSubmissionUrl('http://example.com/site');
    assert.equal(res.valid, false);
    assert.ok(res.error?.includes('HTTPS'));
  });

  await t.test('Blocks localhost hostnames', async () => {
    const res = await validateSubmissionUrl('https://localhost:3000');
    assert.equal(res.valid, false);
    assert.ok(res.error?.includes('Localhost and internal hostnames are prohibited'));
  });
});

test('Test Credentials AES-256-GCM Encryption (NFR-S3)', async (t) => {
  await t.test('Successfully encrypts and decrypts test credentials', () => {
    const secret = 'user@staging.dev:SuperSecretPassword!#123';
    const encrypted = encryptCredentials(secret);

    assert.notEqual(encrypted, secret);
    assert.ok(encrypted.includes(':')); // iv:tag:cipher format

    const decrypted = decryptCredentials(encrypted);
    assert.equal(decrypted, secret);
  });

  await t.test('Different encryptions produce unique initialization vectors (IVs)', () => {
    const secret = 'identical-secret';
    const enc1 = encryptCredentials(secret);
    const enc2 = encryptCredentials(secret);

    assert.notEqual(enc1, enc2);
    assert.equal(decryptCredentials(enc1), secret);
    assert.equal(decryptCredentials(enc2), secret);
  });
});

test('Idempotency Key Builder (Section 3.4 & Shared Contracts)', async (t) => {
  await t.test('Constructs standardized capture idempotency key', () => {
    const key = buildCaptureIdempotencyKey('job-123', 'run-456');
    assert.equal(key, 'job:job-123:run:run-456:capture');
  });

  await t.test('Constructs standardized void idempotency key', () => {
    const key = buildVoidIdempotencyKey('job-123', 'DEADLINE_PASSED');
    assert.equal(key, 'job:job-123:void:DEADLINE_PASSED');
  });
});
