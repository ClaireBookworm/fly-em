'use client';
import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { membraneDefaults, simulateMembrane } from '@/lib/membrane-experiment';
import { SignalPlot } from './membrane-experiments';
import { LessonCopy } from './lesson-copy';

export interface RecordedSweep {
  sweep: number;
  label: string;
  sourceStartSeconds: number;
  dtMs: number;
  timeMs: number[];
  voltageMv: number[];
  currentPa: number[];
}
export interface AllenRecording {
  specimen: number;
  cell: string;
  source: string;
  attribution: string;
  processing: string;
  sweeps: RecordedSweep[];
}
interface EEGRecording {
  source: string;
  attribution: string;
  channel: string;
  processing: string;
  timeSeconds: number[];
  voltageUv: number[];
}
interface CompoundRecording {
  source: string;
  attribution: string;
  processing: string;
  timeMs: number[];
  amplitude: number[];
}
export function useLearnRecordings() {
  const [data, setData] = useState<{
      allen: AllenRecording;
      eeg: EEGRecording;
      compound: CompoundRecording;
    } | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    Promise.all(
      [
        '/data/learn/allen-cell.json',
        '/data/learn/eeg.json',
        '/data/learn/compound.json',
      ].map((url) =>
        fetch(url, { signal: abort.signal }).then((r) => {
          if (!r.ok) throw Error('Recording unavailable');
          return r.json();
        }),
      ),
    )
      .then(([allen, eeg, compound]) =>
        setData({
          allen: allen as AllenRecording,
          eeg: eeg as EEGRecording,
          compound: compound as CompoundRecording,
        }),
      )
      .catch((e) => {
        if (e.name !== 'AbortError') setError(true);
      });
    return () => abort.abort();
  }, []);
  return { data, error };
}

