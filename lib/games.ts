/** Small, explicit teaching models. No parameter here is fitted to a recorded cell. */
export type GardenCell = {
  id: number;
  kind: 'exc' | 'inh';
  x: number;
  y: number;
};
export type GardenEdge = { from: number; to: number };
export type GardenRun = {
  voltage: number[][];
  input: number[][];
  synaptic: number[][];
  spikes: number[][];
  duration: number;
};
export function gardenRun(
  cells: GardenCell[],
  edges: GardenEdge[],
  options: {
    drive: number;
    coupling: number;
    recovery: boolean;
    block: boolean;
    pulseCell: number;
    paired?: boolean;
  },
): GardenRun {
  const duration = 600,
    n = cells.length;
  const voltage = cells.map(() => [-65]),
    input = cells.map(() => [0]),
    synaptic = cells.map(() => [0]),
    spikes: number[][] = cells.map(() => []);
  const v = cells.map(() => -65),
    syn = cells.map(() => 0),
    ref = cells.map(() => 0),
    resource = cells.map(() => 1);
  const pending = Array.from(
    { length: duration + 4 },
    () => Array(n).fill(0) as number[],
  );
  for (let t = 1; t <= duration; t++) {
    for (let i = 0; i < n; i++) {
      syn[i] = syn[i] * Math.exp(-1 / 8) + pending[t][i];
      resource[i] += (1 - resource[i]) / 160;
      const pulse =
        (t >= 40 && t < 75) || (options.paired && t >= 170 && t < 205);
      const drive =
        cells[i].id === options.pulseCell && pulse ? options.drive : 0;
      input[i].push(drive);
      synaptic[i].push(syn[i]);
      if (ref[i] > 0) {
        ref[i]--;
        v[i] = -65;
      } else v[i] += (-65 - v[i] + 0.1 * (drive + syn[i])) / 20;
      if (v[i] >= -50) {
        spikes[i].push(t);
        voltage[i].push(20);
        v[i] = -65;
        ref[i] = 3;
        const sign = cells[i].kind === 'exc' ? 1 : options.block ? 0 : -1;
        for (const e of edges.filter((e) => e.from === cells[i].id)) {
          const j = cells.findIndex((c) => c.id === e.to);
          if (j >= 0 && t + 2 <= duration)
            pending[t + 2][j] += sign * options.coupling * resource[i];
        }
        if (options.recovery) resource[i] *= 0.65;
      } else voltage[i].push(v[i]);
    }
  }
  return { voltage, input, synaptic, spikes, duration };
}
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
export const faceAxes = [
  [1, 0.65, 0, 0],
  [0, 0, 1, 0.5],
  [0.65, -1, 0, 0],
  [0, 0, 0.5, -1],
];
export function faceRates(features: number[]) {
  return faceAxes.map(
    (a) => 30 + 12 * a.reduce((s, v, i) => s + v * features[i], 0),
  );
}
/** Orthogonal projection removes exactly the directions measured by selected axes. */
export function faceNullMove(
  features: number[],
  locked: number,
  amount: number,
) {
  let direction = [0.8, -1, 0.75, -0.4];
  for (const a of faceAxes.slice(0, locked)) {
    const dot =
      direction.reduce((s, v, i) => s + v * a[i], 0) /
      a.reduce((s, v) => s + v * v, 0);
    direction = direction.map((v, i) => v - dot * a[i]);
  }
  const norm = Math.hypot(...direction);
  return features.map(
    (v, i) => v + (norm > 1e-8 ? (amount * direction[i]) / norm : 0),
  );
}
