/** Small teaching transforms, separate from the published neural replays. */
export type MuscleIntervention =
  | 'intact'
  | 'blocked'
  | 'wrong-target'
  | 'reversed-hinge';
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function muscleReadout(
  spikes: number[][],
  timeMs: number,
  selected: number,
  intervention: MuscleIntervention,
) {
  // This calcium-like activation proxy is assumed, not fitted adult muscle physiology.
  const activation = spikes.map((train) =>
    clamp01(
      train.reduce((sum, t) => {
        const age = timeMs - t - 2;
        return age >= 0 ? sum + 0.35 * Math.exp(-age / 120) : sum;
      }, 0),
    ),
  );
  const effective = [...activation];
  if (intervention === 'blocked' || intervention === 'wrong-target')
    effective[selected] = 0;
  if (intervention === 'wrong-target')
    effective[(selected + 1) % 5] = clamp01(
      effective[(selected + 1) % 5] + activation[selected],
    );
  // Five MNs innervate six DLM fibres: the fifth MN supplies two fibres.
  const fibres = [...effective.slice(0, 4), effective[4], effective[4]];
  const power = fibres.reduce((a, b) => a + b, 0) / 6;
  const phase = 2 * Math.PI * 0.2 * timeMs; // imposed 200 Hz, NOT predicted by the neural model
  const angle =
    60 * power * Math.sin(phase) * (intervention === 'reversed-hinge' ? -1 : 1);
  return { activation, effective, fibres, power, angle, phase };
}

export type EdgeDirection = 'right' | 'left';
export function motionLesson(
  direction: EdgeDirection,
  contrast: number,
  delayMs: number,
) {
  const dt = 2,
    count = 601;
  const time = Array.from({ length: count }, (_, i) => i * dt);
  const left: number[] = [],
    right: number[] = [],
    delayedLeft: number[] = [],
    delayedRight: number[] = [],
    response: number[] = [];
  let a = 0,
    b = 0;
  const lag = 100,
    first = 420;
  for (const t of time) {
    // A finite light bar passes two neighbouring receptors in opposite orders.
    const pulse = (start: number) =>
      contrast *
      (1 / (1 + Math.exp(-(t - start) / 12)) -
        1 / (1 + Math.exp(-(t - start - 120) / 12)));
    const l = pulse(first + (direction === 'left' ? lag : 0));
    const r = pulse(first + (direction === 'right' ? lag : 0));
    a += (l - a) * (1 - Math.exp(-dt / Math.max(1, delayMs)));
    b += (r - b) * (1 - Math.exp(-dt / Math.max(1, delayMs)));
    left.push(l);
    right.push(r);
    delayedLeft.push(a);
    delayedRight.push(b);
    response.push(a * r - b * l);
  }
  return { time, left, right, delayedLeft, delayedRight, response };
}

export interface WingReplay {
  durationMs: number;
  sampleDtMs: number;
  parameters: Record<string, string | number>;
  variants: Record<
    'published' | 'uncoupled' | 'strong',
    { voltage: number[][]; spikes: number[][]; gapNS: number | number[][] }
  >;
  experimental: {
    file: string;
    cropStartSeconds: number;
    spikes: number[][];
    wingbeats: number[];
    note: string;
  };
}
export interface VisionReplay {
  durationMs: number;
  sampleDtMs: number;
  videoSlowdown: number;
  totalCellsPerEye: number;
  types: string[];
  nodes: { index: number; type: string; u: number; v: number }[];
  retina: { u: number; v: number }[];
  frames: {
    timeMs: number;
    retina: number[][];
    activity: number[][];
    targetPosition: number[];
    targetJoints: number[];
    observerDrive: number[];
    targetDrive: number[];
  }[];
  cellParameters?: Record<
    string,
    { bias: number; timeConstantSeconds: number }
  >;
}
