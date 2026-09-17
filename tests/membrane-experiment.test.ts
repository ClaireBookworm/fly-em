import test from 'node:test';
import assert from 'node:assert/strict';
import {
  simulateMembrane,
  membraneDefaults,
} from '../lib/membrane-experiment.ts';
import { simulateLab, labDefaults } from '../lib/neuron-lab.ts';

void test('whole-cell passive voltage agrees with the analytic RC solution', () => {
  const p = { ...membraneDefaults, amplitude: 20 };
  const r = simulateMembrane(p, () => 20);
  const i = r.time.indexOf(30),
    expected =
      p.rest + (20 / p.leak) * (1 - Math.exp((-30 * p.leak) / p.capacitance));
  assert.ok(Math.abs(r.voltage[i] - expected) < 1e-9);
});
void test('a close pair reaches threshold whereas separated or single inputs do not', () => {
  assert.equal(simulateMembrane(membraneDefaults).spikes.length, 1);
  assert.equal(
    simulateMembrane({ ...membraneDefaults, gap: 30 }).spikes.length,
    0,
  );
  assert.equal(
    simulateMembrane(membraneDefaults, (t) => (t >= 10 && t < 15 ? 220 : 0))
      .spikes.length,
    0,
  );
});
void test('capacitance changes timing while the long-time passive response stays fixed', () => {
  const a = simulateMembrane(
    { ...membraneDefaults, capacitance: 50 },
    () => 20,
    500,
  );
  const b = simulateMembrane(
    { ...membraneDefaults, capacitance: 200 },
    () => 20,
    500,
  );
  assert.ok(a.voltage[100] > b.voltage[100]);
  assert.ok(Math.abs(a.voltage.at(-1)! - b.voltage.at(-1)!) < 0.001);
});
void test('whole-cell HH conversion reproduces the density-based teaching model', () => {
  const a = simulateMembrane(
    membraneDefaults,
    (t) => (t >= 20 && t < 120 ? 800 : 0),
    180,
    'hh',
  );
  const b = simulateLab(labDefaults, 'hh');
  assert.equal(a.spikes.length, b.spikes[0].length);
  a.spikes.forEach((t, i) => assert.ok(Math.abs(t - b.spikes[0][i]) < 0.001));
});
void test('admitted controls remain finite and invalid physical values are rejected', () => {
  for (const capacitance of [50, 200])
    for (const leak of [2, 15])
      for (const gap of [5, 60]) {
        const r = simulateMembrane({
          ...membraneDefaults,
          capacitance,
          leak,
          gap,
          amplitude: 500,
        });
        assert.ok(
          r.voltage.every((v) => Number.isFinite(v) && v >= -65 && v <= -50),
        );
      }
  assert.throws(() =>
    simulateMembrane({ ...membraneDefaults, capacitance: 0 }),
  );
});
