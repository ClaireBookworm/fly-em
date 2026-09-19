# Fly Circuit Observatory

An interactive anatomy and model comparison website built around three circuits from the **MaleCNS v1.0** connectome. All files live in this project. The large original downloads and local Python environment are in `work/`, excluded from Git and the deployed website.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:3000. To make a portable static build:

```sh
npm run build
python3 -m http.server 4173 --directory dist/client
```

Open http://localhost:4173. The site has no backend, paid API dependency or external model service. The original escape physiology figure loads from Springer Nature; its source link remains available if that host is unreachable. Numerical recordings and the sampled anatomy are bundled locally.

### Deploy on Vercel

Import this repository into Vercel. `vercel.json` configures the static build in
`dist/client` and extensionless routes such as `/learn`. No API keys or
`.openai/hosting.json` file are required. The ignored `.openai` settings and Sites
plugins are used only when that local configuration exists.

Page navigation uses native HTML links because this is a static export, without
a server for React Server Component navigation or prefetch requests.

## What is included

- Orbitable, sampled whole-brain anatomy; optional ventral nerve cord context.
- Actual MaleCNS soma coordinates, simplified SWC skeletons, body IDs, consensus transmitters and directed synaptic contact counts.
- Three selectable circuit extracts: **looming escape** (82 neurons), **heading** (130 neurons), and a **visual motion patch** (84 neurons).
- LIF, classic Hodgkin–Huxley and passive graded-conductance simulations of every neuron in the selected extract. Computation runs in a dedicated browser worker.
- Single-neuron voltage plots, synthetic spike rasters or population voltage maps, playback linked to anatomical soma highlights, and JSON trace export.
- Degree-preserving directed rewiring, contact-count shuffling, edge thresholds, random edge dropout, random initial membrane potentials, seeded experiments and cell-type silencing.
- PCA of time-centered simulated voltage trajectories. This is a view of model dynamics, not evidence for a biological manifold.
- Published T4 voltage means and SEM, genuine E-PG/Delta7 calcium recordings, and the original published giant-fiber electrophysiology figure.
- Source provenance and downloadable compact datasets directly in the interface.
- `/embodied`: a synchronized NeuroMechFly/FlyVis observer replay with clickable visual cells; a two-input motion computation; a published five-motor-neuron reproduction beside recorded motor-unit events; and explicitly assumed NMJ/muscle/hinge interventions. See [provenance and reproduction details](docs/embodied-implementation.md).

## The actual data

### MaleCNS

Official release: https://male-cns.janelia.org/download/

Downloaded from `https://storage.googleapis.com/flyem-male-cns/v1.0/`:

- `connectome-data/flat-connectome/body-annotations-male-cns-v1.0-minconf-0.5.feather`
- `connectome-data/flat-connectome/body-neurotransmitters-male-cns-v1.0.feather`
- `connectome-data/flat-connectome/connectome-weights-male-cns-v1.0-minconf-0.5.feather`
- `segmentation/skeletons-malecns/skeletons-swc/{bodyId}.swc`

The full flat weight file has **151,856,684 rows including fragments**. That is not the paper’s neuron-to-neuron edge count. The website uses only edges whose endpoints belong to its explicit typed neuron selections.

Coordinates are converted from 8 nm voxels to micrometres. The background contains **13,965 soma positions** (10% stratified sample of annotated bodies with somas, seed 42) and **185 unique skeletons** across background and circuit exemplars. Background skeletons sample six per superclass; circuit exemplars sample five per selected cell type. Centerline chains are simplified at approximately 2 µm spacing, with a cap for very large arbors. These are real reconstructions, with reduced display resolution. The app does not render all neurons or all synapses.

