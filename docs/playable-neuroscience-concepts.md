# Playable neuroscience concepts

Research and design notes, 8 September 2026. These are proposals, not implemented features or validated reproductions.

## Recommendation

Build a progressive **Circuit Garden**: place a few model neurons, stimulate them, make a useful response, then face an experiment that distinguishes competing models. A short **Which wiring did the work?** challenge could be the shareable entrance. Keep the face-coding game as a visually strong independent explorable.

The central question is: can the model predict a new intervention in the biological system? Success at an externally assigned task is useful evidence about that engineered system, but is not sufficient evidence of biological emulation. Model detail alone is not a validation score.

## 1. Circuit Garden

### Player experience

1. Touch one neuron. A stimulus charges its membrane; watch a voltage trace unfold, a threshold event occur, and a downstream synaptic current arrive. Inspect each term rather than displaying decorative flashes.
2. Place a second cell and choose connection strength. Make a pulse reach an output. Introduce an inhibitory cell or feedback connection with a specific challenge, such as stopping a repeated response.
3. Assemble four small islands. The challenge becomes producing a local response without recruiting the entire board. Show burst size, spread and recovery, not a generic intelligence meter.
4. Try regular versus irregular drive, bridge density, inhibition and synaptic recovery. Treat these as experiments; do not script an arbitrary layout to reproduce a preferred outcome.
5. Switch from the invented introductory circuit to a published experimental condition. Predict which condition has more collective bursting, then reveal recordings and a model prediction.
6. Fit baseline summaries, then lock parameters before testing an unseen stimulus or pharmacological condition. Compare candidate models that seemed equally plausible before the test.

### Research foundation

