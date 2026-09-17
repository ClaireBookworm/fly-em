/* oxlint-disable react/react-compiler */
'use client';
import { useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  labDefaults,
  labGraph,
  simulateLab,
  type LabModel,
  type Motif,
} from '@/lib/neuron-lab';
import { CircuitDiagram, NetworkRaster } from '@/components/neuron-lab';
import { TracePlot } from '@/components/science-plots';
import { useTheme, themeColor } from '@/lib/theme';
import { neuronStory as copy } from '@/content/neuron-story';
import {
  Chapter,
  StoryHeader,
  StoryNext,
  StoryFooter,
  StoryControl,
  StoryPlayback,
  usePlayback,
} from './shared';
import { usePageTools, requireEmpty } from './page-tools';
import { EquationExperiment } from './membrane-experiments';
import { HHExperiment } from './hh-experiment';
import { CopyEditor, EditableCopy } from './copy-editor';
import { NeuronPrologue } from './neuron-prologue';
import {
  RecordingOpening,
  RecordingComparison,
  useLearnRecordings,
} from './recording-experiments';
const motifNames: Record<Motif, string> = {
  chain: 'A chain',
  feedback: 'A loop',
  inhibition: 'Inhibition',
  modules: 'Two circuits',
};
const motifQuestions: Record<Motif, string> = {
  chain: 'Can A fire without making B fire?',
  feedback: 'Does a loop keep firing after the input ends?',
  inhibition: 'Can adding a connection reduce the response?',
  modules: 'What survives when the bridge is cut?',
};
const motifNotes: Record<Motif, string> = {
  chain:
    'Only A gets injected current. Lower the connection strength and watch which cells stop responding.',
  feedback:
    'C now excites A. Compare activity after 120 ms, when the external input stops. Feedback alone does not guarantee persistent activity.',
  inhibition:
    'A excites B directly and also recruits inhibitory I. Compare B’s events with the chain, then change the coupling.',
  modules:
    'A2 drives B1, and B2 feeds back to A1. Cut the dashed connections to test whether circuit B can respond on its own.',
};
export default function NeuronStory() {
  const theme = useTheme(),
    recordings = useLearnRecordings();
  const [motif, setMotif] = useState<Motif>('chain'),
    [model, setModel] = useState<LabModel>('lif'),
    [bridge, setBridge] = useState(1),
    [coupling, setCoupling] = useState(1),
    [selected, setSelected] = useState(0);
  const networkClock = usePlayback(720, 2, 80);
  const networkParameters = useMemo(
    () => ({ ...labDefaults, motif, model, bridge, coupling }),
    [motif, model, bridge, coupling],
  );
  const network = useMemo(
    () => simulateLab(networkParameters, model, true),
    [networkParameters, model],
  );
  const graph = useMemo(() => labGraph(motif), [motif]),
    picked = Math.min(selected, graph.nodes.length - 1);
  const resetNetwork = () => {
    networkClock.setPlaying(false);
    networkClock.setCursor(80);
  };
  const state = useRef<object>({});
  state.current = {
    ready: true,
    network: {
      motif,
      model,
      bridge,
      coupling,
      spikes: network.spikes.map((s, i) => ({
        cell: graph.nodes[i].name,
        count: s.length,
      })),
    },
    recordingsLoaded: !!recordings.data,
  };
  usePageTools([
    {
      name: 'configure_neuron_story',
      title: 'Configure the connected-neuron experiment',
      description:
        'Change the visible constructed circuit and its model or connection strengths.',
      inputSchema: {
        type: 'object',
        properties: {
          motif: {
            type: 'string',
            enum: ['chain', 'feedback', 'inhibition', 'modules'],
          },
          model: { type: 'string', enum: ['lif', 'hh'] },
          bridge: { type: 'number', minimum: 0, maximum: 2 },
          coupling: { type: 'number', minimum: 0, maximum: 2 },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input))
          throw Error('Expected parameters.');
        const x = input as Record<string, unknown>;
        for (const [k, v] of Object.entries(x)) {
          if (
            k === 'motif' &&
            typeof v === 'string' &&
            Object.hasOwn(motifNames, v)
          )
            continue;
          if (k === 'model' && (v === 'lif' || v === 'hh')) continue;
          if (
            (k === 'bridge' || k === 'coupling') &&
            typeof v === 'number' &&
            Number.isFinite(v) &&
            v >= 0 &&
            v <= 2
          )
            continue;
          throw Error(`Invalid parameter: ${k}`);
        }
        flushSync(() => {
          if (x.motif) {
            setMotif(x.motif as Motif);
            setSelected(0);
          }
          if (x.model) setModel(x.model as LabModel);
          if (typeof x.bridge === 'number') setBridge(x.bridge);
          if (typeof x.coupling === 'number') setCoupling(x.coupling);
          resetNetwork();
        });
        return state.current;
      },
    },
    {
      name: 'read_neuron_story',
      title: 'Read neuron experiments',
      description:
        'Read recording readiness and the current circuit configuration and event counts.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        requireEmpty(input);
        return state.current;
      },
    },
  ]);
  return (
    <CopyEditor>
      <div className="essay essay-neuron em-lesson">
        <StoryHeader part="neuron" />
        <main>
          <NeuronPrologue />
          <RecordingOpening {...recordings} />
          <section
            className="em-roadmap essay-copy"
            aria-labelledby="em-roadmap-title"
          >
            <EditableCopy as="h2" copyId="lesson-1" id="em-roadmap-title">
              What are we trying to reproduce?
            </EditableCopy>
            <EditableCopy as="p" copyId="lesson-2">
              Here, emulating means building a model that predicts a chosen
              response to an input. We choose what to keep, supply parameters,
              run the equations through time, and test the result against
              biology. A useful model might predict when a neuron fires without
              reproducing every detail inside it.
            </EditableCopy>
            <EditableCopy as="p" copyId="lesson-3">
              That leaves a tradeoff: more mechanisms mean more quantities to
              estimate and update. A simpler model costs less to run, but can
              leave out a behavior we care about. The experiment decides whether
              those omissions matter.
            </EditableCopy>
            <nav className="em-roadmap-links" aria-label="Lesson sections">
              <a href="#one-cell">
                <b>01</b>
                <span>
                  Build a membrane<small>Charge, leak, and two inputs</small>
                </span>
              </a>
              <a href="#channels">
                <b>02</b>
                <span>
                  Let a spike emerge<small>From a rule to ion channels</small>
                </span>
              </a>
              <a href="#comparison">
                <b>03</b>
                <span>
                  Return to the recording
                  <small>Same input. Different predictions.</small>
                </span>
              </a>
              <a href="#neighbors">
                <b>04</b>
                <span>
                  Connect the cells<small>What changes at circuit scale?</small>
                </span>
              </a>
            </nav>
          </section>
          <section className="essay-chapter" id="one-cell">
            <div className="essay-copy">
              <EditableCopy as="h2" copyId="lesson-4">
                First, a membrane that remembers—and leaks.
              </EditableCopy>
              <EditableCopy as="p" copyId="lesson-5">
                The membrane separates the cell’s inside from its outside.
                Voltage is the electrical potential difference across it; −65 mV
                means the inside is 65 millivolts below the outside reference.
                Capacitance lets separated charge build up, while open channels
                let current pass.
              </EditableCopy>
              <EditableCopy as="p" copyId="lesson-6">
                We’ll simplify the whole cell to one electrical compartment. Its
                input current splits between charging the membrane and flowing
                through a leak pathway. That balance becomes our first equation.
              </EditableCopy>
            </div>
            <EquationExperiment />
            <div className="essay-copy em-section-after">
              <EditableCopy as="h3" copyId="lesson-7">
                Where did the spike come from?
              </EditableCopy>
              <EditableCopy as="p" copyId="lesson-8">
                In leaky integrate-and-fire (LIF), voltage accumulates input and
                relaxes toward rest. A separate threshold rule declares a spike
                and resets the cell. We have modeled an event’s timing, but not
                the biological waveform you saw above.
              </EditableCopy>
              <EditableCopy as="p" copyId="lesson-9">
                <a
                  href="https://neuronaldynamics.epfl.ch/online/Ch1.S3.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  The electrical circuit and LIF derivation ↗
                </a>
              </EditableCopy>
            </div>
          </section>
          <section className="essay-chapter" id="channels">
            <Chapter {...copy.hh} />
            <HHExperiment />
            <div className="essay-copy em-section-after">
              <EditableCopy as="h3" copyId="lesson-10">
                What does the extra complexity buy us?
              </EditableCopy>
              <EditableCopy as="p" copyId="lesson-11">
                HH can explain a spike through changing ionic currents, so a
                channel perturbation has a mechanism in the model. It also asks
                for channel densities, reversal potentials and voltage-dependent
                gate rates. Those values must be appropriate to the cell we are
                trying to emulate.
              </EditableCopy>
            </div>
            <div className="em-tradeoff-table">
              <table>
                <caption>Two models, different commitments</caption>
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>What evolves</th>
                    <th>What it leaves to us</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>LIF</th>
                    <td>One voltage, plus event/reset bookkeeping</td>
                    <td>A threshold and reset rule; no spike waveform</td>
                  </tr>
                  <tr>
                    <th>Classic HH</th>
                    <td>Voltage and three coupled gate variables</td>
                    <td>
                      Channel parameters and kinetics; still one compartment
                    </td>
                  </tr>
                </tbody>
              </table>
              <EditableCopy as="p" copyId="lesson-12" className="essay-fine">
                More state and rate calculations add work at every step. Actual
                runtime also depends on the solver, timestep and implementation.
                Both models omit spatial variation along the branches.
              </EditableCopy>
              <details className="essay-method-note">
                <summary>Is there a middle ground?</summary>
                <EditableCopy as="p" copyId="lesson-13">
                  Yes. Adaptive exponential integrate-and-fire (AdEx) adds an
                  adaptation variable and nonlinear spike initiation while
                  retaining an event/reset rule. It is useful when adaptation
                  matters but a full channel model is unnecessary. This lesson
                  keeps two models interactive so their assumptions stay
                  visible.{' '}
                  <a
                    href="https://neuronaldynamics.epfl.ch/online/Ch6.S1.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explore AdEx ↗
                  </a>
                </EditableCopy>
              </details>
            </div>
          </section>
          <section className="essay-chapter" id="comparison">
            <div className="essay-copy">
              <EditableCopy as="h2" copyId="lesson-14">
                Now give the model the real input.
              </EditableCopy>
              <EditableCopy as="p" copyId="lesson-15">
                A spike-shaped curve is only the beginning. We want the right
                response to the right input. Here we replay current recorded in
                the same experiment as the biological voltage—then change the
                trial without changing the model’s parameters.
              </EditableCopy>
            </div>
            <RecordingComparison data={recordings.data?.allen ?? null} />
            <div className="essay-copy em-section-after">
              <EditableCopy as="h3" copyId="lesson-16">
                A mismatch is a question to investigate.
              </EditableCopy>
              <EditableCopy as="p" copyId="lesson-17">
                Is the threshold wrong? Are we missing adaptation or a channel?
                Does the recording include properties our single compartment
                cannot represent? Adding detail is useful when it improves the
                prediction we care about.
              </EditableCopy>
              <EditableCopy as="p" copyId="lesson-18">
                To evaluate a fitted model, estimate its parameters using some
                trials, then predict other trials without retuning. Check spike
                timing, subthreshold voltage and responses to new stimuli. More
                equations alone are not evidence of a better emulation.
              </EditableCopy>
            </div>
          </section>
          <section id="neighbors" className="essay-chapter">
            <Chapter {...copy.network} />
            <div className="essay-wide essay-network-experiment">
              <div className="essay-network-choices">
                <Tabs
                  value={motif}
                  onValueChange={(v) => {
                    setMotif(v as Motif);
                    setSelected(0);
                    resetNetwork();
                  }}
                >
                  <TabsList>
                    {(Object.keys(motifNames) as Motif[]).map((m) => (
                      <TabsTrigger key={m} value={m}>
                        {motifNames[m]}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <Tabs
                  value={model}
                  onValueChange={(v) => {
                    setModel(v as LabModel);
                    resetNetwork();
                  }}
                >
                  <TabsList variant="line">
                    <TabsTrigger value="lif">LIF cells</TabsTrigger>
                    <TabsTrigger value="hh">HH cells</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <p className="essay-network-caption">
                <strong>{motifQuestions[motif]}</strong> {motifNotes[motif]}
              </p>
              <CircuitDiagram
                p={networkParameters}
                result={network}
                cursor={networkClock.cursor}
                selected={picked}
                onSelect={setSelected}
              />
              <div className="essay-network-key">
                <span>→ excitation</span>
                <span>⊣ inhibition</span>
                <span>Click a cell to follow its voltage</span>
              </div>
              <div className="essay-network-readout">
                <div>
                  <span className="essay-kicker">
                    You’re following {graph.nodes[picked].name}
                  </span>
                  <TracePlot
                    time={network.time}
                    lines={[
                      {
                        label: `${graph.nodes[picked].name} · raw model voltage`,
                        values: network.voltage[picked],
                        color: themeColor(
                          model === 'lif' ? '#bee780' : '#80d1ce',
                          theme,
                        ),
                      },
                    ]}
                    cursor={networkClock.cursor}
                    height={185}
                    yDomain={model === 'lif' ? [-80, -40] : [-85, 55]}
                  />
                </div>
                <NetworkRaster
                  result={network}
                  names={graph.nodes.map((n) => n.name)}
                  cursor={networkClock.cursor}
                />
              </div>
              <div className="em-network-outcome" aria-live="polite">
                {graph.nodes.map((node, i) => (
                  <span key={node.name}>
                    {node.name}: <b>{network.spikes[i].length}</b> events
                  </span>
                ))}
                <small>Full 180 ms simulation</small>
              </div>
              <StoryPlayback
                cursor={networkClock.cursor}
                max={720}
                onCursor={networkClock.setCursor}
                playing={networkClock.playing}
                onPlaying={networkClock.setPlaying}
                timeScale={0.25}
              />
              <div className="essay-network-controls">
                <StoryControl
                  label="Strength of every connection"
                  value={coupling}
                  onChange={(v) => {
                    setCoupling(v);
                    resetNetwork();
                  }}
                />
                {motif === 'modules' ? (
                  <div className="essay-bridge-controls">
                    <StoryControl
                      label="Strength between the two circuits"
                      value={bridge}
                      onChange={(v) => {
                        setBridge(v);
                        resetNetwork();
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBridge(bridge === 0 ? 1 : 0);
                        resetNetwork();
                      }}
                    >
                      {bridge === 0 ? 'Reconnect the bridge' : 'Cut the bridge'}
                    </Button>
                  </div>
                ) : (
                  <EditableCopy
                    as="p"
                    copyId="lesson-20"
                    className="essay-fine"
                  >
                    Only {graph.nodes[0].name} gets external current. The other
                    cells receive synaptic input. Set coupling to zero to remove
                    that influence.
                  </EditableCopy>
                )}
              </div>
              {motif === 'modules' && (
                <div className="essay-observation">
                  <span>Circuit B</span>
                  <p>
                    <b>
                      {network.spikes
                        .slice(3)
                        .reduce((sum, s) => sum + s.length, 0)}
                    </b>{' '}
                    spike events across B1, B2 and Bᵢ in the full run.{' '}
                    {bridge === 0
                      ? 'The bridge is cut; B receives no input from A.'
                      : 'Try cutting the bridge and compare.'}
                  </p>
                </div>
              )}
              <EditableCopy as="p" copyId="lesson-22" className="essay-fine">
                Constructed motifs, not fly connectome extracts. Every cell uses
                the selected neuron equations. Only the first cell receives 8
                µA/cm² from 20–120 ms. Coupling scales assumed conductances,
                with a 1 ms delay and decay times of 5 ms for excitation / 10 ms
                for inhibition. The network has its own default membrane
                parameters, independent of the sodium experiment above.
              </EditableCopy>
              <Link href="/lab#circuits" className="essay-text-link">
                Open the complete circuit workbench and exact edge weights ↗
              </Link>
            </div>
          </section>

          <section className="essay-chapter em-takeaway">
            <div className="essay-copy">
              <EditableCopy as="h2" copyId="lesson-23">
                One neuron is already a set of choices.
              </EditableCopy>
              <EditableCopy as="p" copyId="lesson-24">
                We chose a state to track, rules for updating it, parameters, an
                input, and a way to compare the output with a measurement. LIF
                and HH make different commitments. Which is useful depends on
                what we want to predict.
              </EditableCopy>
              <EditableCopy as="p" copyId="lesson-25">
                A circuit adds synapses, connection strengths and delays. A
                whole-brain emulation repeats these choices across many
                cells—and must still earn its claims against biological data.
                Anatomy supplies part of the model, not all of it.
              </EditableCopy>
            </div>
          </section>
          <StoryNext
            title="What happens when the wiring is real?"
            text="Take these choices into reconstructed fly circuits. Explore how the neuron model, synapses and external input change the activity of the same connected cells."
            href="/"
            label="Explore the fly connectome"
          />
          <div className="essay-source-note">
            <a
              href="https://allensdk.readthedocs.io/en/stable/_static/examples/nb/cell_types.html"
              target="_blank"
              rel="noreferrer"
            >
              Allen Cell Types recordings ↗
            </a>
            <a
              href="https://physionet.org/content/eegmmidb/1.0.0/"
              target="_blank"
              rel="noreferrer"
            >
              PhysioNet EEG ↗
            </a>
            <Link href="/lab">Full equations & parameter notebook ↗</Link>
          </div>
        </main>
        <StoryFooter />
      </div>
    </CopyEditor>
  );
}