| Circuit | Selected cells | Directed edges | Contacts | Selection |
|---|---:|---:|---:|---|
| Escape | 82 | 1,543 | 10,779 | Both DNp01 giant fibers; 40 LC4 and 40 LPLC2 with the most contacts onto GF |
| Heading | 130 | 7,606 | 123,798 | All EPG, PEN_a(PEN1), PEN_b(PEN2) and Delta7 |
| Motion | 84 | 174 | 1,576 | Six T4a and six T5a near the median right optic-lobe hex coordinates, plus eight cells of each input type ranked by contacts onto those targets |

Motion input types are Mi1, Tm3, Mi9, Mi4, C3, Tm1, Tm2, Tm4 and Tm9. This is a selected patch, not the complete motion pathway. The induced graph includes all released contact-count edges inside each selected node set. No external boundary inputs, other cell types or untraced fragments are added.

### Experimental physiology

1. **Motion: Groschner et al. (2022), Nature, Figure 4a.** https://doi.org/10.1038/s41586-022-04428-3. The source XLSX supplies T4 membrane potential means and SEM for ON/OFF edges in preferred/null directions, including GluClα RNAi. These are published population mean time courses, not raw single-cell spikes. Preserve 300 samples at 10 ms intervals in mV. CC BY 4.0.
2. **Heading: Turner-Evans et al. (2020), Neuron.** https://doi.org/10.1016/j.neuron.2020.08.006. Dataset https://doi.org/10.25378/janelia.12490274, `TwoColor/GreenEPGsRedDelta7s/20170717/Fly1_3-4day_6fx60D05_jRGCx55G08_Stripe_00001.mat`. One measured trial, 750 volumes, 18 bridge ROIs. Use released `GROIaveMax` and `RROIaveMax` minus 1 to obtain ΔF/F, following the authors’ Figure 4H code, without their temporal smoothing. Timestamps derive from the 10 kHz frame TTL clock, 14 planes per volume. The line plot uses ROI 4; the heatmap shows all E-PG ROIs. These are calcium measurements, not electrophysiology. Janelia Figshare CC BY-NC 4.0 (noncommercial reuse).
3. **Escape: Dombrovski et al. (2023), Nature, Extended Data Figure 4.** https://doi.org/10.1038/s41586-022-05562-8. Display the original published figure, with attribution and source link, showing actual whole-cell traces in panels b/d/g. The XLSX supplies integrated GF responses (sheet `Extended Data Fig. 4h`, A3:D10), not voltage time series. The app does not invent or digitize a raw waveform. The small-disk-array assay differs from the demonstration’s abstract looming input. GF depolarized without detected action potentials in that assay. CC BY 4.0.

No experimental ROI or waveform is matched to an individual MaleCNS body ID. These are different specimens and preparations. No quantitative fit or validation score is claimed.

## Modeling assumptions

Equations and all parameters are in `lib/simulation.ts`. The generated public worker is compiled from that exact file before development/build.

- Duration 600 ms. LIF/graded step 0.1 ms; HH step 0.025 ms. Network input updates at 1 ms. Output sampling 1 ms.
- LIF: τ = 20 ms, rest/reset −65 mV, threshold −50 mV, refractory 2 ms. Plotted 30 mV spike markers are conventional display marks, not action-potential waveforms. The within-bin peak marker means output samples are not raw continuous membrane state.
- HH: standard squid-axon conductances 120/36/0.3 mS/cm² and reversal potentials 50/−77/−54.4 mV, capacitance 1 µF/cm², classic 6.3°C gating rates. Exponential gate update and frozen-conductance voltage step. No fly-specific fit or temperature correction.
- Graded: leak conductance .05, leak reversal −65 mV, excitation reversal 0 mV, inhibition reversal −75 mV; continuous release proportional to depolarization. This omits active dendritic nonlinearities and receptor-specific kinetics.
- Contact counts are normalized by the total retained incoming contact count for each target, then scaled by global coupling. The normalization is recomputed after perturbation. Thus removal tests redistribute relative weight among surviving contacts; they do not hold surviving absolute synaptic conductances fixed.
- ACh modeled excitatory; GABA, glutamate and histamine inhibitory; other/unclear transmitter categories make no synaptic-current contribution. Consensus transmitter is anatomical annotation; this sign mapping is an assumption, not measured receptor information.
- Spiking synaptic traces decay in 8 ms. Every neuronal compartment has the same parameters within a model. No conductance calibration, axon delays, gap junction model, plasticity, learning, neuromodulation, body or motor controller.
- Inputs are engineered: LC4/LPLC2 temporal profiles, E-PG column-selective current, or a motion pulse ordered by soma x-position. Soma geometry is not a measurement of receptive-field tuning.
- A model can depolarize without spiking. In particular, the default HH escape/motion input is subthreshold; increasing the input slider can produce action potentials. This is preserved, rather than adding artificial spike events.
- Rewiring swaps directed edge endpoints while preserving node in/out degree and the global weight multiset. Shuffling keeps endpoints and permutes contact counts. Random dropout is a sensitivity control, not a calibrated model of segmentation errors.

