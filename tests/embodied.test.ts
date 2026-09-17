import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import {
  motionLesson,
  muscleReadout,
  type WingReplay,
} from '../lib/embodied.ts';
import type { VisionReplay } from '../lib/embodied.ts';

void test('visual replay preserves a common timebase, identities, varying retinal input and actual joint readout', () => {
  const data = JSON.parse(
    readFileSync(
      new URL('../public/data/embodied/vision-replay.json', import.meta.url),
      'utf8',
    ),
  ) as VisionReplay;
  assert.equal(data.totalCellsPerEye, 45669);
  assert.equal(data.nodes.length, 15 * 721);
  assert.equal(data.retina.length, 721);
  assert.equal(data.frames.length, 50);
  const identities = new Set(data.nodes.map((n) => `${n.type}/${n.u}/${n.v}`));
  assert.equal(identities.size, data.nodes.length);
  data.frames.forEach((f, i) => {
    assert.ok(Math.abs(f.timeMs - (0.1 + 10 * i)) < 1e-8);
    assert.deepEqual(f.observerDrive, [0, 0]);
    assert.deepEqual(f.targetDrive, [1, 1]);
    assert.equal(f.activity.length, 2);
    f.activity.forEach((a) => {
      assert.equal(a.length, data.nodes.length);
      assert.ok(a.every(Number.isFinite));
    });
    f.retina.forEach((a) => {
      assert.equal(a.length, 721);
      assert.ok(a.every((v) => Number.isFinite(v) && v >= 0 && v <= 1));
    });
  });
  assert.notDeepEqual(data.frames[0].retina, data.frames.at(-1)!.retina);
  assert.notDeepEqual(
    data.frames[0].targetJoints,
    data.frames.at(-1)!.targetJoints,
  );
  const t4 = data.nodes.findIndex(
    (n) => n.type === 'T4a' && n.u === 0 && n.v === 0,
  );
  const response = data.frames.map((f) => f.activity[0][t4]);
  assert.ok(Math.max(...response) - Math.min(...response) > 0.1);
  assert.ok(
    statSync(new URL('../public/data/embodied/observer.mp4', import.meta.url))
      .size > 10000,
  );
});

void test('opponent motion reverses sign when receptor order reverses and vanishes at zero contrast', () => {
  const right = motionLesson('right', 1, 70),
    left = motionLesson('left', 1, 70);
  assert.ok(Math.max(...right.response) > 0.2);
  right.response.forEach((v, i) =>
    assert.ok(Math.abs(v + left.response[i]) < 1e-12),
  );
  assert.ok(motionLesson('right', 0, 70).response.every((v) => v === 0));
});

void test('downstream interventions preserve neural events and alter the intended muscle or hinge only', () => {
  const spikes = [[10], [20], [30], [40], [50]],
    before = JSON.stringify(spikes);
  const intact = muscleReadout(spikes, 65, 0, 'intact');
  const blocked = muscleReadout(spikes, 65, 0, 'blocked');
  const wrong = muscleReadout(spikes, 65, 0, 'wrong-target');
  const reversed = muscleReadout(spikes, 65.5, 0, 'reversed-hinge');
  assert.deepEqual(blocked.activation, intact.activation);
  assert.equal(blocked.effective[0], 0);
  assert.ok(blocked.power < intact.power);
  assert.ok(wrong.effective[1] > intact.effective[1]);
  assert.deepEqual(wrong.effective.slice(2), intact.effective.slice(2));
  assert.equal(reversed.angle, -muscleReadout(spikes, 65.5, 0, 'intact').angle);
  assert.equal(JSON.stringify(spikes), before);
  assert.deepEqual(
    muscleReadout(spikes, 0, 0, 'intact').activation,
    [0, 0, 0, 0, 0],
  );
});

void test('published wing reproduction contains finite voltages and experimental event times without invented waveforms', () => {
  const data = JSON.parse(
    readFileSync(
      new URL('../public/data/embodied/wing-replay.json', import.meta.url),
      'utf8',
    ),
  ) as WingReplay;
  assert.equal(data.parameters.Cm, '130*pfarad');
  assert.equal(data.sampleDtMs, 0.5);
  for (const run of Object.values(data.variants)) {
    assert.equal(run.voltage.length, 5);
    run.voltage.forEach((v) => {
      assert.equal(v.length, data.durationMs / data.sampleDtMs);
      assert.ok(v.every((x) => Number.isFinite(x) && x > -100 && x < 80));
    });
    run.spikes.forEach((s) =>
      assert.ok(s.every((v, i) => v >= 0 && v < 5000 && (!i || v > s[i - 1]))),
    );
  }
  assert.equal(data.experimental.cropStartSeconds, 23);
  assert.equal(data.experimental.spikes.length, 5);
  assert.equal(data.experimental.wingbeats.length, 935);
  assert.equal('voltage' in data.experimental, false);
  assert.notDeepEqual(
    data.variants.published.spikes,
    data.variants.strong.spikes,
  );
});
