# /learn: emulation, from one neuron upward

Working brief from the September 17, 2026 discussion. Implemented after the user asked to make this first round of changes. The notes below preserve the scientific rationale and source provenance.

## Accepted direction

- Organizing question: what is involved in emulating something, what must be specified, and how would we know the emulation worked?
- Begin with biological electrophysiology: focus on a single-neuron action potential, situate it alongside a compound response and scalp EEG, then return to one cell.
- Introduce the scope and a short table of contents before building the models. The larger progression is neuron → circuit → brain.
- Compare simple and more detailed models by the behavior they explain, assumptions and parameters they require, computational cost, and agreement with recordings. Complexity is not a universal accuracy ranking.
- Make the interactions biologically clearer and more exploratory than fixed one-pulse/two-pulse replays.
- Put directly editable values in important equations, linked to the membrane visual and output.
- Find actual paired injected-current / measured-voltage data.

“Compound spike” is implemented explicitly as a compound action potential from multiple nerve fibers. This is distinct from a complex spike or burst from one neuron. The user has not yet clarified a different intended meaning.

## Proposed lesson sequence

1. What we measure: electrode location, units and timescale beside each recording. Keep the single-cell response dominant. EEG is a population field measurement, not a magnified single-cell voltage or a complete readout of all brain activity.
2. The emulation challenge: replay a known injected current and predict the recorded voltage / spike times. Distinguish measured input, biological response and simulated prediction with stable labels and colors.
3. LIF: membrane capacitance, leak, current balance, then the explicitly separate spike-event/reset rule.
4. Optional AdEx middle step: add adaptation when a recording motivates it; do not promise a universal “three most trusted models” ranking.
5. HH: show what channel dynamics add, how a waveform emerges, and which details remain assumptions. Classic squid parameters are teaching parameters, not a fit to the Allen mouse cell or fly anatomy.
6. Test on another stimulus/trial; show fit and evaluation data separately. Evaluate firing timing, subthreshold voltage, adaptation and waveform only where the model represents them.
7. What connecting cells adds: synapses, signs, strength, delays and inputs. Carry the same emulation question into circuits and later brain-scale work.

## Equation and interaction design

Use C dV/dt = I(t) − gL(V − EL), with editable physical parameters next to their symbols and persistent units.

- C: charge-storage capacity; show how it changes response speed.
- gL: leak conductance; show the return toward the leak reversal potential and the changed steady-state response.
- I(t): stimulus amplitude, duration and timing; display its waveform on an aligned axis under voltage.
- Derive τ = C/gL and R = 1/gL rather than providing contradictory independent controls.
- Keep EL and the threshold/reset rule visually distinct. Explain dV/dt as the rate of voltage change.
- Use whole-cell units (pA, pF, nS) for comparison to measured current. The existing teaching simulator uses current/conductance densities. Conversion requires an explicit area assumption or a consistent whole-cell parameterization.
- Draggable number controls also need keyboard arrows and direct numeric entry, bounded values, reset, and visible focus. Dragging should be optional.
- Link each equation term by color to the corresponding circuit component and current. Update equation values, membrane state, and traces from one simulation result.
- Keep a previous trace available for comparison. Show the recalculated response immediately; playback is an optional explanatory view rather than a required wait after every adjustment.

Replace the fixed two-input replay with a timing experiment: drag the second pulse, adjust its amplitude, and find when the combined input first triggers an event. Label these as injected current pulses. A synaptic-input version should use an explicitly modeled conductance time course, not relabel rectangular current as neurotransmission.

For HH, guide one spike through rest, rise, fall and recovery, with channel activation/inactivation and the trace synchronized. Illustrative ion motion must be distinguished from simulated single-ion trajectories. Blocking sodium changes HH's mechanism; the LIF comparison has no sodium parameter to block.

## Verified paired recording candidate

Allen Cell Types Database, specimen **464212183**, `Sst-IRES-Cre;Ai14-165865.05.02.01`.

- Public API metadata verified September 17, 2026: mouse, primary visual area layer 5, Sst-IRES-Cre, aspiny; 102 sweep metadata records.
- Stimuli include short steps, long steps, triple short steps, ramps, and Noise 1/Noise 2 trials.
- Sweep 12 is labeled Short Square and has one detected spike; metadata stimulus duration approximately 3 ms. Sweep 16 is another one-spike Short Square trial.
- Sweep 48 has one detected spike under a two-second step; sweep 54 has 67. These are metadata observations, not yet a quality review of the waveforms.
- Use raw NWB stimulus/response arrays and their conversion factors to establish units; do not infer them from ambiguous amplitude fields in the API metadata.
- The source also lists GLIF and biophysical models and a dendritic reconstruction, useful for later investigation but not substitutes for verifying a fitted comparison.
- NWB file ID **491202878**, HEAD request verified HTTP 200 and 61,980,832 bytes. Its original download filename is `464212181_ephys.nwb`; the specimen-to-file mapping is confirmed by the API.
- Raw file downloaded to `/tmp/fly-em-464212183-ephys.nwb` and inspected. Sweep 12 contains paired 304,601-sample current/voltage arrays at 200 kHz; stored units Amps/Volts, both conversion factors 1. In the 1.000–1.070 s window, current ranges from 0 to 380 pA and voltage from −65.59 to +17.66 mV; voltage peaks at 1.02365 s. This verifies a usable single-spike candidate, but full waveform QA and fitting remain to be done.

