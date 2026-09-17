import { rates } from './simulation.ts';

/** Whole-cell units: pF · mV/ms = pA, nS · mV = pA. */
export interface MembraneParameters {
  capacitance: number;
  leak: number;
  rest: number;
  threshold: number;
  amplitude: number;
  gap: number;
}
export const membraneDefaults: MembraneParameters = {
  capacitance: 100,
  leak: 5,
  rest: -65,
  threshold: -50,
  amplitude: 220,
  gap: 10,
};
export interface MembraneRun {
  time: number[];
  voltage: number[];
  input: number[];
  spikes: number[];
}
export function pairedPulse(t: number, p: MembraneParameters) {
  return (
    p.amplitude *
    (Number(t >= 10 && t < 15) + Number(t >= 10 + p.gap && t < 15 + p.gap))
  );
}
export function simulateMembrane(
  p: MembraneParameters,
  input: (t: number) => number = (t) => pairedPulse(t, p),
  duration = 100,
  model: 'lif' | 'hh' = 'lif',
  initial = p.rest,
): MembraneRun {
  if (
    !Object.values(p).every(Number.isFinite) ||
    p.capacitance <= 0 ||
    p.leak <= 0 ||
    duration <= 0 ||
    duration > 3000
  )
    throw new Error('Invalid membrane parameters.');
  const dt = 0.025,
    stride = 4;
  const out: MembraneRun = {
    time: [0],
    voltage: [initial],
    input: [input(0)],
    spikes: [],
  };
  let v = initial,
    refractory = 0;
  const r0 = rates(initial);
  let m = r0[0] / (r0[0] + r0[1]),
    h = r0[2] / (r0[2] + r0[3]),
    n = r0[4] / (r0[4] + r0[5]);
  const gate = (x: number, a: number, b: number) =>
    a / (a + b) + (x - a / (a + b)) * Math.exp(-(a + b) * dt);
  for (let step = 0; step < Math.round(duration / dt); step++) {
    const t = step * dt,
      old = v,
      current = input(t);
    if (model === 'lif') {
      if (refractory > 1e-8) {
        refractory -= dt;
        v = p.rest;
      } else {
        const equilibrium = p.rest + current / p.leak;
        v =
          equilibrium +
          (v - equilibrium) * Math.exp((-dt * p.leak) / p.capacitance);
        if (v >= p.threshold) {
          out.spikes.push((step + 1) * dt);
          v = p.rest;
          refractory = 2;
        }
      }
    } else {
      const r = rates(v);
      m = gate(m, r[0], r[1]);
      h = gate(h, r[2], r[3]);
      n = gate(n, r[4], r[5]);
      // Effective membrane area inferred from C and the classic 1 µF/cm² density.
      // Therefore I_density [µA/cm²] = I_whole [pA] / C_whole [pF].
      const na = 120 * m ** 3 * h,
        k = 36 * n ** 4,
        g = na + k + 0.3;
      const equilibrium =
        (50 * na - 77 * k - 54.4 * 0.3 + current / p.capacitance) / g;
      v = equilibrium + (v - equilibrium) * Math.exp(-g * dt);
      if (old < 0 && v >= 0) out.spikes.push((step + 1) * dt);
    }
    if ((step + 1) % stride === 0) {
      const sampleTime = Number(((step + 1) * dt).toFixed(4));
      out.time.push(sampleTime);
      out.voltage.push(v);
      out.input.push(input(sampleTime));
    }
  }
  return out;
}
