import type { CircuitKey, ModelKey, Wiring } from './simulation.ts';
export function validateConfiguration(input: unknown): {
  circuit: CircuitKey;
  model?: ModelKey;
  wiring?: Wiring;
} {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Expected an object.');
  const x = input as Record<string, unknown>;
  if (Object.keys(x).some((k) => !['circuit', 'model', 'wiring'].includes(k)))
    throw new Error('Unknown configuration field.');
  if (
    typeof x.circuit !== 'string' ||
    !['escape', 'heading', 'motion'].includes(x.circuit)
  )
    throw new Error('circuit must be escape, heading, or motion.');
  if (
    x.model !== undefined &&
    (typeof x.model !== 'string' || !['lif', 'hh', 'graded'].includes(x.model))
  )
    throw new Error('model must be lif, hh, or graded.');
  if (
    x.wiring !== undefined &&
    (typeof x.wiring !== 'string' ||
      !['recorded', 'rewired', 'shuffled'].includes(x.wiring))
  )
    throw new Error('wiring must be recorded, rewired, or shuffled.');
  return x as { circuit: CircuitKey; model?: ModelKey; wiring?: Wiring };
}
