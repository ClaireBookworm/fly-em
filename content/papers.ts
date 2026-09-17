import type { CircuitKey } from '@/lib/simulation';
export const papers: Record<
  CircuitKey,
  {
    author: string;
    title: string;
    url: string;
    circuit: string;
    function: string;
    methods: string;
    output: string;
    scope: string;
    quote: string;
  }
> = {
  escape: {
    author: 'Dombrovski et al. · 2023',
    title: 'Synaptic gradients transform object location to action',
    url: 'https://doi.org/10.1038/s41586-022-05562-8',
    circuit: 'Looming escape',
    function:
      'LC4 and LPLC2 relay approaching-object signals toward descending neurons, including the giant fiber, which can trigger fast escape.',
    methods:
      'EM connectivity, whole-cell voltage recordings, targeted neuron activation and high-speed behavior measurements.',
    output:
      'Here: the published giant-fiber voltage figure. Its source table contains integrated responses, not raw voltage samples.',
    scope:
      'The paper studies several descending pathways. This extract keeps a subset of LC4/LPLC2 inputs to the giant fiber; it does not reproduce the full directional-escape circuit.',
    quote:
      'synaptic weight gradients of VPN outputs onto central brain neurons',
  },
  heading: {
    author: 'Turner-Evans et al. · 2020',
    title:
      'The neuroanatomical ultrastructure and function of a biological ring attractor',
    url: 'https://doi.org/10.1016/j.neuron.2020.08.006',
    circuit: 'Internal compass',
    function:
      'E-PG cells represent heading. P-EN cells help update that representation during turns; Δ7 cells contribute interactions across the compass network.',
    methods:
      'EM circuit reconstruction, RNA profiling and functional calcium imaging with circuit manipulations.',
    output:
      'Here: one visual stripe trial with E-PG and Δ7 fluorescence, sampled at about 6.1 volumes/s. The 18 E-PG regions are spatial measurements, not 18 spike trains.',
    scope:
      'The extract retains EPG, PEN_a, PEN_b and Delta7 types from MaleCNS. Fluorescence regions are not matched to these individual cells.',
    quote: 'maintain the HD representation in darkness',
  },
  motion: {
    author: 'Groschner et al. · 2022',
    title: 'A biophysical account of multiplication by a single neuron',
    url: 'https://doi.org/10.1038/s41586-022-04428-3',
    circuit: 'Visual motion',
    function:
      'T4 combines spatially offset visual inputs to favor one direction of moving bright edges. Excitation and release from inhibition can interact nonlinearly.',
    methods:
      'Whole-cell electrophysiology, pharmacology, GluClα knockdown, conductance modeling and behavioral measurements.',
    output:
      'Here: Fig. 4a source data, mean membrane voltage with SEM at 10 ms spacing. These are averaged voltage responses, not raw single-trial spike trains.',
    scope:
      'The paper examines T4. The anatomical extract includes T4a and T5a with selected inputs; its T5a cells are not validated by this T4 recording.',
    quote:
      'the coincidence of cholinergic excitation and release from glutamatergic inhibition',
  },
};
export const paperImages = {
  escape:
    'https://media.springernature.com/lw685/springer-static/image/art%3A10.1038%2Fs41586-022-05562-8/MediaObjects/41586_2022_5562_Fig1_HTML.png',
  motion:
    'https://media.springernature.com/lw685/springer-static/image/art%3A10.1038%2Fs41586-022-04428-3/MediaObjects/41586_2022_4428_Fig1_HTML.png',
  conductance:
    'https://media.springernature.com/lw685/springer-static/image/art%3A10.1038%2Fs41586-022-04428-3/MediaObjects/41586_2022_4428_Fig3_HTML.png',
};
