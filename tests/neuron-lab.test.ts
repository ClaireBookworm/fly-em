import test from 'node:test';
import assert from 'node:assert/strict';
import {
  labDefaults,
  labConstants,
  labGraph,
  simulateLab,
  validateLabInput,
} from '../lib/neuron-lab.ts';

void test('subthreshold LIF follows the passive-membrane analytic solution', () => {
  const p = { ...labDefaults, current: 0.5 };
  const r = simulateLab(p, 'lif');
  const index = r.time.indexOf(70);
  const expected = -65 + p.current * p.tau * (1 - Math.exp(-50 / p.tau));
  assert.ok(Math.abs(r.voltage[0][index] - expected) < 1e-8);
  assert.equal(r.spikes[0].length, 0);
});
void test('LIF emits events and resets; its plotted peaks are explicitly separate', () => {
  const r = simulateLab(labDefaults, 'lif');
  assert.ok(r.spikes[0].length > 0);
  assert.ok(Math.max(...r.voltage[0]) < -50);
  assert.equal(Math.max(...r.displayVoltage[0]), 30);
});
void test('HH generates a resolved action potential and converges when the time step halves', () => {
  const a = simulateLab(labDefaults, 'hh'),
    b = simulateLab(labDefaults, 'hh', false, 0.0125);
  assert.ok(Math.max(...a.voltage[0]) > 20);
  assert.equal(a.spikes[0].length, b.spikes[0].length);
  assert.ok(Math.abs(a.spikes[0][0] - b.spikes[0][0]) < 0.15);
  for (const g of a.gates) assert.ok(g.every((x) => x >= 0 && x <= 1));
});
void test('blocking sodium prevents regenerative HH spikes for the default input', () => {
  assert.equal(
    simulateLab({ ...labDefaults, sodium: 0 }, 'hh').spikes[0].length,
    0,
  );
});
void test('synaptic responses respect causality and the explicit delay', () => {
  for (const model of ['lif', 'hh'] as const) {
    const r = simulateLab(labDefaults, model, true);
    const firstConductance = r.time[r.conductanceE[1].findIndex((x) => x > 0)];
    assert.ok(firstConductance >= r.spikes[0][0] + labConstants.delay);
    assert.ok(
      firstConductance <=
        r.spikes[0][0] + labConstants.delay + labConstants.sampleInterval,
    );
    assert.ok(r.spikes[1].length > 0);
    assert.ok(r.spikes[1][0] > r.spikes[0][0]);
  }
});
void test('cutting the bridge isolates the second module for either neuron model', () => {
  for (const model of ['lif', 'hh'] as const) {
    const r = simulateLab(
      { ...labDefaults, motif: 'modules', bridge: 0 },
      model,
      true,
    );
    assert.ok(r.spikes[0].length > 0);
    for (let i = 3; i < 6; i++) {
      assert.equal(r.spikes[i].length, 0);
      assert.ok(r.conductanceE[i].every((x) => x === 0));
    }
  }
});
void test('all motifs stay finite at the admitted parameter boundaries', () => {
  for (const motif of ['chain', 'feedback', 'inhibition', 'modules'] as const) {
    const r = simulateLab(
      {
        ...labDefaults,
        motif,
        current: 20,
        coupling: 2,
        bridge: 2,
        sodium: 160,
        potassium: 0,
      },
      'hh',
      true,
    );
    assert.equal(r.voltage.length, labGraph(motif).nodes.length);
    assert.ok(
      r.voltage.flat().every((v) => Number.isFinite(v) && v > -150 && v < 150),
    );
  }
});
void test('teaching tool rejects unknown, nonfinite, and out-of-range parameters', () => {
  for (const x of [
    { current: NaN },
    { current: 21 },
    { model: 'graded' },
    { sodium: -1 },
    { motif: 'brain' },
    { bad: 1 },
    null,
    [],
  ])
    assert.throws(() => validateLabInput(x));
  assert.deepEqual(validateLabInput({ current: 0, model: 'hh', bridge: 0 }), {
    current: 0,
    model: 'hh',
    bridge: 0,
  });
});
