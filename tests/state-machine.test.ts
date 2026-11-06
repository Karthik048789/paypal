import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, assertCanTransition, InvalidStateTransitionError } from '../lib/state-machine';

test('Job State Machine Transitions (SRS 2.7)', async (t) => {
  await t.test('Happy path transitions succeed', () => {
    assert.equal(canTransition('DRAFT', 'AWAITING_APPROVAL'), true);
    assert.equal(canTransition('AWAITING_APPROVAL', 'AWAITING_FUNDING'), true);
    assert.equal(canTransition('AWAITING_FUNDING', 'FUNDED'), true);
    assert.equal(canTransition('FUNDED', 'VERIFYING'), true);
    assert.equal(canTransition('VERIFYING', 'PAID'), true);
    assert.equal(canTransition('VERIFYING', 'PARTIALLY_PAID'), true);
    assert.equal(canTransition('VERIFYING', 'HELD'), true);
  });

  await t.test('Re-test transitions from PARTIALLY_PAID and HELD back to VERIFYING', () => {
    assert.equal(canTransition('PARTIALLY_PAID', 'VERIFYING'), true);
    assert.equal(canTransition('HELD', 'VERIFYING'), true);
  });

  await t.test('Dispute transitions from any settled state', () => {
    assert.equal(canTransition('PAID', 'DISPUTED'), true);
    assert.equal(canTransition('PARTIALLY_PAID', 'DISPUTED'), true);
    assert.equal(canTransition('HELD', 'DISPUTED'), true);
  });

  await t.test('Illegal transitions are blocked', () => {
    // Cannot skip verification straight to paid
    assert.equal(canTransition('DRAFT', 'PAID'), false);
    assert.equal(canTransition('AWAITING_FUNDING', 'PAID'), false);
    assert.equal(canTransition('FUNDED', 'PAID'), false);

    // Terminal states cannot transition further
    assert.equal(canTransition('EXPIRED', 'FUNDED'), false);
    assert.equal(canTransition('CANCELLED', 'VERIFYING'), false);
  });

  await t.test('assertCanTransition throws InvalidStateTransitionError on invalid transition', () => {
    assert.throws(() => {
      assertCanTransition('DRAFT', 'PAID');
    }, InvalidStateTransitionError);
  });
});