## Scientific interpretation

An anatomically constrained simulation is underdetermined by a connectome. This demo exposes that underdetermination; it does **not** establish that connectome-based models are useless, nor that any failure falsifies the underlying biology. A defensible next stage would fit a smaller, receptor-aware multicompartment circuit to matched stimuli and measurements, then test unseen trials and perturbations.

## Reproduce the data

The compact JSON assets are committed, so no scientific Python environment is required to run the website. To regenerate them:

1. Create `work/.venv` and install `scripts/requirements-data.txt`.
2. Run `python scripts/download_sources.py` for the official tables and publisher data.
3. Run `python scripts/build_atlas.py` to extract the selected graphs and fetch their skeleton exemplars.
4. Run `python scripts/fetch_heading.py` to retrieve one MAT file by ZIP range with a CRC check.
5. Run `python scripts/extract_recordings.py --xlsx`, then `python scripts/extract_recordings.py`.

The recording JSON includes SHA-256 hashes of the original MAT/XLSX files and full provenance. The extraction scripts never change the publisher workbooks. Large downloads remain in `work/`.

## Checks

```sh
npm test
npx tsc --noEmit
npm run build
```

Numerical checks cover rest, refractoriness, HH singularities and step convergence, finite trajectories across all models/circuits and maximum slider settings, silencing, seed reproducibility, graph invariants and recording provenance. These are software checks, not biological validation.

The supported WebMCP surface exposes `configure_fly_circuit` and `read_fly_observatory` with runtime validation and lifecycle cleanup. Valid and invalid inputs were exercised in the local browser through its WebMCP interface. Broader browser visual QA was not performed.

## Interactive model notebook (`/lab`)

The linked notebook adds a separate deterministic teaching engine in `lib/neuron-lab.ts`. It is intentionally a small constructed circuit model, not another MaleCNS extraction. It explains LIF threshold/reset versus a resolved HH waveform, voltage-dependent gates, outward ionic currents, and conductance-based interactions in a chain, feedback loop, feedforward inhibitory motif, or two reciprocally connected E/I modules.

- Both single cells receive the same injected current density (default 8 µA/cm², 20–120 ms); pulse and paired-pulse protocols are available. Equal current does not imply equal physiological parameters. C = 1 µF/cm² for both; LIF gL = C/τm with adjustable τm, and HH uses the classic 6.3°C rates with adjustable maximum Na/K conductances. All constants and rate equations are exposed on the page.
- Duration 180 ms, dt 0.025 ms, plot sampling 0.25 ms. Playback changes the cursor through precomputed numerical results at approximately 20× slower than real time. It does not synthesize new random spikes or play experimental recordings.
- Synaptic release increments by 1 after a 1 ms delay and decays with τexc = 5 ms or τinh = 10 ms. Conductance is 0.1 × global coupling × edge weight mS/cm², with an additional bridge multiplier for intermodule edges. Excitatory/inhibitory reversals are 0/−80 mV. There is no incoming-weight normalization. Only the first neuron receives external current.
- The page exposes the exact toy edge list, live membrane diagrams, channel currents and gates, selected-neuron voltage and incoming conductances, a population spike raster, and JSON export including parameters, graphs, raw voltage, display voltage and event times. LIF peak markers are explicitly separate from raw membrane voltage. Membrane-flow dots indicate direction with illustrative speed; network pulses use the specified synaptic delay.
- This engine differs from the observatory's contact-normalized, current-driven LIF/HH networks. The page states the differences rather than implying that similarly named controls generate identical runs.
- Numerical tests check the analytic passive LIF response, display-marker separation, HH step convergence and gate bounds, sodium removal, causal synaptic delivery, isolation when the bridge is cut, and finite results at admitted extremes.

