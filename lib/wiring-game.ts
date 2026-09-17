import { seeded } from './games.ts';
export type WiringData = {
  dataset: string;
  release: string;
  nodes: { id: number; type: string; nt: string }[];
  edges: number[][];
  selection: string;
  source: string;
};
export type Movie = {
  pixels: number[][];
  direction: number;
  positions: number[];
};
export type WiringModel = {
  kind: 'anatomy' | 'scrambled' | 'input';
  matrix: number[][];
  projection: number[][];
  muted: number[];
};
export type Decoder = { mean: number[]; scale: number[]; weights: number[] };
export const MOVIE_FRAMES = 24,
  RETINA = 12;
export function movie(seed: number, direction: number): Movie {
  const r = seeded(seed),
    center = 0.35 + r() * 0.3,
    width = 0.34 + r() * 0.15,
    contrast = 0.5 + r() * 0.5;
  const positions = Array.from(
    { length: MOVIE_FRAMES },
    (_, t) => center + direction * width * (t / (MOVIE_FRAMES - 1) - 0.5),
  );
  return {
    direction,
    positions,
    pixels: positions.map((x) =>
      Array.from({ length: RETINA }, (_, i) =>
        Math.max(
          0,
          Math.min(
            1,
            contrast * Math.exp(-(((i / (RETINA - 1) - x) / 0.095) ** 2)) +
              (r() - 0.5) * 0.08,
          ),
        ),
      ),
    ),
  };
}
export function makeWiringModels(
  data: WiringData,
  seed: number,
): WiringModel[] {
  const n = data.nodes.length,
    r = seeded(seed),
    matrix = Array.from({ length: n }, () => Array(n).fill(0) as number[]);
  for (const [from, to, count] of data.edges)
    matrix[to][from] =
      (data.nodes[from].nt === 'acetylcholine' ? 1 : -1) * Math.log1p(count);
  const largest = Math.max(
    ...matrix.map((row) => row.reduce((s, v) => s + Math.abs(v), 0)),
    1,
  );
  matrix.forEach((row) =>
    row.forEach((v, i) => {
      row[i] = (v / largest) * 0.85;
    }),
  );
  const values = matrix.flat();
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  const projection = Array.from({ length: n }, () =>
    Array.from({ length: RETINA }, () => (r() - 0.5) * 2.8),
  );
  const shuffled = Array.from({ length: n }, (_, i) =>
    values.slice(i * n, (i + 1) * n),
  );
  // Shared scalar keeps both matrices' maximum absolute row-sum <= .85.
  const cap = Math.max(
    1,
    ...shuffled.map((row) => row.reduce((s, v) => s + Math.abs(v), 0) / 0.85),
  );
  for (const m of [matrix, shuffled])
    m.forEach((row) =>
      row.forEach((v, i) => {
        row[i] = v / cap;
      }),
    );
  return [
    { kind: 'anatomy', matrix, projection, muted: [] },
    { kind: 'scrambled', matrix: shuffled, projection, muted: [] },
    { kind: 'input', matrix: [], projection: [], muted: [] },
  ];
}
export function runMovie(model: WiringModel, m: Movie, bypass: boolean) {
  const n = model.matrix.length,
    states: number[][] = [],
    inputFeatures: number[] = [],
    stateFeatures: number[] = [];
  let x = Array(n).fill(0) as number[];
  for (const pixels of m.pixels) {
    x = model.matrix.map((row, i) =>
      model.muted.includes(i)
        ? 0
        : 0.65 * x[i] +
          0.35 *
            Math.tanh(
              row.reduce((s, v, j) => s + v * x[j], 0) +
                model.projection[i].reduce((s, v, j) => s + v * pixels[j], 0),
            ),
    );
    states.push(x);
  }
  for (let bin = 0; bin < 4; bin++) {
    for (let i = 0; i < RETINA; i++)
      inputFeatures.push(
        m.pixels.slice(bin * 6, bin * 6 + 6).reduce((s, row) => s + row[i], 0) /
          6,
      );
    for (let i = 0; i < n; i++)
      stateFeatures.push(
        states.slice(bin * 6, bin * 6 + 6).reduce((s, row) => s + row[i], 0) /
          6,
      );
  }
  return {
    states,
    features:
      model.kind === 'input'
        ? inputFeatures
        : bypass
          ? [...stateFeatures, ...inputFeatures]
          : stateFeatures,
  };
}
export function fitDecoder(xs: number[][], ys: number[]): Decoder {
  const d = xs[0].length,
    mean = Array.from(
      { length: d },
      (_, j) => xs.reduce((s, x) => s + x[j], 0) / xs.length,
    );
  const scale = mean.map(
    (m, j) =>
      Math.sqrt(xs.reduce((s, x) => s + (x[j] - m) ** 2, 0) / xs.length) || 1,
  );
  const z = xs.map((x) => [1, ...x.map((v, j) => (v - mean[j]) / scale[j])]),
    p = d + 1;
  const a = Array.from({ length: p }, () => Array(p + 1).fill(0) as number[]);
  for (let k = 0; k < z.length; k++)
    for (let i = 0; i < p; i++) {
      a[i][p] += z[k][i] * ys[k];
      for (let j = 0; j < p; j++) a[i][j] += z[k][i] * z[k][j];
    }
  for (let i = 0; i < p; i++) a[i][i] += i === 0 ? 1e-8 : 4;
  for (let k = 0; k < p; k++) {
    const pivot = a[k][k];
    for (let j = k; j <= p; j++) a[k][j] /= pivot;
    for (let i = 0; i < p; i++)
      if (i !== k) {
        const factor = a[i][k];
        for (let j = k; j <= p; j++) a[i][j] -= factor * a[k][j];
      }
  }
  return { mean, scale, weights: a.map((row) => row[p]) };
}
export function predict(decoder: Decoder, x: number[]) {
  return (
    decoder.weights[0] +
    x.reduce(
      (s, v, j) =>
        s + ((v - decoder.mean[j]) / decoder.scale[j]) * decoder.weights[j + 1],
      0,
    )
  );
}
export function taskSet(seed: number, count = 96) {
  return Array.from({ length: count }, (_, i) =>
    movie(seed + i * 31, i % 2 ? 1 : -1),
  );
}
export function trainModel(model: WiringModel, bypass: boolean, seed: number) {
  const set = taskSet(seed, 96);
  return fitDecoder(
    set.map((m) => runMovie(model, m, bypass).features),
    set.map((m) => m.direction),
  );
}
export function testModel(
  model: WiringModel,
  decoder: Decoder,
  bypass: boolean,
  seed: number,
) {
  const set = taskSet(seed, 48);
  return set.filter(
    (m) =>
      (predict(decoder, runMovie(model, m, bypass).features) >= 0 ? 1 : -1) ===
      m.direction,
  ).length;
}
export function importantUnits(
  model: WiringModel,
  decoder: Decoder,
  count = 4,
) {
  const n = model.matrix.length;
  return Array.from({ length: n }, (_, i) => ({
    i,
    w: Array.from({ length: 4 }, (_, b) =>
      Math.abs(decoder.weights[1 + b * n + i] / decoder.scale[b * n + i]),
    ).reduce((s, v) => s + v, 0),
  }))
    .sort((a, b) => b.w - a.w)
    .slice(0, count)
    .map((v) => v.i);
}
