import { rates } from './simulation.ts';

export type LabModel = 'lif' | 'hh';
export type Motif = 'chain' | 'feedback' | 'inhibition' | 'modules';
export type Stimulus = 'step' | 'pulse' | 'pair';
export interface LabParameters {
  current: number;
  tau: number;
  sodium: number;
  potassium: number;
  coupling: number;
  bridge: number;
  stimulus: Stimulus;
  motif: Motif;
  model: LabModel;
}
export const labDefaults: LabParameters = {
  current: 8,
  tau: 20,
  sodium: 120,
  potassium: 36,
  coupling: 1,
  bridge: 1,
  stimulus: 'step',
  motif: 'chain',
  model: 'lif',
};
export const labConstants = {
  capacitance: 1,
  lifRest: -65,
  lifThreshold: -50,
  lifReset: -65,
  refractory: 2,
  hhLeak: 0.3,
  sodiumReversal: 50,
  potassiumReversal: -77,
  leakReversal: -54.4,
  excitationReversal: 0,
  inhibitionReversal: -80,
  synapticScale: 0.1,
  excitatoryDecay: 5,
  inhibitoryDecay: 10,
  delay: 1,
  dt: 0.025,
  sampleInterval: 0.25,
  duration: 180,
} as const;
export interface LabNode {
  name: string;
  inhibitory: boolean;
  x: number;
  y: number;
  module: number;
}
export interface LabEdge {
  from: number;
  to: number;
  weight: number;
  bridge?: boolean;
}
export function labGraph(motif: Motif): { nodes: LabNode[]; edges: LabEdge[] } {
  const node = (
    name: string,
    x: number,
    y: number,
    inhibitory = false,
    module = 0,
  ) => ({ name, x, y, inhibitory, module });
  if (motif === 'modules')
    return {
      nodes: [
        node('A1', 85, 90),
        node('A2', 215, 90),
        node('Aᵢ', 150, 220, true),
        node('B1', 405, 90, false, 1),
        node('B2', 535, 90, false, 1),
        node('Bᵢ', 470, 220, true, 1),
      ],
      edges: [
        { from: 0, to: 1, weight: 1 },
        { from: 1, to: 0, weight: 0.35 },
        { from: 0, to: 2, weight: 0.7 },
        { from: 2, to: 1, weight: 1.5 },
        { from: 3, to: 4, weight: 1 },
        { from: 4, to: 3, weight: 0.35 },
        { from: 3, to: 5, weight: 0.7 },
        { from: 5, to: 4, weight: 1.5 },
        { from: 1, to: 3, weight: 1, bridge: true },
        { from: 4, to: 0, weight: 0.35, bridge: true },
      ],
    };
  const nodes =
    motif === 'inhibition'
      ? [node('A', 90, 90), node('B', 310, 90), node('I', 200, 220, true)]
      : [node('A', 100, 130), node('B', 310, 130), node('C', 520, 130)];
  return {
    nodes,
    edges:
      motif === 'inhibition'
        ? [
            { from: 0, to: 1, weight: 1 },
            { from: 0, to: 2, weight: 1 },
            { from: 2, to: 1, weight: 1.5 },
          ]
        : [
            { from: 0, to: 1, weight: 1 },
            { from: 1, to: 2, weight: 1 },
            ...(motif === 'feedback' ? [{ from: 2, to: 0, weight: 0.65 }] : []),
          ],
  };
}
export function validateLabInput(input: unknown): Partial<LabParameters> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw Error('Expected a parameter object.');
  const limits: Record<string, number[]> = {
    current: [0, 20],
    tau: [5, 40],
    sodium: [0, 160],
    potassium: [0, 72],
    coupling: [0, 2],
    bridge: [0, 2],
  };
  const enums: Record<string, string[]> = {
    model: ['lif', 'hh'],
    motif: ['chain', 'feedback', 'inhibition', 'modules'],
    stimulus: ['step', 'pulse', 'pair'],
  };
  for (const [key, value] of Object.entries(input)) {
    if (limits[key]) {
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < limits[key][0] ||
        value > limits[key][1]
      )
        throw Error(`Invalid ${key}. Expected ${limits[key].join(' to ')}.`);
    } else if (
      !enums[key] ||
      typeof value !== 'string' ||
      !enums[key].includes(value)
    )
      throw Error(`Invalid parameter: ${key}.`);
  }
  return input as Partial<LabParameters>;
}
export function labInput(t: number, p: LabParameters) {
  const active =
    p.stimulus === 'step'
      ? t >= 20 && t < 120
      : p.stimulus === 'pulse'
        ? t >= 20 && t < 25
        : (t >= 20 && t < 25) || (t >= 30 && t < 35);
  return active ? p.current : 0;
}
export interface LabTrace {
  time: number[];
  voltage: number[][];
  displayVoltage: number[][];
  spikes: number[][];
  input: number[];
  gates: number[][];
  currents: { leak: number[]; sodium: number[]; potassium: number[] };
  synapticCurrent: number[][];
  conductanceE: number[][];
  conductanceI: number[][];
}
/** Deterministic, one-compartment teaching model. No connectome data or fitted fly parameters. */
export function simulateLab(
  p: LabParameters,
  model: LabModel,
  network = false,
  dt: number = labConstants.dt,
): LabTrace {
  validateLabInput(p);
  if (!['lif', 'hh'].includes(model)) throw Error('Unknown neuron model.');
  const sampleSteps = Math.round(labConstants.sampleInterval / dt);
  if (
    dt <= 0 ||
    dt > 0.05 ||
    Math.abs(sampleSteps * dt - labConstants.sampleInterval) > 1e-8
  )
    throw Error('Invalid integration step.');
  const graph = network
    ? labGraph(p.motif)
    : {
        nodes: [{ name: 'cell', inhibitory: false, x: 0, y: 0, module: 0 }],
        edges: [],
      };
  const N = graph.nodes.length,
    steps = Math.round(labConstants.duration / dt),
    delaySteps = Math.round(labConstants.delay / dt);
  const arrays = () => Array.from({ length: N }, () => [] as number[]);
  const out: LabTrace = {
    time: [],
    voltage: arrays(),
    displayVoltage: arrays(),
    spikes: arrays(),
    input: [],
    gates: [[], [], []],
    currents: { leak: [], sodium: [], potassium: [] },
    synapticCurrent: arrays(),
    conductanceE: arrays(),
    conductanceI: arrays(),
  };
  const v = new Float64Array(N).fill(-65),
    refrac = new Float64Array(N),
    release = new Float64Array(N),
    fired = new Uint8Array(N);
  const r0 = rates(-65);
  const m = new Float64Array(N).fill(r0[0] / (r0[0] + r0[1])),
    h = new Float64Array(N).fill(r0[2] / (r0[2] + r0[3])),
    n = new Float64Array(N).fill(r0[4] / (r0[4] + r0[5]));
  const queue = Array.from(
    { length: delaySteps + 1 },
    () => new Float64Array(N),
  );
  const ge = new Float64Array(N),
    gi = new Float64Array(N);
  const gate = (x: number, a: number, b: number) =>
    a / (a + b) + (x - a / (a + b)) * Math.exp(-(a + b) * dt);
  const sample = (t: number) => {
    out.time.push(Number(t.toFixed(6)));
    out.input.push(labInput(t, p));
    for (let i = 0; i < N; i++) {
      out.voltage[i].push(v[i]);
      out.displayVoltage[i].push(model === 'lif' && fired[i] ? 30 : v[i]);
      fired[i] = 0;
      out.conductanceE[i].push(ge[i]);
      out.conductanceI[i].push(gi[i]);
      out.synapticCurrent[i].push(ge[i] * (0 - v[i]) + gi[i] * (-80 - v[i]));
    }
    out.gates[0].push(m[0]);
    out.gates[1].push(h[0]);
    out.gates[2].push(n[0]);
    out.currents.leak.push(
      model === 'lif' ? (v[0] + 65) / p.tau : 0.3 * (v[0] + 54.4),
    );
    out.currents.sodium.push(
      model === 'hh' ? p.sodium * m[0] ** 3 * h[0] * (v[0] - 50) : 0,
    );
    out.currents.potassium.push(
      model === 'hh' ? p.potassium * n[0] ** 4 * (v[0] + 77) : 0,
    );
  };
  sample(0);
  for (let step = 0; step < steps; step++) {
    const t = step * dt,
      slot = queue[step % queue.length];
    for (let i = 0; i < N; i++) {
      release[i] *= Math.exp(-dt / (graph.nodes[i].inhibitory ? 10 : 5));
      release[i] += slot[i];
      slot[i] = 0;
    }
    ge.fill(0);
    gi.fill(0);
    for (const e of graph.edges) {
      const g =
        labConstants.synapticScale *
        p.coupling *
        e.weight *
        (e.bridge ? p.bridge : 1) *
        release[e.from];
      (graph.nodes[e.from].inhibitory ? gi : ge)[e.to] += g;
    }
    for (let i = 0; i < N; i++) {
      const input = i === 0 ? labInput(t, p) : 0,
        old = v[i];
      if (model === 'lif') {
        if (refrac[i] > 1e-8) {
          refrac[i] -= dt;
          v[i] = -65;
          continue;
        }
        const leak = 1 / p.tau,
          g = leak + ge[i] + gi[i],
          equilibrium = (-65 * leak - 80 * gi[i] + input) / g;
        v[i] = equilibrium + (v[i] - equilibrium) * Math.exp(-g * dt);
      } else {
        const r = rates(v[i]);
        m[i] = gate(m[i], r[0], r[1]);
        h[i] = gate(h[i], r[2], r[3]);
        n[i] = gate(n[i], r[4], r[5]);
        const na = p.sodium * m[i] ** 3 * h[i],
          k = p.potassium * n[i] ** 4,
          g = na + k + 0.3 + ge[i] + gi[i];
        const equilibrium =
          (50 * na - 77 * k - 54.4 * 0.3 - 80 * gi[i] + input) / g;
        v[i] = equilibrium + (v[i] - equilibrium) * Math.exp(-g * dt);
      }
      if (model === 'lif' ? v[i] >= -50 : old < 0 && v[i] >= 0) {
        out.spikes[i].push(Number(((step + 1) * dt).toFixed(6)));
        fired[i] = 1;
        // The event is at the end of this step; delivery begins exactly one delay later.
        queue[(step + 1 + delaySteps) % queue.length][i] += 1;
        if (model === 'lif') {
          v[i] = -65;
          refrac[i] = 2;
        }
      }
    }
    if ((step + 1) % sampleSteps === 0) sample((step + 1) * dt);
  }
  return out;
}
