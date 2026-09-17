# Embodied fly: model inspection and experiment design

Research and original design, 8 September 2026. The first implementation now lives at `/embodied`; see [the implementation and provenance record](embodied-implementation.md) for exactly what runs. The broader closed-loop interventions below remain a design, not implemented capabilities.

## Best first example

Use the published NeuroMechFly + FlyVis visual observation / fly-following examples. They expose the full path from eye images through modeled cell activity to a turning rule and a walking controller. Start with the stationary observer watching a second fly cross its field of view; then use the closed-loop following example. This gives a simple visual input experiment followed by a behavioral test.

Sources inspected:

- [NeuroMechFly v2 paper](https://doi.org/10.1038/s41592-024-02497-y).
- [FlyVis model paper, Lappalainen et al. 2024](https://doi.org/10.1038/s41586-024-07939-3) and [official implementation](https://github.com/TuragaLab/flyvis).
- [Vision example overview](https://github.com/NeLy-EPFL/flygym-gymnasium/blob/d285260a1c8a7b3494150cd1590f2c9fe4b5e06b/flygym_gymnasium/examples/vision/README.md).
- [Stationary observation tutorial](https://github.com/NeLy-EPFL/flygym-gymnasium/blob/d285260a1c8a7b3494150cd1590f2c9fe4b5e06b/doc/source/tutorials/advanced_vision.rst).
- [Closed-loop follow controller](https://github.com/NeLy-EPFL/flygym-gymnasium/blob/d285260a1c8a7b3494150cd1590f2c9fe4b5e06b/flygym_gymnasium/examples/vision/follow_fly_closed_loop.py).
- [Vision-network interface](https://github.com/NeLy-EPFL/flygym-gymnasium/blob/d285260a1c8a7b3494150cd1590f2c9fe4b5e06b/flygym_gymnasium/examples/vision/realistic_vision.py).

The tutorial exposes `nn_activities_arr` for both eyes, with 45,669 modeled visual cells per eye in its demonstrated configuration. These are continuous model activities, not LIF spike events and not experimentally measured millivolts. Cell identity belongs to the FlyVis model (type plus spatial location/index); it must not be presented as a matched MaleCNS body ID.

The follow controller computes absolute baseline-normalized responses across selected cell types, thresholds the average at a configured z score, estimates an object position from the resulting mask, and converts it into left/right descending drive. A hybrid walking controller turns that drive into joint targets. This is a concrete, inspectable neural-to-motor interface with hand-specified components; it is not an end-to-end reconstruction of the brain and VNC.

The checked script uses threshold 5 and tracking gain 6 in its standard trial configuration. It retains continuous activity arrays in observations but deletes the convenience `nn_activities` objects before pickling results. A reproduction should explicitly export numerical activity arrays with their identities and timestamps; a movie alone cannot supply clickable cell traces.

## Other demos are different models

- [DeepMind/Janelia flybody](https://github.com/TuragaLab/flybody), [2025 paper](https://doi.org/10.1038/s41586-025-09029-4): body physics and reinforcement-learning locomotion tasks. A policy's hidden units are artificial network units; they are not automatically identified fly neurons.
- [Eon's March 2026 announcement](https://eon.systems/updates/first-multi-behavior-brain-upload): claims multi-behavior embodiment using a connectome model and a MuJoCo body. The announcement is a claim about its demonstration, not a release of synchronized per-neuron telemetry.
- [Eon's public fly-brain repository](https://github.com/eonsystemspbc/fly-brain), inspected at `a3db62f9436074e485c0278290c2164ed6150808`: contains LIF simulation, activation/silencing, benchmarks and per-spike exports. Its documented spike schema includes `time_ms`, `trial`, `neuron_index` and `flywire_id`. I did not locate the matching complete embodiment integration and synchronized behavior/neuron dataset for the announcement in the inspected repositories. Do not label a newly assembled controller as a reproduction of that video.
- [Official NeuroMechFly browser viewer](https://neuromechfly.org/wasm/viewer/viewer.html): genuine MuJoCo WebAssembly physics is already feasible in a browser. Its position-actuator controls are not a neural controller. An iframe of that viewer cannot, by itself, provide connectome activity.

## Compact-lab interface

Add an Embodiment view with a shared clock and four linked panes:

1. **World/body:** orbitable fly and target, actual eye images, motion path, and play/pause/scrub. Display simulation time separately from playback time.
2. **Visual circuit:** cell-type layer selector and individual model-cell selection, with spatial position on its retinotopic layer. A small set of inputs/outputs can be expanded. Keep this model's identity namespace separate from the existing MaleCNS atlas.
3. **Selected cell:** actual exported model activity, incoming contributions where available, and outgoing influence on the readout. Show spikes only for a model that actually emits spike events. Do not invent mV or Hz units for uncalibrated activity.
4. **Motor interface:** show the object mask, estimated target position, turning bias, left/right drive, walking-controller state, and joint action. Mark components as reconstructed, fitted, hand-specified, or physics.

The question above the panes should be specific: “When this cell is silenced, does the fly still turn toward the target?”

## Interventions

- Baseline vs silence a selected cell or cell type.
- Occlude part of the eye input; reverse the target's direction; blank the visual scene.
- Clamp the motor readout while keeping visual neurons active.
- Bypass the neural visual representation with a simple geometric target detector. Label this as an alternative controller.
- Rewire the modeled circuit with matched degree and weight constraints; first hold parameters fixed, then treat retraining as a separate experiment.

Use paired runs with identical seeds, start states and target paths. For an input-processing test, replay identical recorded eye input into intact and perturbed neural models (open loop). For a behavioral test, rerun the full feedback loop (closed loop): the altered action changes subsequent sensory input, so differences accumulate. Keep these experiment modes explicit.

Measure target angular error, distance to target, turn latency, path length, success/failure and joint stability. For model-cell inspection, measure tuning across stimuli, response changes under intervention, and the downstream readout change. Correlated activity is not sufficient to assign a causal function; behavioral resemblance is not sufficient to establish biological fidelity.

## Delivery strategy

First run the published Python model offline and export synchronized body pose, visual input, model-cell activity, and motor commands. Replaying those values in a browser still supports orbiting the body, inspecting cells and comparing precomputed interventions, while avoiding a large Python/PyTorch simulation dependency for each visitor. Clearly label this as replay.

Use one time base in seconds and explicit sample timestamps for every channel; physics, vision and video have different rates. Keep original model activity intact and label any interpolation used for display. Record source commits, parameter values, checkpoint hash, seed, solver step, coordinate units and cell identity mapping in each run manifest.

An export bundle should contain:

- `manifest.json`: provenance, licenses, simulator and model versions, parameters and intervention.
- `body`: timestamps and qpos/pose data with the exact body model used for replay.
- `vision`: eye-frame timestamps and retinal samples.
- `cells`: model IDs, cell types, eye, spatial location and connectivity metadata.
- `activity`: numerical time series with explicit units; optional event table only for spiking models.
- `control`: readout features, turning bias, descending drives, and actuator targets.
- `metrics`: behavioral comparison values computed from the same run.

Validate a port against the upstream reference before offering live neural integration. Live MuJoCo-WASM body control is a later step; its availability does not establish that the full published neural controller runs faithfully in the browser.

## Boundary that motivated the implementation

The existing compact lab has selected MaleCNS circuits and illustrative neuron equations, but no retina, VNC motor controller or body. It must not be connected to an unrelated fly movie while implying those displayed voltages caused the recorded behavior. The current request therefore needs a separate, provenance-preserving embodied model run, not just an additional animation beside the existing trace.
