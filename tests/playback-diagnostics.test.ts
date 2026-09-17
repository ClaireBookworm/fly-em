import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate, defaults, type Circuit } from '../lib/simulation.ts';
const cell = {
  id: 1,
  type: 'EPG',
  label: 'EPG_L5',
  nt: 'acetylcholine',
  ntConfidence: null,
  position: null,
  status: 'traced',
};
const circuit: Circuit = {
  nodes: [cell],
  edges: [],
  populationCount: 1,
  skeletonIds: [],
};
void test('displayed current balance matches the analytic passive voltage slope', () => {
  const r = simulate(
    circuit,
    'heading',
    'graded',
    { ...defaults, drive: 0, gain: 0, randomInitial: true },
    20,
    0.001,
  );
  for (let t = 0; t < 20; t++) {
    const V = r.rawVoltage[0][t];
    assert.ok(
      Math.abs(r.diagnostics.derivative[0][t] - 0.05 * (-65 - V)) < 1e-12,
    );
    const exact = -65 + (V + 65) * Math.exp(-0.05);
    assert.ok(Math.abs(r.rawVoltage[0][t + 1] - exact) < 1e-9);
  }
});
void test('instantaneous current terms sum for all models; held LIF voltage is explicitly separate', () => {
  for (const model of ['lif', 'hh', 'graded'] as const) {
    const r = simulate(
      circuit,
      'heading',
      model,
      { ...defaults, drive: 2 },
      400,
    );
    const d = r.diagnostics;
    for (let i = 0; i < r.time.length; i++) {
      assert.ok(Number.isFinite(d.intrinsic[0][i]));
      assert.equal(
        d.derivative[0][i],
        d.held[0][i]
          ? 0
          : d.external[0][i] + d.synaptic[0][i] + d.intrinsic[0][i],
      );
      if (d.held[0][i]) assert.equal(r.rawVoltage[0][i], -65);
    }
    if (model === 'lif') {
      assert.ok(r.totalSpikes > 0);
      assert.ok(d.held[0].some((v) => v === 1));
      assert.ok(r.voltage[0].includes(30));
      assert.ok(!r.rawVoltage[0].includes(30));
    }
  }
});
void test('synaptic playback signal uses the same normalized incoming weights as integration', () => {
  const c: Circuit = {
    ...circuit,
    nodes: [cell, { ...cell, id: 2, type: 'PEN_a', label: 'PEN_a' }],
    edges: [[0, 1, 10]],
  };
  const r = simulate(
    c,
    'heading',
    'lif',
    { ...defaults, drive: 2, gain: 0.75 },
    200,
  );
  assert.ok(r.diagnostics.release[0].some((x) => x > 0));
  for (let i = 0; i < r.time.length; i++)
    assert.ok(
      Math.abs(
        r.diagnostics.synaptic[1][i] -
          (35 / 20) * 0.75 * r.diagnostics.release[0][i],
      ) < 1e-12,
    );
});
