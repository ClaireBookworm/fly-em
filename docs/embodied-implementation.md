# Vision and movement explorable

The local `/embodied` page is linked from the compact lab. It keeps the MaleCNS atlas, FlyVis visual model, published flight motor model, and teaching mechanics in separate identity and provenance domains.

## Visual replay

`scripts/export-vision-replay.py` adapts the [NeuroMechFly advanced vision tutorial](https://github.com/NeLy-EPFL/flygym-gymnasium/blob/d285260a1c8a7b3494150cd1590f2c9fe4b5e06b/doc/source/tutorials/advanced_vision.rst). It runs a stationary observer and a walking target for 500 ms. The body movie, two retinas, selected neural layers, target position, and target joint positions come from the same simulation.

- FlyGym Gymnasium 1.3.2; FlyVis 1.2.0; MuJoCo 3.2.7. Exact runtime versions and checkpoint archive SHA256 are in the exported JSON.
- Physics step 0.1 ms, vision step 5 ms, web activity samples every 10 ms. The video plays 10 times slower than simulated time; the camera's initial stabilization crop is disabled to retain the common clock.
- Checkpoint: `flow/0000/000/best_chkpt`, from the authors' pretrained archive. The JSON retains its archive hash.
- 45,669 model cells per eye, with 15 exposed cell groups. The model's biological 64-type accounting splits CT1 into two computational groups (65 labels).
- Continuous activity in arbitrary units; no spike-generation model and no calibrated mV or Hz. The layer colour shows change from the first recorded frame; the trace shows raw activity. The colour scale is shared across a layer's entire replay, independently for each eye/type.
- Model-cell IDs are cell type plus lattice position/index, never MaleCNS body IDs.
- Observer drive [0,0], target drive [1,1], seed 0. A prescribed hybrid walking controller produces joint commands. This observer experiment does **not** feed its visual activity back into locomotion.
- `scripts/export-vision-parameters.py` reads the same explicit checkpoint and exports fitted bias and time constant. The model floors its effective time constant at the neural integration timestep.

The NeuroMechFly code is Apache-2.0 and FlyVis code is MIT. The source papers and tutorial are linked on the page. The local rendered output is newly generated; it is not an unrelated movie paired with fabricated neural traces.

## Two-input motion lesson

`lib/embodied.ts` implements a Reichardt-style opponent correlator: two luminance pulses, exponential low-pass filters, products, subtraction. It is a teaching algorithm, not a T4 fit, a FlyVis port, or a simulation of the whole retina. Reversing input order reverses the output; zero contrast gives zero output. The real visual pathway includes recurrent connections and dendritic mechanisms absent from this abstraction.

## Flight motor model and recordings

`scripts/export-wing-replay.py` imports the unmodified code in [Zenodo 7740678](https://zenodo.org/records/7740678), archive MD5 `abcfdfa63d0d7c15f948df080d288ec9`. It reproduces the deterministic Fig. 3B setup of [Hürkey et al. 2023](https://doi.org/10.1038/s41586-023-06099-0): five reduced fly conductance neurons, chosen initial phases, weak linear electrical coupling, RK4 step 0.1 ms, five seconds, no noise. We also rerun identical initial conditions with no coupling and with 3 nS coupling; these are our interventions, not reproductions of the paper's other statistical panels.

The exported numerical voltages are sampled at 0.5 ms. Spike times come from the authors' threshold/refractory event detector. Both voltages and event times are retained, without replacing waveforms with drawn spikes.

The experimental raster uses the archive's control recording `split23h06xValium_5units_200305_m1_181sec_SpE.npy`, read as three consecutive non-pickled NumPy arrays: event time, unit identity, and wingbeat times. Crop rule: the first full integer-second five-second window after the first event, giving 23–28 s. This yields 247 motor-unit events and 935 wingbeats. It is a deterministic crop rule, not selection for resemblance to the model. The page shows relative time 3–4 s in each independent run. Model neurons and recorded units are not anatomically matched; there is no event-time alignment and no intracellular recording waveform in this exported experimental data.

## Muscle and hinge teaching transform

This part is our explicitly unfitted mathematical illustration. It is neither MuJoCo physics nor part of the published five-neuron model:

- Each motor spike adds 0.35 to a calcium-like proxy after an assumed 2 ms delay; exponential decay time 120 ms; clipped to [0,1].
- Model MNs 1–4 supply one DLM fibre each, model MN 5 supplies two fibres. The diagram omits soma laterality, axonal anatomy, and true NMJ structure.
- Mean fibre activation scales a prescribed 200 Hz sine wave, with 60 degrees maximum illustrative amplitude. There is no predicted aerodynamic force, thorax resonance, stretch activation, or actual hinge geometry.
- Disconnecting an NMJ, redirecting a target, or reversing mechanical transmission changes only this downstream transform. Neural activity remains identical. The intact output is drawn as a grey reference.
- Zooming slows playback further so the imposed wing cycle can be inspected. It does not increase biological or anatomical resolution.

The text distinguishes asynchronous power muscles from phase-sensitive steering muscles and links the [measured wing-hinge study](https://doi.org/10.1038/s41586-024-07293-4). It explains why the [MANC central motor map](https://elifesciences.org/articles/96084) cannot by itself supply every peripheral synapse, muscle attachment, or mechanical parameter.

## Reproduction

Use a managed CPython 3.12 environment, not the host Conda Python (the latter caused native-library crashes in graphics/model integration here). Large downloaded archives and the isolated environments live under ignored `work/embodiment/`; only the web exports and reproduction scripts are product files.

1. Install `flygym-gymnasium==1.3.2`, `flyvis==1.2.0`, `mujoco==3.2.7`, `brian2`, and `imageio-ffmpeg` in the isolated environment.
2. Set `FLYVIS_ROOT_DIR` to `work/embodiment/flyvis-data` and use `flyvis download-pretrained --skip_large_files`.
3. Unpack the verified Zenodo wing archive under `work/embodiment/wing-code`.
4. Run the three `scripts/export-*.py` scripts using the isolated interpreter. On macOS the body renderer needs graphics access.
5. Run the repository's tests, TypeScript check, lint, and production build.

The page makes no claim to reproduce the Eon viral video or to integrate the three selected MaleCNS circuits into an end-to-end fly controller.
