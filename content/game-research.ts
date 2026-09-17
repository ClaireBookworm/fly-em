/** Original research media. Keep sources and distinctions beside each asset. */
export type GameResearch = {
  title: string;
  kind: 'image' | 'video';
  src: string;
  width?: number;
  height?: number;
  alt: string;
  credit: string;
  paper: string;
  original: string;
  look: string;
  measured: string;
  comparison: string;
  rights: string;
  rightsUrl?: string;
};

export const gameResearch: Record<'garden' | 'wiring' | 'faces', GameResearch> =
  {
    garden: {
      title: 'Real cells under a microscope',
      kind: 'image',
      src: '/data/games/research/yamamoto-2023-figure-1.jpg',
      width: 752,
      height: 535,
      alt: 'Yamamoto et al. Figure 1: four islands of cultured cortical neurons, fluorescence traces, and activity before, during and after light stimulation.',
      credit: 'Yamamoto et al. (2023), Science Advances · Figure 1',
      paper: 'https://doi.org/10.1126/sciadv.ade1755',
      original: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10456864/#F1',
      look: 'Panel A is a microscope image: cell bodies sit in four islands joined by thin bridges. Panel G shows calcium fluorescence during population activity.',
      measured:
        'Panel B shows fluorescence traces and inferred spike events. Light stimulates selected cells; D–F compare activity before, during and after stimulation. Fluorescence measures a calcium signal, not millivolts.',
      comparison:
        'This is the study behind the culture challenge below. The cells you build above are a teaching model, not reconstructions of these cultures.',
      rights: '© 2023 The Authors · CC BY-NC 4.0. Original figure, unchanged.',
      rightsUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
    },
    wiring: {
      title: 'What the graph’s dots stand for',
      kind: 'image',
      src: '/data/games/research/hulse-2021-figure-16.jpg',
      width: 1500,
      height: 1189,
      alt: 'Hulse et al. Figure 16: reconstructions of individual EPG neurons and their population, alongside a diagram of connections between the ellipsoid body and protocerebral bridge.',
      credit: 'Hulse, Haberkern, Franconville et al. (2021), eLife · Figure 16',
      paper: 'https://doi.org/10.7554/eLife.66039',
      original: 'https://elifesciences.org/articles/66039#fig16',
      look: 'At left, follow the branches of two EPG compass neurons, then the full population below. Black dots mark presynaptic sites. At right, the authors diagram their arrangement.',
      measured:
        'These are anatomical reconstructions from electron microscopy. The purple activity bumps at right are a schematic illustration, not a recording of neurons firing.',
      comparison:
        'This older female hemibrain study shows a cell type also present in the game’s MaleCNS extract. It is a different specimen and dataset. The game’s trained movie classifier is our experiment; this figure does not validate its activity.',
      rights:
        '© 2021 Hulse, Haberkern, Franconville et al. · CC BY 4.0. Original figure, unchanged.',
      rightsUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
    faces: {
      title: 'Listen to a recorded face cell',
      kind: 'video',
      src: 'https://authors.library.caltech.edu/records/znzhp-4j547/files/mmc2.mp4?preview=0',
      alt: 'Chang and Tsao supplementary Movie S2: changing image stimuli accompanied by clicks representing the recorded spikes of a macaque AM face-patch neuron.',
      credit: 'Chang & Tsao (2017), Cell · Movie S2',
      paper: 'https://doi.org/10.1016/j.cell.2017.05.011',
      original: 'https://authors.library.caltech.edu/records/znzhp-4j547',
      look: 'Press play with sound. The images are stimuli shown to the monkey; the clicks represent recorded spikes. This is a stimulus-and-response movie, not a microscope video of the cell.',
      measured:
        'For this stimulus set, an anterior medial (AM) face-patch cell responded sparsely to one identity across head orientations. That alone does not establish a dedicated identity detector: the paper also tests different faces engineered to preserve a cell’s response.',
      comparison:
        'This is original electrophysiology presented by the authors. Our four-cell game illustrates the geometry with invented response coefficients; it is not replaying this neuron.',
      rights:
        '© 2017 Elsevier Inc. Original supplemental movie streamed from CaltechAUTHORS; no open reuse license is asserted.',
    },
  };
