import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceGameTime, gameSampleIndex } from '../lib/game-playback.ts';
import {
  gardenEditor,
  gardenHasFeedback,
  initialGarden,
} from '../lib/garden-editor.ts';
import { gardenRun } from '../lib/games.ts';

const options = { drive: 400, coupling: 850, recovery: true, block: false };
const threeCells = () =>
  gardenEditor(gardenEditor(initialGarden, { type: 'add', kind: 'exc' }), {
    type: 'add',
    kind: 'inh',
  });

void test('playback tolerates an initial animation timestamp before effect setup', () => {
  const time = advanceGameTime(0, 100.7, 100, 600, 0.12);
  assert.equal(time, 0);
  assert.ok(advanceGameTime(time, 100, 116, 600, 0.12) > 0);
  assert.equal(advanceGameTime(599, 100, 180, 600, 0.12), 600);
  assert.equal(advanceGameTime(-1, 100, 99, 600, 0.12), 0);
});

void test('sending a pulse to C supports every playback sample, including boundary timestamps', () => {
  const editor = gardenEditor(threeCells(), { type: 'pulse', id: 2 });
  const run = gardenRun(editor.cells, editor.edges, {
    ...options,
    pulseCell: editor.pulseCell!,
  });
  const index = editor.cells.findIndex((c) => c.id === editor.selected);
  assert.equal(editor.selected, 2);
  assert.ok(run.spikes[index].length > 0);
  assert.equal(run.spikes[0].length, 0);
  assert.equal(run.spikes[1].length, 0);
  const frames = [
    -0.5,
    ...Array.from({ length: 601 }, (_, i) => i),
    600.8,
    601,
    NaN,
  ];
  for (const time of frames) {
    const t = gameSampleIndex(time, run.voltage[index].length, run.duration);
    for (const series of [
      run.voltage[index],
      run.input[index],
      run.synaptic[index],
    ]) {
      assert.ok(
        Number.isFinite(series[t]),
        `finite sample at playback time ${time}`,
      );
      assert.doesNotThrow(() => series[t].toFixed(1));
    }
  }
  assert.equal(gameSampleIndex(-0.5, 601, 600), 0);
  assert.equal(gameSampleIndex(700, 601, 600), 600);
});

void test('deleting B removes only its connections and leaves a usable C with the same ID', () => {
  let editor = gardenEditor(threeCells(), { type: 'pulse', id: 2 });
  editor = gardenEditor(editor, { type: 'connect' });
  editor = gardenEditor(editor, { type: 'select', id: 0 }); // C → A survives deletion of B
  editor = gardenEditor(editor, { type: 'delete', id: 1 });
  assert.deepEqual(
    editor.cells.map((c) => c.id),
    [0, 2],
  );
  assert.deepEqual(editor.edges, [{ from: 2, to: 0 }]);
  assert.equal(editor.pulseCell, 2);
  editor = gardenEditor(editor, { type: 'select', id: 2 });
  const run = gardenRun(editor.cells, editor.edges, {
    ...options,
    pulseCell: editor.pulseCell!,
  });
  const c = editor.cells.findIndex((cell) => cell.id === 2);
  assert.equal(c, 1);
  assert.ok(run.spikes[c].length > 0);
  const first = run.spikes[c][0];
  assert.ok(run.synaptic[0][first + 2] < 0);
  assert.equal(run.input[c][40], 400);
  assert.ok(run.voltage[c].every(Number.isFinite));
  editor = gardenEditor(editor, { type: 'add', kind: 'exc' });
  assert.deepEqual(
    editor.cells.map((cell) => cell.id),
    [0, 2, 1],
  );
  assert.ok(editor.edges.some((edge) => edge.from === 2 && edge.to === 1));
});

void test('deleting the selected pulse source clears pending connection state and retargets safely', () => {
  let editor = gardenEditor(threeCells(), { type: 'pulse', id: 2 });
  editor = gardenEditor(editor, { type: 'connect' });
  assert.equal(editor.connecting, 2);
  editor = gardenEditor(editor, { type: 'delete', id: 2 });
  assert.equal(editor.selected, 0);
  assert.equal(editor.pulseCell, 0);
  assert.equal(editor.connecting, null);
  assert.ok(editor.edges.every((e) => e.from !== 2 && e.to !== 2));
  const run = gardenRun(editor.cells, editor.edges, {
    ...options,
    pulseCell: editor.pulseCell!,
  });
  assert.ok(run.spikes[0].length > 0);
});

void test('delete every cell, add a new one, and stimulate again without dangling edges', () => {
  let editor = threeCells();
  for (const id of [0, 2, 1])
    editor = gardenEditor(editor, { type: 'delete', id });
  assert.deepEqual(editor, {
    cells: [],
    edges: [],
    selected: null,
    pulseCell: null,
    connecting: null,
  });
  assert.deepEqual(
    gardenRun(editor.cells, editor.edges, { ...options, pulseCell: -1 })
      .voltage,
    [],
  );
  editor = gardenEditor(editor, { type: 'add', kind: 'exc' });
  assert.equal(editor.cells[0].id, 0);
  assert.equal(editor.pulseCell, 0);
  assert.deepEqual(editor.edges, []);
  assert.ok(
    gardenRun(editor.cells, editor.edges, {
      ...options,
      pulseCell: editor.pulseCell!,
    }).spikes[0].length > 0,
  );
});

void test('feedback detection survives sparse IDs and does not mistake an input to A for a loop', () => {
  assert.equal(gardenHasFeedback([{ from: 2, to: 0 }]), false);
  assert.equal(
    gardenHasFeedback([
      { from: 2, to: 5 },
      { from: 5, to: 2 },
    ]),
    true,
  );
  assert.equal(gardenHasFeedback([]), false);
});
