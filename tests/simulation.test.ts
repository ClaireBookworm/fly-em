import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  simulate,
  defaults,
  prepareEdges,
  hhStep,
  rates,
  type Atlas,
} from '../lib/simulation.ts';
const atlas: Atlas = JSON.parse(
  fs.readFileSync(
    new URL('../public/data/atlas.json', import.meta.url),
    'utf8',
  ),
);
void test('official circuit extracts have valid unique body IDs, positive contact counts and anatomical centerlines', () => {
  for (const c of Object.values(atlas.circuits)) {
    assert.equal(new Set(c.nodes.map((n) => n.id)).size, c.nodes.length);
    for (const [a, b, w] of c.edges) {
      assert.ok(c.nodes[a] && c.nodes[b]);
      assert.ok(Number.isInteger(w) && w > 0);
    }
    for (const id of c.skeletonIds) assert.ok(atlas.skeletons[id].length > 0);
  }
  assert.equal(atlas.circuits.heading.nodes.length, 130);
  assert.equal(atlas.circuits.escape.nodes.length, 82);
});
void test('degree-preserving rewiring changes edges while preserving degree and global weights', () => {
  const c = atlas.circuits.heading,
    e = prepareEdges(c, { ...defaults, wiring: 'rewired' });
  const degrees = (es: number[][], axis: number) =>
    c.nodes.map((_, i) => es.filter((x) => x[axis] === i).length);
  assert.deepEqual(degrees(e, 0), degrees(c.edges, 0));
  assert.deepEqual(degrees(e, 1), degrees(c.edges, 1));
  assert.deepEqual(
    e.map((x) => x[2]).sort((a, b) => a - b),
    c.edges.map((x) => x[2]).sort((a, b) => a - b),
  );
  assert.notDeepEqual(e, c.edges);
  assert.equal(new Set(e.map((x) => x.slice(0, 2).join(','))).size, e.length);
  assert.deepEqual(e, prepareEdges(c, { ...defaults, wiring: 'rewired' }));
});
void test('all nine default simulations are finite, deterministic and return genuine model distinctions', () => {
  for (const key of ['escape', 'heading', 'motion'] as const) {
    for (const model of ['lif', 'hh', 'graded'] as const) {
      const start = performance.now(),
        r = simulate(atlas.circuits[key], key, model, defaults);
      assert.equal(r.time.length, 601);
      assert.ok(
        r.voltage.every((v) => v.length === 601 && v.every(Number.isFinite)),
      );
      assert.ok(r.spikes.every((v) => v.every((t) => t <= 600)));
      if (model === 'graded') assert.equal(r.totalSpikes, 0);
      else
        assert.ok(
          Math.max(...r.voltage.flat()) > -64,
          `${key} ${model} must depolarize under the default input`,
        );
      if (model === 'lif')
        for (const ts of r.spikes)
          for (let i = 1; i < ts.length; i++) assert.ok(ts[i] - ts[i - 1] >= 2);
      console.log(
        key,
        model,
        'spikes',
        r.totalSpikes,
        'ms',
        Math.round(performance.now() - start),
      );
    }
  }
});
void test('silent drive plus zero coupling leaves LIF and graded models at rest', () => {
  for (const model of ['lif', 'graded'] as const) {
    const r = simulate(
      atlas.circuits.escape,
      'escape',
      model,
      { ...defaults, drive: 0, gain: 0 },
      60,
    );
    assert.equal(r.totalSpikes, 0);
    assert.ok(r.voltage.every((v) => v.every((x) => Math.abs(x + 65) < 1e-10)));
  }
});
void test('HH removable singularities are finite and integration converges under constant current', () => {
  for (const v of [-55, -40]) assert.ok(rates(v).every(Number.isFinite));
  const run = (dt: number) => {
    let v = -65;
    const r = rates(v);
    let m = r[0] / (r[0] + r[1]),
      h = r[2] / (r[2] + r[3]),
      n = r[4] / (r[4] + r[5]);
    for (let t = 0; t < 5 - 1e-9; t += dt)
      [v, m, h, n] = hhStep(v, m, h, n, 2, dt);
    return v;
  };
  const coarse = run(0.025),
    fine = run(0.0125),
    ref = run(0.00625);
  assert.ok(Math.abs(fine - ref) < Math.abs(coarse - ref));
  assert.ok(Math.abs(coarse - ref) < 0.2);
});
void test('silencing holds the specified cell type at rest and suppresses its spikes', () => {
  const c = atlas.circuits.escape,
    r = simulate(c, 'escape', 'lif', { ...defaults, silencedType: 'LC4' });
  c.nodes.forEach((n, i) => {
    if (n.type === 'LC4') {
      assert.equal(r.spikes[i].length, 0);
      assert.ok(r.voltage[i].every((v) => v === -65));
    }
  });
});
void test('recordings preserve released sample counts, units, and no invented escape waveform', () => {
  const d = JSON.parse(
    fs.readFileSync(
      new URL('../public/data/recordings.json', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(d.motion.time.length, 300);
  assert.equal(d.motion.unit, 'mV');
  assert.equal(d.heading.time.length, 750);
  assert.equal(d.heading.heatmap.length, 18);
  assert.ok(!d.escape.series);
  assert.ok(d.escape.figure.includes('Fig10'));
  assert.ok(Math.abs(d.motion.series[0].values[0] - -65.996661) < 1e-5);
});
void test('maximum drive and coupling, random initialization, and rewiring remain finite', () => {
  for (const key of ['escape', 'heading', 'motion'] as const)
    for (const model of ['lif', 'hh', 'graded'] as const) {
      const r = simulate(atlas.circuits[key], key, model, {
        ...defaults,
        drive: 2,
        gain: 2,
        wiring: 'rewired',
        randomInitial: true,
      });
      assert.ok(r.voltage.every((row) => row.every(Number.isFinite)));
    }
});
void test('a fixed seed reproduces random initialization and synthetic traces', () => {
  const p = { ...defaults, randomInitial: true, seed: 123 };
  const a = simulate(atlas.circuits.escape, 'escape', 'lif', p, 80),
    b = simulate(atlas.circuits.escape, 'escape', 'lif', p, 80);
  assert.deepEqual(a, b);
});