Sources:

- [Official paired stimulus/response access example](https://allensdk.readthedocs.io/en/stable/_static/examples/nb/cell_types.html)
- [NWB contents and units](https://alleninstitute.github.io/AllenSDK/cell_types.html)
- [Raw NWB download](https://api.brain-map.org/api/v2/well_known_file_download/491202878)
- [API query implementation](https://alleninstitute.github.io/AllenSDK/_modules/allensdk/api/queries/cell_types_api.html)
- [Allen terms](https://alleninstitute.org/terms-of-use/) and [citation policy](https://alleninstitute.org/citation-policy/): preserve attribution and noncommercial-use conditions in any extracted-data provenance.

This is a verified paired-data candidate, not yet a fitted or validated model/recording pair. Before shipping, visually inspect raw traces, select the remaining sweeps, preserve timing and acquisition details, and document transformations. Label the biological cell as mouse; do not imply it is the fly reconstruction currently shown at the top of /learn.

## EEG source

[PhysioNet EEG Motor Movement/Imagery Dataset v1.0.0](https://physionet.org/content/eegmmidb/1.0.0/) provides 64-channel scalp EEG at 160 Hz, including eyes-open and eyes-closed baseline recordings. A short baseline segment is a candidate for the introductory measurement comparison. License: Open Data Commons Attribution License v1.0; retain dataset and original-publication citations. This is a separate human recording, not simultaneously recorded with the mouse single-cell dataset.

## Implemented first pass

- Actual single-cell, nerve-bundle and scalp recordings open the page, with electrode diagrams, units, species and source processing beside them.
- Allen sweeps 12, 16, 27 and 30 supply paired current/voltage excerpts. The exporter retains every tenth sample (20 kHz), converts A/V to pA/mV, and shifts the displayed time origin to the excerpt start. No smoothing or additional baseline correction is applied.
- PhysioNet S001R01 Cz, eyes open, 10–14 s is shown in calibrated µV at the original 160 Hz.
- The nerve example is a released stimulus-triggered average from Nanivadekar et al. (2020), Pennsieve dataset 38 version 3, DOI https://doi.org/10.26275/MGUQ-J2N3 (CC BY 4.0). File: `files/Electro/session_20/STA_recruitment/Electro_ssn020_blk090_ch001_a15.0_Cmn_Per.data.mat`. Use `avg_wf` and the 30 kHz `mdf_metadata/fs`; retain samples 30–460. Because physical voltage units are not unambiguously specified in the file, divide by the maximum absolute retained amplitude and explicitly label normalized amplitude. Time is relative to the released waveform start, not an inferred stimulus trigger.
- The membrane equation has draggable, typed and keyboard-accessible capacitance, current and leak values; linked electrical equivalent and current balance; a two-pulse timing experiment; and an optional pinned response.
- HH has rest/rise/fall/recovery inspection and sodium block. Classic squid parameters remain teaching parameters, not a fitted mouse or fly model.
- Model comparison replays identical measured current through LIF and HH. It distinguishes measured cell properties, inferred capacitance/area and assumed parameters. It is an unfitted comparison, not validation. AdEx is explanatory optional material, not a third implemented solver.
- Full traces are available immediately. Playback only moves the inspection cursor. The circuit section adds questions and event counts while preserving its existing motifs and bridge experiment.
- Numerical tests cover passive RC behavior, input timing, physical units and admitted parameter bounds. Browser checks cover keyboard/typed controls and responsive layout.

Data and transformation metadata are bundled in `public/data/learn/`. Regenerate with `python3 scripts/export-learn-recordings.py <allen.nwb> <S001R01.edf> <compound.data.mat>` using NumPy and `h5dump`.

A later round could fit parameters on training sweeps and evaluate held-out sweeps. The present page intentionally makes no fitted-model or universal compute-ratio claim.

## Visual and wording revision

The opening now presents a scroll-linked, manually rotatable 3D projection of an actual simplified MaleCNS E-PG skeleton. XYZ geometry is retained; depth affects line color. The opening explicitly separates anatomy from physiological response and then leads to the experimental recordings. Rotation is also available through buttons, and chapter navigation respects reduced-motion preference.

The recording panel includes credited CA1 patch-clamp microscopy from Wikimedia Commons (see `public/images/learn/ATTRIBUTION.md`), distinct from the Allen visual-cortex recording. The electrical schematic remains available in the image disclosure.

“Edit wording” enables a temporary local drafting mode. Headings and narrative paragraphs become selectable; the side panel changes plain text only. Browser storage `fly-em-learn-copy-v1` retains changes on that origin, and Download edits exports JSON containing each passage's stable ID, original text, and replacement. It does not update the published source or other visitors' text. Citations and live simulation controls continue to work outside editing mode. Restore this passage discards one override. Storage failures explicitly request a download. Draft changes were verified across navigation and restoration in the browser.