The experimental cards now show sourced recording protocols and the active observatory model's assumptions. T4 starting voltage and input-resistance summaries are transcribed from the original Figure 4a XLSX: control B4:C4 and G4:H4; RNAi D4:E4 and I4:J4. They are rounded to two decimals, are mean ± SEM at t = 0, and are not estimates of fixed Vrest or passive leak resistance. The primary Methods and Extended Data Figure 9 describe recording temperature (21–23°C), acquisition (10 kHz), analysis (1 kHz), and repeated-trial resistance measurement. GF methods specify 10 kHz low-pass filtering, 40 kHz digitization, and a 150 ms response window. Heading timestamps come from the released MAT file and author analysis; the 10 kHz trigger clock is distinguished from the ~6.1 Hz volume rate.

The comparison guide requires matched cell identity, input protocol, observation modality and sampling, fitting/training trials separated from held-out validation, and appropriate baseline/perturbation controls. There is no biological-validation score. The T4 knockdown switch changes only the measured condition and does not implicitly perturb the model.

The notebook also registers `configure_neuron_lab` and `read_neuron_lab`. Their schemas, valid updates, read-back, rejection of invalid configuration/read inputs, and unchanged state after rejection were verified through the in-app browser’s WebMCP interface. Broader visual browser QA was not performed.

## Appearance

Both routes default to a warm cream light theme. The header toggle restores the original dark theme; the choice is stored locally under `fly-em-theme` and shared across tabs on the same origin. Plot colors, calcium heatmaps, anatomical canvases, circuit diagrams and selection highlights adapt to the theme without changing simulation results. The saved preference is applied before first paint.

## Guided lesson and playback

`/` and `/explore` contain the compact connectome lab. `/learn` begins with biological recordings, defines the emulation challenge, builds an editable membrane equation and input-timing experiment, explores HH channel dynamics, compares both models with paired Allen current/voltage trials, and then connects cells. `/lab` retains the detailed model notebook and exports. The lesson is implemented in `components/story/neuron-story.tsx` and its experiment components, with supporting circuit copy in `content/neuron-story.ts`; the three paper summaries are in `content/papers.ts`. The reading face is locally hosted Source Serif 4, with Inter for interface text and headings; font licenses are in `public/fonts/`.

Connectome playback reveals the computed trace and population activity up to the cursor. The cause diagram shows the three strongest retained input sources; all retained inputs enter the simulation. Cell flashes use detected model spike times, and connection brightness uses the actual release state. The graded model uses continuous release without spikes. There is no invented axonal transit delay in this original circuit engine.

`Result.rawVoltage` separates physical model state from the original LIF display markers. `Result.diagnostics` samples external, synaptic and intrinsic contributions to dV/dt in mV/ms, plus their sum, release state and hold state (0 = free, 1 = LIF refractory, 2 = silenced). These are instantaneous equation terms sampled every millisecond, not a finite-difference estimate; reset jumps are separate. Tests check the analytic passive solution, contribution balance, held states and agreement of synaptic terms with the implemented normalized weights.

The `/learn` recording sources, transformations and comparison assumptions are documented in [the lesson notes](docs/learn-redesign-notes.md). The Allen mouse-cell comparison is unfitted; the cat nerve response and human scalp EEG are separate preparations. Local JSON assets retain attribution and reuse conditions.
