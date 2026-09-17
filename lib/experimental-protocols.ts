import type { CircuitKey, ModelKey, Settings } from './simulation';
export interface Protocol {
  source: string;
  sourceLabel: string;
  rows: [string, string][];
  missing: string;
  comparison: string;
}
export const experimentalProtocols: Record<CircuitKey, Protocol> = {
  motion: {
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8891015/',
    sourceLabel: 'Methods; Figure 4a; Extended Data Figure 9',
    rows: [
      [
        'Cell / preparation',
        'T4; in vivo whole-cell current clamp; female flies 2–24 h after eclosion.',
      ],
      ['Temperature', '21–23°C (recording temperature).'],
      [
        'Stimulus',
        'ON edges moving at 30°/s, preferred and null direction in the displayed traces.',
      ],
      [
        'Acquisition → displayed data',
        '10 kHz acquisition; 1 kHz current-clamp analysis after alignment; published mean ± SEM exported every 10 ms (100 Hz), 0–2.99 s.',
      ],
      [
        'Voltage correction',
        'Liquid-junction potential corrected in the source analysis.',
      ],
      [
        'Input resistance assay',
        'Repeated visual trials differing by −1 pA holding current; Rin(t) = ΔVm(t)/ΔI.',
      ],
    ],
    missing:
      'The displayed Figure 4a data do not provide a matched per-cell capacitance, membrane time constant, or sodium/potassium channel kinetics. A voltage trace alone does not identify these parameters.',
    comparison:
      'Both panels use mV, so baseline, response shape and timing can be examined qualitatively. Quantitative comparison needs the same cell type, visual stimulus and input mapping. The current soma-ordered drive is not a measured receptive field. The graded model is also much simpler than the paper’s T4 conductance model.',
  },
  heading: {
    source: 'https://doi.org/10.25378/janelia.12490274',
    sourceLabel: 'Released TwoColor MAT trial and author analysis',
    rows: [
      [
        'Cells / measurement',
        'GCaMP6f in E-PG; jRGECO in Δ7. Two-color calcium fluorescence from one fly, one visual-stripe trial.',
      ],
      [
        'Displayed signal',
        'Released GROIaveMax / RROIaveMax minus 1; no additional temporal smoothing. Lines show bridge ROI 4.',
      ],
      [
        'Spatial / temporal sampling',
        '18 bridge ROIs; 14 planes per volume; 750 volumes at approximately 6.1 volumes/s over about 122.5 s.',
      ],
      [
        'Clock vs. neural sampling',
        '10 kHz refers to the frame-trigger clock used to recover timestamps, not the calcium volume rate.',
      ],
      [
        'Cell identity',
        'ROIs pool fluorescence; they are not individual neurons matched to the MaleCNS body IDs.',
      ],
    ],
    missing:
      'This fluorescence trial does not give Vrest, capacitance, input resistance, membrane τ, or ionic conductances. Those must come from separate physiology or a constrained fit; they cannot be read directly from ΔF/F.',
    comparison:
      'A fluorescence curve cannot be overlaid directly on mV or spikes. First predict calcium and indicator fluorescence, average over comparable ROIs and match the stimulus and sampling. Compare bump position, width, stability and cue tracking. This demo has no fitted indicator model.',
  },
  escape: {
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9849133/',
    sourceLabel: 'Whole-cell methods; Extended Data Figure 4',
    rows: [
      [
        'Cell / measurement',
        'Giant-fiber (DNp01) whole-cell current-clamp recordings; representative voltage traces in the linked figure.',
      ],
      [
        'Stimulus',
        'Three disks, each expanding 0°→30° at 500°/s (60 ms); array azimuths 32.5°, 45°, 57.5° and 70°.',
      ],
      [
        'Acquisition',
        'MultiClamp 700B; low-pass filtered at 10 kHz, digitized at 40 kHz.',
      ],
      [
        'Response metric',
        'Trial-averaged evoked voltage integrated over the 150 ms after stimulus onset; 4–8 trials per neuron in the methods.',
      ],
      [
        'Data actually loaded',
        'Publisher’s figure plus a workbook of integrated GF responses. Raw voltage samples are not in this downloaded table.',
      ],
    ],
    missing:
      'The displayed figure and response table do not identify a matched capacitance, leak conductance, sodium/potassium kinetics or membrane time constant for the simulated body ID.',
    comparison:
      'The experimental GF depolarized without detected action potentials in this disk-array assay. That does not mean GF never spikes. Our abstract looming drive differs from this stimulus, so a different trace is not by itself a validation failure. A numerical comparison needs the original voltage vectors and matched stimulus geometry.',
  },
};
export function currentModelRows(
  model: ModelKey,
  p: Settings,
): [string, string][] {
  const input = `${p.drive.toFixed(2)}× external drive`,
    coupling = `${p.gain.toFixed(2)}× synaptic coupling`;
  const common: [string, string][] = [
    ['Current settings', `${input}; ${coupling}.`],
    [
      'Initial voltage',
      p.randomInitial
        ? `Uniform −71 to −59 mV, seeded (${p.seed}).`
        : '−65 mV for every modeled cell.',
    ],
    [
      'Wiring / omissions',
      `${p.wiring}; contacts ≥ ${p.minContacts}; ${(p.dropout * 100).toFixed(0)}% random edge dropout; silenced type: ${p.silencedType}.`,
    ],
  ];
  if (model === 'lif')
    return [
      ...common,
      [
        'Membrane / event',
        'τm 20 ms; EL and reset −65 mV; threshold −50 mV; refractory 2 ms. No measured capacitance or resistance is assigned.',
      ],
      [
        'Drive conversion',
        '20 dV/dt = −65 − V + 24u + 35q (V in mV, t in ms). u = abstract stimulus × drive; q = signed network input × coupling.',
      ],
      [
        'Spike display / integration',
        'Threshold events get an artificial 30 mV marker; dt = 0.1 ms; plotted samples every 1 ms.',
      ],
    ];
  if (model === 'hh')
    return [
      ...common,
      [
        'Capacitance / conductances',
        'C = 1 µF/cm²; ḡNa = 120, ḡK = 36, gL = 0.3 mS/cm². Classic squid parameters; same for every cell.',
      ],
      [
        'Reversals / kinetics',
        'ENa = +50, EK = −77, EL = −54.4 mV; classic 6.3°C gate rates, not fitted fly channels.',
      ],
      [
        'Drive conversion',
        'I = 10u + 18q µA/cm². u = abstract stimulus × drive; q = signed network input × coupling.',
      ],
      [
        'Readout / integration',
        'Upward crossings of 0 mV counted as spikes; no reset. dt = 0.025 ms; plot interval 1 ms.',
      ],
    ];
  return [
    ...common,
    [
      'Passive membrane',
      'C = 1 in the model’s normalization; gL = 0.05 (passive τ = 20 ms). EL = −65, Eexc = 0, Einh = −75 mV.',
    ],
    [
      'Input conductances',
      'gexc = 0.065u + 0.05 max(q,0); ginh = 0.05 max(−q,0). u = stimulus × drive; q = signed network input × coupling.',
    ],
    [
      'Release / integration',
      'Continuous release clip((V + 65)/35, 0, 1); no spike threshold. dt = 0.1 ms; plotted every 1 ms.',
    ],
  ];
}
