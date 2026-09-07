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