Yamamoto et al. (2023), *Modular architecture facilitates noise-driven control of synchrony in neuronal networks*, grew patterned cortical cultures and compared optogenetic interventions with calcium imaging. Asynchronous input could reduce global synchrony, depending on network architecture; blocking inhibition weakened the effect. Their models investigate synaptic-resource depletion as a mechanism. [Paper](https://doi.org/10.1126/sciadv.ade1755).

The [G-Node archive](https://doi.gin.g-node.org/10.12751/g-node.t77b3p/) lists raw data and intermediate results, separate experimental/simulation ZIPs, a 2.6 GiB complete archive, and CC BY-NC 4.0 terms. The [authors' code](https://github.com/Priesemann-Group/stimulating_modular_cultures) includes Brian2 LIF simulations and a reduced model of interacting modules. Archive metadata was verified; individual recordings were not downloaded or validated in this design pass.

### What the comparison can establish

The free-building board is an educational model, not a reconstruction of every neuron in a recorded culture. Compare actual recordings only for the sampled experimental conditions. Calcium fluorescence is not membrane voltage or a direct spike count. A future implementation must reproduce the paper's event extraction or use a declared observation model, comparing burst participation, correlations, timing distributions and uncertainty in compatible units.

## 2. Which wiring did the work?

### Player experience

Teach a small network to distinguish two drawn gestures or public sound categories. See its internal activity and output. Then compare three anonymously labelled contestants: anatomical wiring, a controlled rewire, and input features without the recurrent network. Guess their identities before revealing scores and training locations.

Two separate experiments matter:

- Silence cells after training, keeping the decoder fixed: does this fitted implementation depend on those cells?
- Change the wiring and retrain the decoder with the same budget: does the original anatomy offer an advantage for this task?

Make the input-to-readout bypass visible and cuttable. Reveal how the input encoder, recurrent dynamics, trained readout and output display contribute. Test on held-out examples; use matched splits, feature access, tuning budgets and multiple seeds. Random wiring must not be scripted to win. Report task-specific outcomes rather than a universal conclusion about connectomes.

### Connection to the linked demo

The Oruk article describes a frozen 499-unit leaky tanh reservoir derived from fly connectivity, random audio input projection, and a trained linear readout that also receives pooled audio features directly. Its reported test mAP is 16.84% for fly wiring and 16.88% for scrambled wiring. The article explicitly discusses the null anatomical advantage and limits of its emotion maps. This is a computational model with an interpretable control, not evidence that a living fly understands human emotion. The main labelled dataset is private, so a public gesture/audio experiment would be a new demonstration, not a reproduction of that benchmark. [Article](https://oruk.ai/research/we-taught-a-fruit-fly-to-read-human-emotion).

Both linked X posts were inaccessible through the research tool; no claims about their exact wording are made here.

## 3. Change the face, keep the response

### Player experience

Show a large face and a selected neuron's predicted response. The player tries to change the face as much as possible while keeping its response inside a narrow range. Reveal two directions: one changes the response strongly; another changes appearance while preserving the model's response. Add more recorded-cell constraints and explore how the set of compatible faces narrows.

A second scene gives the player partial population activity and several possible faces. Reveal the uncertainty remaining after each added measurement. A decoded image is one model-based estimate, not a photograph of the animal's experience.

### Research foundation and availability

Chang and Tsao (2017), *The Code for Facial Identity in the Primate Brain*, tested an axis-based account of macaque face-cell responses and demonstrated strikingly different faces with similar responses in individual cells. This supports an encoding/decoding explorable; it is not a complete synaptic circuit reconstruction. [Paper](https://doi.org/10.1016/j.cell.2017.05.011), [author repository](https://authors.library.caltech.edu/records/znzhp-4j547).

The 2017 paper says data are available on request. A related [Higgins et al. 2021 paper](https://www.nature.com/articles/s41467-021-26751-5) releases model responses but describes raw neural recordings as restricted and available by contacting the authors. Consequently a first version could honestly demonstrate the published mathematical idea; a display labelled recorded neural responses needs the actual data or clearly identified published figure data.

Tsao also has causal work: [Moeller et al. 2017](https://www.nature.com/articles/nn.4527) measured how face-patch microstimulation changed perceptual decisions. An extension could ask players to predict a behavioral effect. Do not invent an exact image of what a stimulated monkey saw or treat distinct experiments as recordings from the same cells.

## 4. Three pulses to solve the network

### Player experience

Watch an unknown network's spontaneous activity. Choose three stimulation sites and predict where activity will increase or decrease. Each intervention reveals repeated-trial evidence and updates the map of possible influences. Reward informative experiments and calibrated predictions, including uncertainty.

Use recorded trials for available conditions. Changing pulse amplitude or selecting an unrecorded site must explicitly switch to a model prediction. Correlated firing, intervention effects and anatomical synapses should have different visual encodings.

### Dataset candidate

Tentori et al., *Spontaneous Dynamics Predict the Effects of Targeted Intervention in Hippocampal Neuronal Cultures* (2025 preprint), studies cultured hippocampal networks using high-density extracellular electrode recordings and stimulation. The [repository](https://github.com/elisatentori/causality) provides MATLAB spontaneous-recording files, analysis notebooks and effective/interventional connectivity results. `Data_MaxOne/Culture1REC1/Data` contains `Cult.mat` and `Cult_30min.mat`; those file names were verified. Trial-level evoked-data completeness remains to be checked. The repository states all rights reserved, so public access should not be described as unrestricted redistribution permission.

Electrical stimulation of a site can recruit multiple cells or axons. These measurements do not provide an EM synapse map or guarantee stimulation of one identified neuron.

## Additional perturbation lead

[Kim et al., Predicting in vitro single-neuron firing rates upon pharmacological perturbation using Graph Neural Networks](https://www.frontiersin.org/journals/neuroinformatics/articles/10.3389/fninf.2022.1032538/full) is a candidate for a baseline-versus-inhibition-blockade challenge. [Code and data directory](https://github.com/arahangua/gnn_prediction_sn). The graphs are functional connectivity estimates, not measured synaptic anatomy. Raw trial-level trace availability was not verified here. It is useful as a positive example to investigate: graph information can help prediction without establishing whole-system emulation.

## Presentation principles

- Begin with an action and visible consequence within seconds; unfold the explanation after the player's prediction.
- Every glowing unit must correspond to an identified model variable or measurement. Keep a synchronized trace available on click.
- Use distinct labels for simulated voltage, simulated events, recorded extracellular spikes and calcium fluorescence.
- Show independent trials or trial variability. Do not compare arbitrary biological and simulated traces as though matching each spike were the sole criterion.
- Distinguish a failed fitted model from a disproof of its entire model family. A well-tested reduced model can be more useful than an unfitted detailed model.
- Let the player see which assumptions were necessary: stimulus mapping, cell parameters, synaptic sign and efficacy, plasticity, decoder training, body mechanics and feedback.
- Make validation observable: held-out response, recovery after a perturbation, or intervention effect. Avoid a percent-emulated meter or a claim about consciousness.
- Use these concepts as separate short experiences linked to the compact lab. Start with Circuit Garden; use the wiring challenge as the easiest entry point.
