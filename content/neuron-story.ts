/** Editorial copy for /learn. The experiments and model parameters live separately. */
export const neuronStory = {
  kicker: 'Single-neuron models',
  title: ['How do we model', 'a neuron?'],
  intro:
    'Start with leaky integrate-and-fire (LIF): inputs add up, voltage leaks back, and a threshold triggers a spike. Then build toward Hodgkin–Huxley (HH), where voltage-sensitive ion channels generate the spike itself.',
  cell: {
    number: '01',
    title: 'LIF: what happens when inputs add up?',
    paragraphs: [
      'A neuron has a branching shape, but our simplest models start with something smaller: a voltage difference across its membrane. Scroll through the four steps below.',
    ],
  },
  steps: [
    {
      id: 'cell',
      title: 'This is a neuron.',
      text: 'Its branches receive and distribute signals. This particular shape is a real reconstruction from the fly connectome.',
      after:
        'To begin modeling, we make a big simplification: treat the whole cell as one electrical compartment.',
    },
    {
      id: 'membrane',
      title: 'Its membrane holds a voltage.',
      text: 'The cell’s inside and outside are separated by a thin membrane. That membrane stores charge. Channels let charged ions cross it.',
      after:
        'We track one number: the voltage inside relative to outside. Here, the resting value is −65 millivolts.',
    },
    {
      id: 'summation',
      title: 'An input leaves a trace.',
      text: 'A short pulse of current moves the voltage upward. When the pulse ends, the membrane relaxes toward rest. That lingering change is a small memory of the input.',
      after: 'Send one input. Watch the voltage rise, then leak back down.',
    },
    {
      id: 'threshold',
      title: 'A second input can tip the balance.',
      text: 'If another input arrives before the first has faded, their effects accumulate. This time, the voltage reaches the model’s threshold.',
      after:
        'LIF declares a spike event and resets. The rule supplies the event; it does not explain the shape of an action potential.',
    },
  ],
  lif: {
    number: '02',
    title: 'How does that become an equation?',
    paragraphs: [
      'That is leaky integrate-and-fire, or LIF. “Integrate” means inputs accumulate. “Leaky” means their effects fade. “Fire” is a rule we apply when voltage crosses a threshold.',
      'The voltage equation handles the smooth part. A separate rule handles the event. Keeping them separate makes clear what the model actually calculates.',
    ],
  },
  hh: {
    number: '03',
    title: 'HH: what makes the spike’s shape?',
    paragraphs: [
      'Keep the same current-balance idea, then replace the threshold-and-reset rule with voltage-sensitive sodium and potassium channels. Hodgkin–Huxley calculates their changing conductances. Sodium channels open quickly, driving voltage upward and opening still more sodium channels.',
      'Sodium then becomes less available, while slower potassium channels help bring voltage back down. The spike is a result of those interacting processes.',
    ],
  },
  network: {
    number: '04',
    title: 'How does one cell affect the next?',
    paragraphs: [
      'A spike from one cell changes the synaptic conductance of another. That changes current, which changes voltage. A connected cell does not simply inherit its neighbor’s spike.',
      'Follow the signal through a chain. Add a loop. Add inhibition. Then connect two small circuits—and try cutting the bridge between them.',
    ],
  },
  evidence: {
    number: '05',
    title: 'What would count as a biological match?',
    paragraphs: [
      'The voltage here is a model output. Matching its appearance to a published graph would skip the harder question: did we give the right cell the right input and predict what the experiment actually measured?',
      'The next step is to match the stimulus, preparation and recording method, fit on some trials, and predict others. More elaborate equations alone do not establish biological accuracy.',
    ],
  },
  ending: {
    title: 'Compare the three fly circuits.',
    text: 'You now have the pieces a connectome leaves unspecified: how a membrane responds, how a synapse acts, and how an input enters the circuit.',
  },
};
