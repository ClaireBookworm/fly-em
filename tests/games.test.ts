import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  faceNullMove,
  faceRates,
  gardenRun,
  type GardenCell,
} from '../lib/games.ts';
import {
  makeWiringModels,
  movie,
  runMovie,
  testModel,
  trainModel,
  type WiringData,
} from '../lib/wiring-game.ts';
const cells: GardenCell[] = [
  { id: 0, kind: 'exc', x: 0, y: 0 },
  { id: 1, kind: 'exc', x: 1, y: 0 },
  { id: 2, kind: 'inh', x: 2, y: 0 },
];
const options = {
  drive: 500,
  coupling: 1000,
  recovery: true,
  block: false,
  pulseCell: 0,
};
const data = JSON.parse(
  readFileSync(
    new URL('../public/data/games/wiring.json', import.meta.url),
    'utf8',
  ),
) as WiringData;

void test('an isolated unforced circuit stays at rest; current injection reaches only its target', () => {
  const rest = gardenRun(cells, [], { ...options, drive: 0 });
  rest.voltage.forEach((v) => assert.ok(v.every((x) => x === -65)));
  const driven = gardenRun(cells, [], options);
  assert.ok(driven.spikes[0].length > 0);
  assert.equal(driven.spikes[1].length, 0);
  assert.equal(driven.spikes[2].length, 0);
});
void test('downstream synaptic current begins at the declared causal delay', () => {
  const r = gardenRun(cells, [{ from: 0, to: 1 }], options),
    first = r.spikes[0][0];
  assert.ok(r.synaptic[1].slice(0, first + 2).every((x) => x === 0));
  assert.ok(r.synaptic[1][first + 2] > 0);
  assert.ok(r.spikes[1][0] > first + 2);
  assert.ok(r.input[1].every((x) => x === 0));
});
void test('blocking an inhibitory output changes its targets, not its own input or spikes', () => {
  const edges = [
    { from: 0, to: 1 },
    { from: 0, to: 2 },
    { from: 2, to: 1 },
  ];
  const before = gardenRun(cells, edges, options),
    after = gardenRun(cells, edges, { ...options, block: true });
  assert.deepEqual(before.spikes[2], after.spikes[2]);
  assert.ok(after.spikes[1].length > before.spikes[1].length);
  assert.deepEqual(before.input, after.input);
});
void test('reset, membrane and recovery dynamics stay finite in a recurrent network', () => {
  const r = gardenRun(
    cells,
    [
      { from: 0, to: 1 },
      { from: 1, to: 0 },
      { from: 1, to: 2 },
      { from: 2, to: 0 },
    ],
    { ...options, coupling: 1500, paired: true },
  );
  r.voltage.forEach((v) => {
    assert.equal(v.length, 601);
    assert.ok(v.every(Number.isFinite));
  });
  r.spikes.forEach((s) =>
    s.slice(1).forEach((v, i) => assert.ok(v - s[i] >= 4)),
  );
});
void test('invisible face changes preserve every watched rate and leave measurable changes elsewhere', () => {
  for (let n = 1; n < 4; n++) {
    const initial = [0.1, -0.2, 0.3, -0.4],
      next = faceNullMove(initial, n, 0.7),
      a = faceRates(initial),
      b = faceRates(next);
    for (let i = 0; i < n; i++) assert.ok(Math.abs(a[i] - b[i]) < 1e-10);
    assert.ok(b.slice(n).some((v, i) => Math.abs(v - a[n + i]) > 0.1));
  }
  assert.deepEqual(faceNullMove([0, 0, 0, 0], 4, 1), [0, 0, 0, 0]);
});
void test('movies retain their declared direction while differing across independent seeds', () => {
  const a = movie(120, 1),
    b = movie(120, -1),
    c = movie(130, 1);
  assert.ok(a.positions.at(-1)! > a.positions[0]);
  assert.ok(b.positions.at(-1)! < b.positions[0]);
  assert.notDeepEqual(a.pixels, c.pixels);
  assert.ok(a.pixels.flat().every((x) => x >= 0 && x <= 1));
});
void test('scrambling preserves weight values, shared projection and stable activation bounds', () => {
  const [a, b] = makeWiringModels(data, 17);
  assert.deepEqual(
    a.matrix.flat().sort((a, b) => a - b),
    b.matrix.flat().sort((a, b) => a - b),
  );
  assert.notDeepEqual(a.matrix, b.matrix);
  assert.deepEqual(a.projection, b.projection);
  for (const m of [a, b]) {
    assert.ok(
      m.matrix.every(
        (row) => row.reduce((s, v) => s + Math.abs(v), 0) <= 0.8500001,
      ),
    );
    assert.ok(
      runMovie(m, movie(100, 1), true)
        .states.flat()
        .every((v) => Math.abs(v) <= 1),
    );
  }
});
void test('trained readouts solve unseen movies and silencing all units removes information without the cable', () => {
  const models = makeWiringModels(data, 17);
  for (const model of models) {
    const original = JSON.stringify(model),
      d = trainModel(model, false, 1017);
    assert.ok(testModel(model, d, false, 70017) >= 40);
    assert.equal(
      JSON.stringify(model),
      original,
      'training must not change recurrent weights',
    );
    if (model.kind !== 'input') {
      const cut = { ...model, muted: model.matrix.map((_, i) => i) };
      assert.equal(testModel(cut, d, false, 70017), 24);
      assert.ok(
        runMovie(cut, movie(1, 1), false).features.every((v) => v === 0),
      );
    }
  }
});
void test('published culture comparisons contain paired measurements, not generated curves', () => {
  const d = JSON.parse(
    readFileSync(
      new URL('../public/data/games/cultures.json', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(d.license, 'CC BY-NC 4.0');
  assert.deepEqual(
    d.layouts.map((l: { trials: unknown[] }) => l.trials.length),
    [8, 7, 7],
  );
  const c = d.layouts[0].trials.find(
    (t: { id: string }) => t.id === '210315_C',
  );
  assert.equal(c.pre.fraction, 1);
  assert.equal(c.stim.fraction, 0.5416666666666666);
  d.layouts.forEach(
    (l: {
      trials: { pre: { fraction: number }; stim: { fraction: number } }[];
    }) =>
      l.trials.forEach((t) => {
        assert.ok(t.pre.fraction >= 0 && t.pre.fraction <= 1);
        assert.ok(t.stim.fraction >= 0 && t.stim.fraction <= 1);
      }),
  );
});
