import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfiguration } from '../lib/tool-contract.ts';
void test('tool configuration accepts only documented circuit/model/wiring inputs', () => {
  assert.deepEqual(
    validateConfiguration({
      circuit: 'motion',
      model: 'graded',
      wiring: 'rewired',
    }),
    { circuit: 'motion', model: 'graded', wiring: 'rewired' },
  );
  for (const invalid of [
    null,
    [],
    {},
    { circuit: 'bogus' },
    { circuit: 'heading', model: 'fake' },
    { circuit: 'heading', wiring: 'random' },
    { circuit: 'motion', unexpected: 1 },
  ])
    assert.throws(() => validateConfiguration(invalid));
});