function RecordingElectrode({ kind }: { kind: 'single' | 'compound' | 'eeg' }) {
  return (
    <div className="em-electrode-location">
      <LessonCopy
        as="span"
        copyId="recording-experiments-label-1"
        className="em-electrode-label"
      >
        Where is the electrode?
      </LessonCopy>
      <svg
        viewBox="0 0 300 145"
        aria-label={
          kind === 'single'
            ? 'A patch pipette measures inside one cell relative to an outside reference.'
            : kind === 'compound'
              ? 'A cuff records outside a bundle of nerve fibers.'
              : 'Electrodes record voltage differences at the scalp.'
        }
      >
        {kind === 'single' ? (
          <>
            <circle cx="115" cy="82" r="43" />
            <path d="M131 68L217 17M141 78L230 28M215 23H264V80" />
            <circle cx="253" cy="110" r="4" />
            <text x="172" y="100">
              outside reference
            </text>
            <text x="81" y="87">
              inside
            </text>
          </>
        ) : kind === 'compound' ? (
          <>
            {[42, 66, 90, 114].map((y) => (
              <path key={y} d={`M20 ${y}H280`} />
            ))}
            <rect x="140" y="27" width="30" height="103" rx="8" />
            <path d="M155 27V9H248" />
            <text x="25" y="20">
              nerve fibers
            </text>
            <text x="190" y="140">
              recording cuff
            </text>
          </>
        ) : (
          <>
            <path d="M62 131V79a68 68 0 0 1 136 0v52" />
            <circle cx="130" cy="11" r="5" />
            <circle cx="77" cy="37" r="5" />
            <path d="M130 6V1H264M73 33L41 9H20" />
            <text x="106" y="85">
              scalp
            </text>
            <text x="207" y="31">
              electrode
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

export function RecordingOpening({
  data,
  error,
}: ReturnType<typeof useLearnRecordings>) {
  const [kind, setKind] = useState('single'),
    [zoom, setZoom] = useState(true);
  const spike = data?.allen.sweeps[0];
  const indices =
    spike?.timeMs
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => !zoom || (t >= 17 && t <= 35)) ?? [];
  return (
    <section id="recordings" className="em-recording-section">
      <div className="essay-copy">
        <LessonCopy
          as="span"
          copyId="recording-experiments-label-2"
          className="essay-kicker"
        >
          Begin with the measurement
        </LessonCopy>
        <LessonCopy as="h2" copyId="recording-heading">
          Listen to one cell.
        </LessonCopy>
        <LessonCopy copyId="recording-introduction">
          An electrode injects current into one cell and records its voltage.
          The sharp rise and fall is an action potential—a spike. This is our
          starting point.
        </LessonCopy>
      </div>
      <div className="em-recording-panel">
        <LessonCopy
          as="span"
          copyId="recording-observe-label"
          className="em-observe-label"
        >
          01 / Observe
        </LessonCopy>
        <Tabs value={kind} onValueChange={setKind}>
          <TabsList>
            <TabsTrigger value="single">One neuron</TabsTrigger>
            <TabsTrigger value="compound">A nerve bundle</TabsTrigger>
            <TabsTrigger value="eeg">Scalp EEG</TabsTrigger>
          </TabsList>
        </Tabs>
        {!data ? (
          <p aria-live="polite">
            {error
              ? 'The recordings could not load. The model experiments below still work.'
              : 'Loading the biological recordings…'}
          </p>
        ) : (
          <div className="em-recording-layout">
            <div>
              <div className="em-figure-label">
                <LessonCopy
                  as="span"
                  copyId="recording-experiments-label-3"
                  className="em-data-label"
                >
                  {kind === 'compound'
                    ? 'Biological recording · averaged'
                    : 'Biological recording'}
                </LessonCopy>
                {kind === 'single' && (
                  <Button variant="outline" onClick={() => setZoom(!zoom)}>
                    {zoom ? 'See the full response' : 'Zoom into the spike'}
                  </Button>
                )}
              </div>
              {kind === 'single' && spike && (
                <>
                  <SignalPlot
                    title="Voltage inside the cell, relative to outside"
                    time={indices.map((x) => x.t)}
                    domain={[-80, 40]}
                    lines={[
                      {
                        values: indices.map((x) => spike.voltageMv[x.i]),
                        color: 'var(--story-ink)',
                        label: 'Recorded voltage',
                      },
                    ]}
                  />
                  <SignalPlot
                    title="The current the experimenter injected"
                    time={indices.map((x) => x.t)}
                    domain={[0, 400]}
                    unit="pA"
                    height={125}
                    lines={[
                      {
                        values: indices.map((x) => spike.currentPa[x.i]),
                        color: 'var(--story-warm)',
                        label: 'Recorded stimulus',
                      },
                    ]}
                  />
                </>
              )}
              {kind === 'compound' && (
                <>
                  <SignalPlot
                    title="Compound action potential · common peroneal nerve"
                    time={data.compound.timeMs}
                    unit="normalized"
                    domain={[-1, 1]}
                    height={240}
                    lines={[
                      {
                        values: data.compound.amplitude,
                        color: 'var(--em-cool)',
                        label: 'Recorded average',
                      },
                    ]}
                  />
                  <p className="essay-fine">
                    Cat peripheral nerve; stimulus-triggered average recorded
                    with a cuff outside the nerve. Amplitude is normalized to
                    the largest absolute value, because the released file does
                    not identify its voltage unit. This trace cannot be compared
                    in size with the mV or µV plots.
                  </p>
                  <details className="essay-method-note">
                    <summary>Recording source and processing</summary>
                    <p>{data.compound.attribution}</p>
                    <p>{data.compound.processing}</p>
                    <p>
                      <a
                        href={data.compound.source}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Pennsieve dataset · CC BY 4.0 ↗
                      </a>{' '}
                      ·{' '}
                      <a href="/data/learn/compound.json" download>
                        Download waveform and provenance
                      </a>
                    </p>
                  </details>
                </>
              )}
              {kind === 'eeg' && (
                <>
                  <SignalPlot
                    title="Eyes-open resting EEG · channel Cz"
                    time={data.eeg.timeSeconds}
                    domain={[-150, 150]}
                    timeUnit="s"
                    unit="µV"
                    height={240}
                    lines={[
                      {
                        values: data.eeg.voltageUv,
                        color: 'var(--em-cool)',
                        label: 'Recorded EEG',
                      },
                    ]}
                  />
                  <p className="essay-fine">
                    Human participant S001, baseline run R01, seconds 10–14.
                    Original 160 Hz samples, calibrated to µV; no additional
                    filtering.{' '}
                    <a href={data.eeg.source} target="_blank" rel="noreferrer">
                      PhysioNet · Schalk (2009) ↗
                    </a>
                  </p>
                  <details className="essay-method-note">
                    <summary>EEG source and processing</summary>
                    <p>{data.eeg.attribution}</p>
                    <p>
                      {data.eeg.processing} Open Data Commons Attribution
                      License v1.0.
                    </p>
                    <a href="/data/learn/eeg.json" download>
                      Download the excerpt and provenance
                    </a>
                  </details>
                </>
              )}
            </div>
            <aside>
              {kind === 'single' ? (
                <figure className="em-microscopy">
                  <LessonCopy
                    as="span"
                    copyId="recording-experiments-label-4"
                    className="em-photo-kicker"
                  >
                    AT THE ELECTRODE TIP
                  </LessonCopy>
                  <a
                    href="/images/learn/whole-cell-patch-clamp.jpg"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Enlarge the patch-clamp microscopy image"
                  >
                    <Image
                      unoptimized
                      src="/images/learn/whole-cell-patch-clamp.jpg"
                      alt="A whole-cell patch-clamp electrode approaching a neuron in hippocampal CA1 tissue"
                      width="1344"
                      height="1024"
                      loading="lazy"
                    />
                  </a>
                  <figcaption>
                    Under the microscope: a glass pipette meets a cell. This CA1
                    image illustrates the technique; it is not the Allen cell
                    recorded here.
                  </figcaption>
                  <details>
                    <summary>Image credit & electrode diagram</summary>
                    <p>
                      Kathrin Bonni, Dimitrios Psyrakis & Sodikdjon A. Kodirov ·{' '}
                      <a
                        href="https://commons.wikimedia.org/wiki/File:WholeCellPatchClamp.jpg"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Wikimedia Commons
                      </a>{' '}
                      ·{' '}
                      <a
                        href="https://creativecommons.org/licenses/by-sa/3.0/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        CC BY-SA 3.0
                      </a>
                      . Original image, displayed without alteration.
                    </p>
                    <RecordingElectrode kind="single" />
                  </details>
                </figure>
              ) : (
                <RecordingElectrode kind={kind as 'compound' | 'eeg'} />
              )}
              <LessonCopy as="h3" copyId={`recording-${kind}-title`}>
                {kind === 'single'
                  ? 'One cell. One voltage.'
                  : kind === 'compound'
                    ? 'Many fibers. One compound response.'
                    : 'A different view of brain activity.'}
              </LessonCopy>
              <LessonCopy copyId={`recording-${kind}-explanation`}>
                {kind === 'single'
                  ? 'This is a mouse visual-cortex neuron recorded in a brain slice. A 3 ms current pulse evokes one spike. The time axis is shared: current is the input, voltage is the response.'
                  : kind === 'compound'
                    ? 'A compound action potential is recorded outside a nerve bundle. Signals from multiple activated axons overlap. It is different from a burst or a complex spike in one neuron.'
                    : 'Scalp electrodes measure voltage differences generated by population activity. EEG is not a count of spikes or a complete readout of the brain. Predicting it requires a model of how cellular currents produce the measured field.'}
              </LessonCopy>
              {kind === 'single' && (
                <p className="essay-fine">
                  Allen Cell Types · specimen 464212183 · sweep 12. Recorded at
                  200 kHz; displayed at 20 kHz.{' '}
                  <a href={data.allen.source} target="_blank" rel="noreferrer">
                    Source and paired data ↗
                  </a>
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
      <div className="essay-copy em-return-to-cell">
        <p>
          These are different measurements, from different preparations. We’ll
          focus on the first:{' '}
          <strong>
            given an input current, can we predict one neuron’s response?
          </strong>
        </p>
      </div>
    </section>
  );
}

export function RecordingComparison({ data }: { data: AllenRecording | null }) {
  const [trial, setTrial] = useState(0),
    [model, setModel] = useState<'lif' | 'hh'>('lif');
  const sweep = data?.sweeps[trial];
  const run = useMemo(() => {
    if (!sweep) return null;
    const p = {
      ...membraneDefaults,
      capacitance: 85.4,
      leak: 1000 / 223.4376,
      rest: -65.7717,
      threshold: -45,
    };
    return simulateMembrane(
      p,
      (t) =>
        sweep.currentPa[
          Math.min(
            sweep.currentPa.length - 1,
            Math.floor((t + 1e-7) / sweep.dtMs),
          )
        ],
      sweep.timeMs[sweep.timeMs.length - 1],
      model,
      sweep.voltageMv[0],
    );
  }, [sweep, model]);
  if (!sweep || !run || !data)
    return (
      <LessonCopy copyId={`comparison-1-${model}`} className="essay-fine">
        The comparison appears when the paired recording has loaded.
      </LessonCopy>
    );
  const measured = run.time.map(
    (t) =>
      sweep.voltageMv[
        Math.min(sweep.voltageMv.length - 1, Math.round(t / sweep.dtMs))
      ],
  );
  const measuredSpikes = sweep.voltageMv.reduce(
    (sum, v, i) => sum + Number(i > 0 && sweep.voltageMv[i - 1] < 0 && v >= 0),
    0,
  );
  return (
    <div className="em-experiment em-recording-comparison">
      <div className="em-experiment-heading">
        <LessonCopy
          as="span"
          copyId="recording-experiments-label-5"
          className="essay-kicker"
        >
          Experiment 03 · replay a real input
        </LessonCopy>
        <Tabs value={model} onValueChange={(v) => setModel(v as 'lif' | 'hh')}>
          <TabsList>
            <TabsTrigger value="lif">LIF</TabsTrigger>
            <TabsTrigger value="hh">Classic HH</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <LessonCopy copyId={`comparison-2-${model}`}>
        Both curves receive the recorded current below. Switch the trial: do the
        same model assumptions still describe what the cell did?
      </LessonCopy>
      <Tabs value={String(trial)} onValueChange={(v) => setTrial(Number(v))}>
        <TabsList>
          {data.sweeps.map((s, i) => (
            <TabsTrigger key={s.sweep} value={String(i)}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <SignalPlot
        title={`Mouse recording and ${model === 'lif' ? 'LIF' : 'classic HH'} prediction · sweep ${sweep.sweep}`}
        time={run.time}
        domain={[-85, 55]}
        lines={[
          {
            values: measured,
            color: 'var(--story-ink)',
            label: 'Biological recording',
          },
          {
            values: run.voltage,
            color: 'var(--em-cool)',
            label: 'Model prediction',
          },
        ]}
        events={run.spikes}
        height={235}
      />
      <SignalPlot
        title="Recorded injected current · identical input to the model"
        time={run.time}
        domain={[0, 400]}
        unit="pA"
        height={125}
        lines={[
          {
            values: run.input,
            color: 'var(--story-warm)',
            label: 'Recorded current',
          },
        ]}
      />
      <div className="em-comparison-counts">
        <span>
          Recorded <strong>{measuredSpikes}</strong> spikes
        </span>
        <span>
          Model <strong>{run.spikes.length}</strong> events
        </span>
        <span>Within the displayed excerpt</span>
      </div>
      <LessonCopy
        copyId={`comparison-3-${model}`}
        className="em-term-explanation"
      >
        {model === 'lif'
          ? 'LIF has no action-potential shape to match. Compare the event times and the voltage between events. Here its threshold is an assumption: a plausible-looking equation can still get the response wrong.'
          : 'This is the classic squid-axon model receiving a mouse neuron’s input. Its channels were not fitted to this cell. A more detailed mechanism does not guarantee a better prediction.'}
      </LessonCopy>
      <details className="essay-method-note">
        <summary>Exactly what is measured, inferred and assumed?</summary>
        <p>
          The input and biological voltage are from the same Allen cell and
          sweep. We replay the displayed excerpt and initialize model voltage
          from its first measured sample. Biological spike counts use upward 0
          mV crossings. This is a demonstration comparison, not a fitted-model
          benchmark or a held-out validation score.
        </p>
        <LessonCopy copyId={`comparison-5-${model}`}>
          LIF: input resistance 223.44 MΩ and time constant 19.08 ms come from
          the cell’s published summary; C ≈ τ/R = 85.4 pF and gL ≈ 4.48 nS are
          inferred passive equivalents. Rest −65.77 mV is the published summary
          value. Threshold −45 mV, reset to rest and 2 ms refractoriness are
          assumed.
        </LessonCopy>
        <LessonCopy copyId={`comparison-6-${model}`}>
          HH: C = 85.4 pF and an assumed specific capacitance of 1 µF/cm² imply
          an effective area of 8.54 × 10⁻⁵ cm². This converts the recorded pA
          input to current density. Channel densities, reversal potentials and
          6.3°C kinetics are classic squid parameters, not measured mouse
          values. No shared parameter fit is claimed.
        </LessonCopy>
        <p>
          {data.processing} Model step: 0.025 ms; model plots: 0.1 ms. The
          recorded comparison trace uses matching sample times without
          additional smoothing.
        </p>
        <p>
          {data.attribution}{' '}
          <a
            href="https://alleninstitute.org/terms-of-use/"
            target="_blank"
            rel="noreferrer"
          >
            Use terms
          </a>{' '}
          ·{' '}
          <a href="/data/learn/allen-cell.json" download>
            Download paired excerpts and provenance
          </a>
        </p>
      </details>
    </div>
  );
}
