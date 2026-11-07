import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDeterministicScore, validateChecklistRules } from '../lib/state-machine';

test('Deterministic Scoring Engine (BR-1 to BR-5)', async (t) => {
  await t.test('Score 100 with all items passing yields PAID tier and 100% payout', () => {
    const items = [
      { id: '1', weight: 20, result: 'pass' as const },
      { id: '2', weight: 30, result: 'pass' as const },
      { id: '3', weight: 50, result: 'pass' as const },
    ];
    const res = calculateDeterministicScore(items);
    assert.equal(res.score, 100);
    assert.equal(res.tier, 'PAID');
    assert.equal(res.payoutPercent, 100);
  });

  await t.test('Boundary Test: Score 90 yields PAID tier and 100% payout', () => {
    const items = [
      { id: '1', weight: 90, result: 'pass' as const },
      { id: '2', weight: 10, result: 'fail' as const, critical: false },
    ];
    const res = calculateDeterministicScore(items);
    assert.equal(res.score, 90);
    assert.equal(res.tier, 'PAID');
    assert.equal(res.payoutPercent, 100);
  });

  await t.test('Boundary Test: Score 89 yields PARTIALLY_PAID tier and 70% payout (BR-2)', () => {
    const items = [
      { id: '1', weight: 89, result: 'pass' as const },
      { id: '2', weight: 11, result: 'fail' as const, critical: false },
    ];
    const res = calculateDeterministicScore(items);
    assert.equal(res.score, 89);
    assert.equal(res.tier, 'PARTIALLY_PAID');
    assert.equal(res.payoutPercent, 70);
  });

  await t.test('Boundary Test: Score 60 yields PARTIALLY_PAID tier and 70% payout (BR-2)', () => {
    const items = [
      { id: '1', weight: 60, result: 'pass' as const },
      { id: '2', weight: 40, result: 'fail' as const, critical: false },
    ];
    const res = calculateDeterministicScore(items);
    assert.equal(res.score, 60);
    assert.equal(res.tier, 'PARTIALLY_PAID');
    assert.equal(res.payoutPercent, 70);
  });

  await t.test('Boundary Test: Score 59 yields HELD tier and 0% payout (BR-3)', () => {
    const items = [
      { id: '1', weight: 59, result: 'pass' as const },
      { id: '2', weight: 41, result: 'fail' as const, critical: false },
    ];
    const res = calculateDeterministicScore(items);
    assert.equal(res.score, 59);
    assert.equal(res.tier, 'HELD');
    assert.equal(res.payoutPercent, 0);
  });

  await t.test('Critical-fail override: failing a critical item forces score 0 and HELD tier (BR-5)', () => {
    const items = [
      { id: '1', weight: 80, result: 'pass' as const },
      { id: '2', weight: 20, result: 'fail' as const, critical: true }, // Critical item fails!
    ];
    const res = calculateDeterministicScore(items);
    assert.equal(res.score, 0);
    assert.equal(res.tier, 'HELD');
    assert.equal(res.payoutPercent, 0);
    assert.equal(res.hasCriticalFail, true);
  });

  await t.test('Inconclusive check: > 30% inconclusive flags NEEDS_REVIEW and 0% payout (FR-23)', () => {
    const items = [
      { id: '1', weight: 60, result: 'pass' as const },
      { id: '2', weight: 20, result: 'inconclusive' as const },
      { id: '3', weight: 20, result: 'inconclusive' as const },
    ];
    // 2 out of 3 = 66% inconclusive
    const res = calculateDeterministicScore(items);
    assert.equal(res.tier, 'NEEDS_REVIEW');
    assert.equal(res.payoutPercent, 0);
  });
});

test('Checklist Validation Rules (FR-6, FR-7)', async (t) => {
  await t.test('Valid checklist with weights summing to 100 passes', () => {
    const items = [
      { description: 'Console Health', testType: 'console_errors', weight: 20 },
      { description: 'Mobile Viewport', testType: 'responsive', weight: 30 },
      { description: 'Auth Flow', testType: 'functional', weight: 50 },
    ];
    const val = validateChecklistRules(items);
    assert.equal(val.valid, true);
    assert.equal(val.errors.length, 0);
  });

  await t.test('Fails when total weight does not sum to 100', () => {
    const items = [
      { description: 'Console Health', testType: 'console_errors', weight: 20 },
      { description: 'Mobile Viewport', testType: 'responsive', weight: 30 },
      { description: 'Auth Flow', testType: 'functional', weight: 40 }, // sum = 90
    ];
    const val = validateChecklistRules(items);
    assert.equal(val.valid, false);
    assert.ok(val.errors.some((e) => e.includes('must sum to exactly 100')));
  });

  await t.test('Fails when console health is missing or has weight < 10', () => {
    const items = [
      { description: 'Console Health', testType: 'console_errors', weight: 5 }, // < 10!
      { description: 'Mobile Viewport', testType: 'responsive', weight: 45 },
      { description: 'Auth Flow', testType: 'functional', weight: 50 },
    ];
    const val = validateChecklistRules(items);
    assert.equal(val.valid, false);
    assert.ok(val.errors.some((e) => e.includes('Console and network health check must be present')));
  });

  await t.test('Fails when item count is less than 3 or more than 12', () => {
    const items = [
      { description: 'Console Health', testType: 'console_errors', weight: 50 },
      { description: 'Mobile Viewport', testType: 'responsive', weight: 50 },
    ];
    const val = validateChecklistRules(items);
    assert.equal(val.valid, false);
    assert.ok(val.errors.some((e) => e.includes('between 3 and 12 items')));
  });
});

