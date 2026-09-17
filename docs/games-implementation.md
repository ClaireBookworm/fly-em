# Playable experiments — 9 September 2026

The first three concepts from `playable-neuroscience-concepts.md` are implemented as local routes. Navigation links connect them with the existing lab, neuron lesson and embodied experience.

## Circuit garden — `/games/garden`

An editable circuit of up to 12 current-based LIF cells. Adding a cell connects it downstream of the selected cell; selecting a source and destination toggles an additional edge. Cells can be excitatory or inhibitory. Users select the injection target and inspect a synchronized voltage trace, current balance and spike-triggered propagation.

The selected neuron can be deleted, removing its incident edges. Surviving cells retain stable IDs and letters; an empty garden can be rebuilt. Playback clamps both animation-frame deltas and sample indices, preventing an early first-frame timestamp from selecting an undefined negative-time sample. Regression tests cover stimulating C, deletion of intermediate and pulse-source cells, and rebuilding after all cells are removed.

The garden now draws schematic dendritic branches, somata and curved axons. Signal markers follow the same 2 ms connection delay as the numerical model; visible cell flashes and arrival rings linger for 8 ms. The geometry does not introduce compartments, propagation-distance effects, or anatomical reconstructions.

The model is in `lib/games.ts`. Explicit teaching parameters: rest/reset −65 mV, threshold −50 mV, membrane time constant 20 ms, input resistance 100 MΩ, 3 ms refractory period, 2 ms synaptic delay, 8 ms synaptic-current decay, 1 ms integration step. Single input pulse 40–75 ms; optional second pulse 170–205 ms. With temporary weakening enabled, each event consumes 35% of an available resource that recovers over 160 ms. Disabling that option keeps efficacy constant; it does not block replenishment while continuing depletion.

The displayed 20 mV spike peak is an event marker, not an integrated action-potential waveform. The inspector explicitly reports reset when the cursor falls on an event. Outgoing sign changes synaptic current, not the spike event itself. The sandbox is not fitted to biological cells.

The experimental challenge uses **real calcium-derived summary measurements** from Yamamoto et al. (2023), _Modular architecture facilitates noise-driven control of synchrony in neuronal networks_, DOI 10.1126/sciadv.ade1755. Source: https://doi.gin.g-node.org/10.12751/g-node.t77b3p/ (CC BY-NC 4.0). Import command:

```
work/embodiment/.venv-model/bin/python scripts/export-culture-challenge.py /path/to/processed.zip
```

Archive URL: https://gin.g-node.org/doi/stimulating_modular_cultures/raw/master/dat/experiments/processed.zip

The import selects `data/df_trials` from `processed/1b.hdf5`, `3b.hdf5`, and `merged.hdf5`. It exports the authors' `Median Fraction` and `Median Neuron Correlation` by culture/condition, preserving culture IDs and paired observations. There are 8, 7 and 7 cultures respectively. The main plot shows paired median burst-participation fractions before and during stimulation, with descriptive group medians. It does not present raw spikes, voltage, or a statistical significance claim. HDF5 object decoding permits only the numpy classes required to reconstruct the archived arrays.

## Wiring comparison — `/games/wiring`

Browser-computed binary motion classification. A noisy bright dot moves left or right over 12 input sensors for 24 frames. Training and test clips vary location, travel distance, contrast and noise. A linear ridge readout is trained on 96 balanced movies; 48 independently seeded movies are tested. The interactive demo movie uses a third seed range.

Model 1 uses an induced graph of the 32 highest total-contact neurons in the bundled MaleCNS heading extract: 465 directed edges. Export with `node scripts/export-game-wiring.mjs`. This is a small anatomical graph, not the complete connectome. Model 2 shuffles every matrix entry, retaining weight values but not degrees, per-cell transmitter consistency, or original self-connection structure. Model 3 receives only movie features, without recurrent cells.

Anatomical contact counts become signed `log1p(count)` weights under an explicit transmitter-sign assumption. Both matrices receive a shared scaling factor that bounds their maximum absolute row sum by 0.85. Input projection is identical between recurrent models. Graded dynamics: `x_next = 0.65*x + 0.35*tanh(W*x + P*input)`. Four temporal averages produce features. A direct movie-feature cable is optional for both recurrent models and always supplies the movie-only baseline. Decoder normalization is fitted on training data only; ridge penalty is 4.

Scores are calculated, not scripted. The default easy task can be solved by all three, including the input-only decoder. This establishes no special benefit of anatomical wiring on this task, and no universal result about connectome models. Displayed activity is continuous activation in arbitrary units, not spikes or membrane voltage.

The player guesses the anatomical model before revealing identities. Unit inspection, four-unit or all-unit silencing with a frozen original decoder, and retraining with silenced units are implemented. Selection of four units uses the aggregate magnitude of standardized readout coefficients over the four temporal windows. It is an implementation importance heuristic, not a biological attribution. Repeated test-set inspection makes this exploratory; no confirmatory significance claim is made.

## Face-code prototype — `/games/faces`

A four-feature schematic stimulus model inspired by Chang & Tsao (2017), DOI 10.1016/j.cell.2017.05.011. Four invented independent encoding axes map eye spacing, face width, nose length and mouth width to predicted response rates. A geometric projection constructs changes that preserve all watched responses. With all four independent axes watched, there is no remaining null direction in this noiseless four-dimensional example.

The game's stimulus graphics are parameterized diagrams, not the study's photographs. Its simulation contains no raw monkey recordings, fitted coefficients or biological connectome. A separate original-paper movie is now embedded as research context, with recorded spikes presented as clicks. The page distinguishes this from the game. It does not render reconstructed subjective experience or invented trial-level electrophysiology.

## Original research media

Each game includes an original-paper media section. Editorial choices and captions are centralized in `content/game-research.ts`; assets and exact provenance are documented in `public/data/games/research/README.md`. Garden uses Yamamoto et al. Figure 1, wiring uses Hulse et al. Figure 16, and Face code streams Chang & Tsao Movie S2 from CaltechAUTHORS. Figures can be enlarged; source links remain available if media fails. The video has a descriptive caption track and does not autoplay. It is a 24-second movie with an audio stream, verified with ffprobe. No expiring redirected URL is stored.

## Digital Sphinx — opening on `/embodied`

An interactive five-step explanation surrounds the original paper video: movement, model activity, worm anatomy, trained interface, and an experimental next step. The interface diagram is selectable. The final stage links into the wiring game; the existing visual and motor explanations remain below it.

Source: https://elifesciences.org/reviewed-preprints/111516 (reviewed preprint v1, 17 August 2026). Stable publisher media endpoint: https://prod--epp.elifesciences.org/api/files/111516/v1/content/supplements/713233_file02.mp4

The video is embedded remotely and has a publisher-page fallback. On 9 September, a partial GET returned 206; ffprobe identified one video stream, no audio stream, and duration 10.44 seconds. No expiring redirected URL is saved. The page does not run the trained Digital Sphinx controller or simulate new perturbations of it.

## Validation and local preview

All 40 model/data tests passed, including playback boundaries, deletion, causal delay, inhibition blockade, stable dynamics, face null-space constraints, actual decoder training, all-unit silencing, and archived experimental values. TypeScript, lint and the production build also passed. The local garden route returned HTTP 200. No browser interaction or screenshot QA was requested or performed.

Local development remains on port 3001. Vite file watching excludes research environments in `work`, generated output, and local Wrangler state; scanning these large directories had stalled restarts. The code is not published as part of this local editing task.
