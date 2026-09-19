/* The optional React compiler is not enabled; effects synchronize the worker and circuit selection. */
/* oxlint-disable react/react-compiler */
/* Static export preserves the publisher's original figure URL and dimensions. */
/* oxlint-disable next/no-img-element */
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme, themeColor } from '@/lib/theme';
import {
  ArrowUpRight,
  ChevronRight,
  Download,
  FlaskConical,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Activity,
  Info,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { AtlasView } from '@/components/atlas-view';
import { SimulationPlayback } from '@/components/simulation-playback';
import { PaperGuide } from '@/components/paper-guide';
import { GlossaryText } from '@/components/glossary';
import { Evidence } from '@/components/experimental-evidence';
import type { Recordings } from '@/lib/recordings';
import {
  Heatmap,
  Raster,
  TracePlot,
  Trajectory,
} from '@/components/science-plots';
import {
  defaults,
  prepareEdges,
  type Atlas,
  type CircuitKey,
  type ModelKey,
  type Result,
  type Settings,
  type Wiring,
} from '@/lib/simulation';
import { validateConfiguration } from '@/lib/tool-contract';
const circuits = {
  escape: {
    name: 'Looming escape',
    short: 'Escape',
    index: '01',
    color: '#edae7c',
    route: 'LC4 · LPLC2 → giant fiber',
    description: 'From an approaching object to a descending escape signal.',
    question: 'Does a wired escape pathway reproduce a measured response?',
    stimulus:
      'Abstract looming drive ramps LC4 and LPLC2 inputs at different times. It does not reconstruct the retina or match the published disk array.',
  },
  heading: {
    name: 'Internal compass',
    short: 'Heading',
    index: '02',
    color: '#bee780',
    route: 'E-PG · P-EN1/2 · Δ7',
    description: 'A recurrent circuit for representing the fly’s heading.',
    question: 'Does a localized input persist after the cue disappears?',
    stimulus:
      'A localized current cue drives E-PG columns, shifts at 260 ms, then disappears at 380 ms. This engineered input is not a visual-system model.',
  },
  motion: {
    name: 'Visual motion',
    short: 'Motion',
    index: '03',
    color: '#80d1ce',
    route: 'Medulla inputs → T4a / T5a',
    description: 'Local pathways sensitive to the direction of visual motion.',
    question: 'What is lost when a graded visual circuit is made to spike?',
    stimulus:
      'A traveling pulse drives typed input cells using their soma x-coordinates as a coarse ordering. Soma position is not a receptive-field measurement.',
  },
} as const;
const models = {
  lif: {
    name: 'Leaky integrate & fire',
    short: 'LIF',
    tag: 'Threshold + reset',
    explain:
      'A passive membrane accumulates current and emits an event at −50 mV. Reset to −65 mV; 2 ms refractory period; membrane time constant 20 ms. The plotted spike height is a display marker.',
  },
  hh: {
    name: 'Hodgkin–Huxley',
    short: 'Hodgkin–Huxley',
    tag: 'Voltage-gated channels',
    explain:
      'Classic squid-axon sodium, potassium and leak equations with standard 6.3°C kinetics. Each neuron is one compartment. These channel parameters are not fitted to fly neurons.',
  },
  graded: {
    name: 'Graded conductance',
    short: 'Graded',
    tag: 'Continuous membrane voltage',
    explain:
      'A passive membrane with excitatory and inhibitory conductances and continuous transmitter release. Reversal potentials 0 / −75 mV, leak −65 mV. This is a simple conductance model, not a reconstruction of T4 dendritic computation.',
  },
} as const;
const format = (n: number) => n.toLocaleString('en-US');
function Control({
  label,
  value,
  min = 0,
  max = 2,
  step = 0.1,
  onChange,
  suffix = '',
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="control">
      <label>
        {label}
        <output>
          {value}
          {suffix}
        </output>
      </label>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  );
}
export default function Observatory() {
  const theme = useTheme();
  const [atlas, setAtlas] = useState<Atlas | null>(null),
    [recordings, setRecordings] = useState<Recordings | null>(null),
    [loadError, setLoadError] = useState('');
  const [key, setKey] = useState<CircuitKey>('heading'),
    [model, setModel] = useState<ModelKey>('lif'),
    [settings, setSettings] = useState<Settings>(defaults),
    [selected, setSelected] = useState(0),
    [view, setView] = useState('anatomy'),
    [panel, setPanel] = useState('experiment'),
    [results, setResults] = useState<Partial<Record<ModelKey, Result>>>({}),
    [busy, setBusy] = useState(true),
    [simError, setSimError] = useState(''),
    [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(false);
  const meta = {
      ...circuits[key],
      color: themeColor(circuits[key].color, theme),
    },
    circuit = atlas?.circuits[key],
    result = results[model];
  const state = useRef<unknown>(null);
  state.current = {
    circuit: key,
    model,
    wiring: settings.wiring,
    selectedNeuron: circuit?.nodes[selected]?.id,
    computing: busy,
    error: simError || null,
    resultsReady: !!result && !busy && !simError,
    spikeEvents: result?.totalSpikes ?? null,
    loaded: !!atlas,
    simulation: 'illustrative, not fitted to biological recordings',
  };
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get(
      'circuit',
    );
    if (
      requested === 'heading' ||
      requested === 'motion' ||
      requested === 'escape'
    )
      setKey(requested);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch('/data/atlas.json', { signal: controller.signal }).then((r) => {
        if (!r.ok) throw Error('Anatomy data could not be loaded.');
        return r.json();
      }),
      fetch('/data/recordings.json', { signal: controller.signal }).then(
        (r) => {
          if (!r.ok) throw Error('Experimental data could not be loaded.');
          return r.json();
        },
      ),
    ])
      .then(([a, r]) => {
        setAtlas(a as Atlas);
        setRecordings(r as Recordings);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setLoadError(e.message);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!circuit) return;
    setSelected(
      Math.max(
        0,
        circuit.nodes.findIndex((n) =>
          key === 'escape'
            ? n.type === 'DNp01'
            : key === 'heading'
              ? n.type === 'EPG' && n.label.includes('_L5')
              : n.type === 'T4a',
        ),
      ),
    );
    setCursor(0);
    setPlaying(false);
  }, [key, circuit]);
  useEffect(() => {
    if (!circuit) return;
    setBusy(true);
    setSimError('');
    setPlaying(false);
    const worker = new Worker('/workers/circuit.js', { type: 'module' });
    const timer = setTimeout(
      () => worker.postMessage({ id: 1, circuit, key, settings }),
      180,
    );
    worker.onmessage = (e) => {
      if (e.data.error) {
        setSimError(e.data.error);
        setResults({});
      } else setResults(e.data.results);
      setBusy(false);
      setCursor(0);
    };
    worker.onerror = () => {
      setSimError(
        'The simulation worker could not run. Please reload or reduce the model inputs.',
      );
      setBusy(false);
    };
    return () => {
      clearTimeout(timer);
      worker.terminate();
    };
  }, [circuit, key, settings]);
  useEffect(() => {
    if (!playing || busy) return;
    const t = setInterval(() => setCursor((c) => Math.min(600, c + 2)), 40);
    return () => clearInterval(t);
  }, [playing, busy]);
  useEffect(() => {
    if (cursor >= 600) setPlaying(false);
  }, [cursor]);
  useEffect(() => {
    type Tool = {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (i: unknown) => unknown;
    };
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const life = new AbortController();
    const tools: Tool[] = [
      {
        name: 'configure_fly_circuit',
        title: 'Select a circuit and model',
        description:
          'Select the visible fly circuit, neuron model, and optional wiring control. Recomputes illustrative simulation asynchronously.',
        inputSchema: {
          type: 'object',
          properties: {
            circuit: { type: 'string', enum: ['escape', 'heading', 'motion'] },
            model: { type: 'string', enum: ['lif', 'hh', 'graded'] },
            wiring: {
              type: 'string',
              enum: ['recorded', 'rewired', 'shuffled'],
            },
          },
          required: ['circuit'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          const x = validateConfiguration(input);
          flushSync(() => {
            setKey(x.circuit);
            if (x.model) setModel(x.model);
            if (x.wiring) setSettings((p) => ({ ...p, wiring: x.wiring! }));
          });
          return {
            configured: x,
            simulationStatus:
              'recomputation may be pending; use read_fly_observatory for state',
          };
        },
      },
      {
        name: 'read_fly_observatory',
        title: 'Read current circuit state',
        description:
          'Read the current visible circuit, selected neuron, model, wiring, and simulation status.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute(input) {
          if (
            !input ||
            typeof input !== 'object' ||
            Array.isArray(input) ||
            Object.keys(input).length
          )
            throw Error('Expected an empty object.');
          return state.current;
        },
      },
    ];
    for (const t of tools)
      try {
        Promise.resolve(context.registerTool(t, { signal: life.signal })).catch(
          () => {},
        );
      } catch {}
    return () => life.abort();
  }, []);
  const edges = useMemo(
    () => (circuit ? prepareEdges(circuit, settings) : []),
    [circuit, settings],
  );
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setSettings((p) => ({ ...p, [k]: v }));
  const choose = (k: CircuitKey) => {
    setKey(k);
    setSettings(defaults);
    setPanel('experiment');
  };
  const node = circuit?.nodes[selected];
  const peers = useMemo(
    () =>
      circuit
        ? edges
            .filter((e) => e[0] === selected || e[1] === selected)
            .sort((a, b) => b[2] - a[2])
            .slice(0, 6)
        : [],
    [circuit, edges, selected],
  );
  const download = () => {
    if (!circuit || !result) return;
    const payload = {
      dataset: atlas?.dataset,
      circuit: key,
      model,
      settings,
      neuron: circuit.nodes[selected],
      timeMs: result.time,
      voltageMv: result.voltage[selected],
      voltageDisplayNote:
        model === 'lif'
          ? 'Includes artificial +30 mV event markers; see rawVoltageMv for the actual model state.'
          : 'Sampled model voltage.',
      rawVoltageMv: result.rawVoltage[selected],
      instantaneousVoltageContributions: {
        unit: 'mV/ms',
        external: result.diagnostics.external[selected],
        synaptic: result.diagnostics.synaptic[selected],
        intrinsic: result.diagnostics.intrinsic[selected],
        derivative: result.diagnostics.derivative[selected],
        held: result.diagnostics.held[selected],
        heldLegend:
          '0 free, 1 refractory, 2 silenced; held rules override the current balance',
      },
      spikeTimesMs: result.spikes[selected],
      notice:
        'Synthetic output from an unfitted model. Not measured electrophysiology.',
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `fly-em-${key}-${model}-${node?.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div
      className="observatory"
      style={{ '--circuit': meta.color } as React.CSSProperties}
    >
      <header className="topbar">
        <a className="brand" href="/">
          FLY<span>/</span>EM{' '}
          <span className="brand-sub">CIRCUIT OBSERVATORY</span>
        </a>
        <div className="header-right">
          <ThemeToggle />
          <a href="/games/garden" className="notebook-link">
            Play with circuits <ArrowUpRight size={15} />
          </a>
          <a href="/learn" className="notebook-link">
            How neuron models work <ArrowUpRight size={15} />
          </a>
          <a href="/embodied" className="notebook-link">
            Vision & movement <ArrowUpRight size={15} />
          </a>
          <span className="dataset-mark">
            <i />
            MaleCNS v1.0
          </span>
          <a href="#methods" className="source-link">
            Data & assumptions <ArrowUpRight size={15} />
          </a>
        </div>
      </header>
      <div className="workspace">
        <aside className="rail">
          <div className="rail-intro">
            <h1>Fly circuits</h1>
            <p>
              Explore real anatomy. Change the model. Compare with measured
              biology.
            </p>
          </div>
          <div className="circuit-menu" aria-label="Choose circuit">
            {(Object.keys(circuits) as CircuitKey[]).map((k) => (
              <button
                key={k}
                className={`circuit-option ${key === k ? 'selected' : ''}`}
                onClick={() => choose(k)}
                aria-pressed={key === k}
                style={
                  {
                    '--choice': themeColor(circuits[k].color, theme),
                  } as React.CSSProperties
                }
              >
                <span className="circuit-number">{circuits[k].index}</span>
                <div>
                  <strong>{circuits[k].name}</strong>
                  <span>{circuits[k].route}</span>
                </div>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
          <div className="rail-fact">
            <span className="eyebrow">The anatomical substrate</span>
            <strong>166,700</strong>
            <span>neurons in the published male CNS inventory</span>
            <p>
              This view samples the brain and nerve cord. Only the selected
              circuit is modeled.
            </p>
            <a
              href="https://male-cns.janelia.org/"
              target="_blank"
              rel="noreferrer"
            >
              Explore the full release <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="rail-foot">
            <FlaskConical size={17} />
            <span>
              A model comparison lab.
              <br />
              No claim of fly emulation.
            </span>
          </div>
        </aside>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">Circuit {meta.index} / 03</span>
              <h2>{meta.name}</h2>
              <p>
                <GlossaryText text={meta.description} />
              </p>
            </div>
            <span className="anatomy-pill">
              <i />
              Actual EM anatomy
            </span>
          </div>
          <PaperGuide selected={key} onSelect={choose} />
          {loadError ? (
            <div className="error-card" role="alert">
              {loadError}
              <button onClick={() => location.reload()}>Retry loading</button>
            </div>
          ) : !atlas || !circuit ? (
            <div className="loading-card">
              <Activity size={22} />
              <p>Loading reconstructed neurons and experimental data…</p>
            </div>
          ) : (
            <>
              <div className="atlas-card">
                <Tabs value={view} onValueChange={(v) => setView(String(v))}>
                  <div className="card-top">
                    <TabsList variant="line">
                      <TabsTrigger value="anatomy">Anatomy</TabsTrigger>
                      <TabsTrigger value="graph">Circuit graph</TabsTrigger>
                    </TabsList>
                    <span className="small-label">
                      {format(circuit.nodes.length)} neurons{' '}
                      <span className="dot-separator">·</span>{' '}
                      {format(edges.length)} directed edges{' '}
                      <span className="dot-separator">·</span>{' '}
                      {format(edges.reduce((s, e) => s + e[2], 0))} contacts
                    </span>
                  </div>
                  <AtlasView
                    atlas={atlas}
                    circuit={circuit}
                    color={meta.color}
                    selected={selected}
                    onSelect={setSelected}
                    result={busy ? undefined : result}
                    cursor={cursor}
                    graph={view === 'graph'}
                    edges={edges}
                  />
                </Tabs>
                <div className="selection-strip">
                  <label htmlFor="neuron">Inspect neuron</label>
                  <NativeSelect
                    id="neuron"
                    value={selected}
                    onChange={(e) => setSelected(Number(e.target.value))}
                  >
                    {circuit.nodes.map((n, i) => (
                      <NativeSelectOption key={n.id} value={i}>
                        {n.label} · {n.id}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <span className="nt-label">
                    {node?.nt} <span>consensus transmitter</span>
                  </span>
                  <a
                    href={`https://neuprint.janelia.org/?dataset=male-cns:v1.0&qt=findneurons&q=${encodeURIComponent(JSON.stringify({ bodyId: node?.id }))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="source-link"
                  >
                    neuPrint <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>
              <div className="lab-heading">
                <div>
                  <h2>{meta.question}</h2>
                </div>
                <button
                  className="quiet-button"
                  onClick={() => {
                    setSettings(defaults);
                    setModel('lif');
                    setCursor(0);
                    setPlaying(false);
                  }}
                >
                  <RotateCcw size={14} />
                  Reset experiment
                </button>
              </div>
              <div className="lab-grid">
                <section className="simulation-card">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow simulated">Simulated</span>
                      <h3>Modeled membrane voltage</h3>
                    </div>
                    <span className="run-status" aria-live="polite">
                      {busy
                        ? 'Computing…'
                        : simError
                          ? 'Could not run'
                          : '600 ms simulated'}
                    </span>
                  </div>
                  <Tabs
                    value={model}
                    onValueChange={(m) => setModel(m as ModelKey)}
                  >
                    <TabsList className="model-tabs">
                      {(Object.keys(models) as ModelKey[]).map((m) => (
                        <TabsTrigger key={m} value={m}>
                          {models[m].short}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <div className="model-caption">
                    <strong>{models[model].tag}</strong>
                    <span>
                      Unfitted model · {circuit.nodes.length} single-compartment
                      neurons
                    </span>
                  </div>
                  <a href="/learn" className="model-learn-link">
                    See LIF & Hodgkin–Huxley explained with animations{' '}
                    <ArrowUpRight size={14} />
                  </a>
                  {simError ? (
                    <p className="error-card" role="alert">
                      {simError}
                    </p>
                  ) : result ? (
                    <div className={busy ? 'calculating' : ''}>
                      <SimulationPlayback
                        circuit={circuit}
                        edges={edges}
                        result={result}
                        selected={selected}
                        cursor={cursor}
                      />
                      <TracePlot
                        time={result.time}
                        lines={[
                          {
                            label: `${node?.type} · body ${node?.id}`,
                            values:
                              result.voltage[selected] ?? result.voltage[0],
                            color: meta.color,
                          },
                        ]}
                        cursor={cursor}
                        revealTo={cursor}
                      />
                      {model === 'graded' ? (
                        <Heatmap
                          rows={result.voltage}
                          label="Modeled membrane voltage · all selected neurons"
                          range={[-75, -25]}
                          color={meta.color}
                          cursor={cursor}
                          timeEnd={600}
                          reveal
                          onSelect={setSelected}
                        />
                      ) : (
                        <Raster
                          result={result}
                          onSelect={setSelected}
                          cursor={cursor}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="simulation-loading">
                      Integrating circuit equations…
                    </div>
                  )}
                  <div className="transport">
                    <button
                      className="play-button"
                      disabled={busy || !result}
                      onClick={() => {
                        if (cursor >= 600) setCursor(0);
                        setPlaying((p) => !p);
                      }}
                      aria-label={
                        playing
                          ? 'Pause simulated activity'
                          : 'Play simulated activity'
                      }
                    >
                      {playing ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <Slider
                      aria-label="Simulation time"
                      min={0}
                      max={600}
                      step={1}
                      value={[cursor]}
                      onValueChange={(v) => {
                        setPlaying(false);
                        setCursor(Array.isArray(v) ? v[0] : v);
                      }}
                    />
                    <output>{cursor} ms</output>
                    <button
                      className="icon-button"
                      disabled={busy || !result}
                      onClick={download}
                      aria-label="Download selected neuron simulation"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                  <div className="playback-explanation">
                    <span>Play reveals a computed run, about 20× slower.</span>
                    <button
                      onClick={() => {
                        setPlaying(false);
                        setCursor(cursor === 600 ? 0 : 600);
                      }}
                    >
                      {cursor === 600 ? 'Back to start' : 'Show complete run'}
                    </button>
                  </div>
                  {model === 'lif' && (
                    <p className="annotation">
                      Tall ticks in this voltage trace mark LIF spike events at
                      an artificial +30 mV; the cell readout above shows its
                      actual model voltage.
                    </p>
                  )}
                  <p className="annotation">
                    Anatomical contacts constrain this model. Membrane
                    parameters, stimulus mapping and contact-to-conductance
                    conversion are assumptions.
                  </p>
                  <div className="controls-grid">
                    <Control
                      label="Input drive"
                      value={settings.drive}
                      max={2}
                      onChange={(v) => set('drive', v)}
                      suffix="×"
                    />
                    <Control
                      label="Synaptic coupling"
                      value={settings.gain}
                      max={2}
                      onChange={(v) => set('gain', v)}
                      suffix="×"
                    />
                  </div>
                  <p className="stimulus-note">
                    <GlossaryText text={meta.stimulus} />
                  </p>
                  <p className="annotation">
                    Input drive scales the imposed stimulus. Synaptic coupling
                    scales the influence of other modeled neurons.
                  </p>
                  <button
                    className="quiet-button reverse"
                    onClick={() => set('direction', settings.direction * -1)}
                    disabled={key === 'escape'}
                  >
                    {key === 'escape'
                      ? 'Looming pulse protocol'
                      : settings.direction === 1
                        ? 'Reverse stimulus direction'
                        : 'Restore stimulus direction'}{' '}
                    <span>
                      {key === 'escape'
                        ? '100–450 ms'
                        : settings.direction === 1
                          ? '→'
                          : '←'}
                    </span>
                  </button>
                </section>
                <section className="evidence-card">
                  {recordings && (
                    <Evidence
                      key={key}
                      data={recordings[key]}
                      circuit={key}
                      model={model}
                      settings={settings}
                    />
                  )}
                </section>
              </div>
              <Tabs
                value={panel}
                onValueChange={(p) => setPanel(String(p))}
                className="analysis-tabs"
              >
                <TabsList variant="line">
                  <TabsTrigger value="experiment">
                    Perturb the circuit
                  </TabsTrigger>
                  <TabsTrigger value="activity">
                    Population dynamics
                  </TabsTrigger>
                  <TabsTrigger value="neuron">Neuron & connections</TabsTrigger>
                </TabsList>
                <TabsContent value="experiment">
                  <div className="perturb-grid">
                    <div>
                      <span className="eyebrow">Topology controls</span>
                      <h3>How much does the wiring matter?</h3>
                      <p className="muted">
                        Keep the same input and neuron equations while changing
                        connectivity. Activity alone is not evidence of
                        preserved function.
                      </p>
                      <div className="wiring-buttons">
                        {(['recorded', 'rewired', 'shuffled'] as Wiring[]).map(
                          (w) => (
                            <button
                              className={settings.wiring === w ? 'active' : ''}
                              key={w}
                              aria-pressed={settings.wiring === w}
                              onClick={() => set('wiring', w)}
                            >
                              {w === 'recorded'
                                ? 'Recorded graph'
                                : w === 'rewired'
                                  ? 'Rewire edges'
                                  : 'Shuffle weights'}
                            </button>
                          ),
                        )}
                      </div>
                      <p className="annotation">
                        {settings.wiring === 'recorded'
                          ? 'Uses the published contact counts inside the selected neuron set.'
                          : settings.wiring === 'rewired'
                            ? 'Directed edge swaps preserve each neuron’s in/out degree and the global weight distribution. Individual strengths and circuit motifs can change.'
                            : 'Permutes synapse counts over the existing directed edges. The topology and global weight distribution stay fixed.'}
                      </p>
                    </div>
                    <div className="perturb-controls">
                      <Control
                        label="Minimum contacts per edge"
                        value={settings.minContacts}
                        min={1}
                        max={20}
                        step={1}
                        onChange={(v) => set('minContacts', v)}
                      />
                      <Control
                        label="Random edge removal"
                        value={Math.round(settings.dropout * 100)}
                        max={80}
                        step={10}
                        suffix="%"
                        onChange={(v) => set('dropout', v / 100)}
                      />
                      <label className="switch-label" htmlFor="random-initial">
                        <Switch
                          id="random-initial"
                          checked={settings.randomInitial}
                          onCheckedChange={(v) => set('randomInitial', v)}
                        />
                        Random initial membrane voltages
                      </label>
                      <div className="seed-row">
                        <label htmlFor="seed">Random seed</label>
                        <input
                          id="seed"
                          type="number"
                          min="0"
                          max="999999"
                          value={settings.seed}
                          onChange={(e) =>
                            set(
                              'seed',
                              Math.max(
                                0,
                                Math.min(999999, Number(e.target.value) || 0),
                              ),
                            )
                          }
                        />
                        <button
                          className="icon-button"
                          aria-label="Try next random seed"
                          onClick={() =>
                            set('seed', (settings.seed + 1) % 1000000)
                          }
                        >
                          <Shuffle size={16} />
                        </button>
                      </div>
                      <label className="select-label" htmlFor="silence">
                        Silence a cell type
                        <NativeSelect
                          id="silence"
                          value={settings.silencedType}
                          onChange={(e) => set('silencedType', e.target.value)}
                        >
                          <NativeSelectOption value="none">
                            No silencing
                          </NativeSelectOption>
                          {[...new Set(circuit.nodes.map((n) => n.type))].map(
                            (t) => (
                              <NativeSelectOption key={t} value={t}>
                                {t}
                              </NativeSelectOption>
                            ),
                          )}
                        </NativeSelect>
                      </label>
                      <p className="annotation">
                        Random removal is a sensitivity experiment, not a
                        calibrated reconstruction-error model.
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="activity">
                  <div className="population-grid">
                    <div>
                      <h3>The same simulated activity, in two dimensions</h3>
                      <p className="muted">
                        PCA projects the time-centered membrane voltages of
                        every selected neuron onto two axes. The percentages
                        show variance captured in this run.
                      </p>
                      <p className="annotation">
                        A loop here is a property of this simulation and
                        projection. It does not establish a biological attractor
                        or a neural manifold.
                      </p>
                      {result && (
                        <div className="mini-stats">
                          <span>
                            <strong>
                              {model === 'graded'
                                ? 'Continuous'
                                : format(result.totalSpikes)}
                            </strong>
                            {model === 'graded'
                              ? 'graded output'
                              : 'spike events'}
                          </span>
                          <span>
                            <strong>{format(result.edgeCount)}</strong>retained
                            edges
                          </span>
                        </div>
                      )}
                    </div>
                    {result && (
                      <Trajectory
                        result={result}
                        color={meta.color}
                        cursor={cursor}
                      />
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="neuron">
                  <div className="neuron-grid">
                    <div>
                      <span className="eyebrow">MaleCNS body {node?.id}</span>
                      <h3>{node?.label}</h3>
                      <dl>
                        <dt>Cell type</dt>
                        <dd>{node?.type}</dd>
                        <dt>Consensus transmitter</dt>
                        <dd>{node?.nt}</dd>
                        <dt>Body classifier score</dt>
                        <dd>{node?.ntConfidence ?? 'Unavailable'}</dd>
                        <dt>Tracing status</dt>
                        <dd>{node?.status}</dd>
                      </dl>
                      <p className="annotation">
                        The classifier score is not a probability that every
                        connection or sign is correct. Receptors and
                        experimental evidence determine synaptic effect.
                      </p>
                    </div>
                    <div>
                      <h3>Strongest retained connections</h3>
                      <table>
                        <thead>
                          <tr>
                            <th>Source → target</th>
                            <th>Contacts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {peers.map(([a, b, w]) => (
                            <tr key={`${a}-${b}`}>
                              <td>
                                <button
                                  onClick={() =>
                                    setSelected(a === selected ? b : a)
                                  }
                                >
                                  {circuit.nodes[a].type} →{' '}
                                  {circuit.nodes[b].type}
                                  <small>
                                    {circuit.nodes[a].id} →{' '}
                                    {circuit.nodes[b].id}
                                  </small>
                                </button>
                              </td>
                              <td>{w}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {peers.length === 0 && (
                        <p className="muted">
                          No retained connections at this threshold.
                        </p>
                      )}
                      <p className="annotation">
                        This table follows the currently selected wiring
                        control.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              <section className="methods" id="methods">
                <div className="methods-title">
                  <Info size={18} />
                  <h3>What is measured, and what is assumed?</h3>
                </div>
                <div className="methods-grid">
                  <div>
                    <span className="eyebrow">01 / Anatomy</span>
                    <p>
                      The display uses {format(atlas.points.length)} sampled
                      somas and {Object.keys(atlas.skeletons).length} simplified
                      reconstructed skeletons from MaleCNS v1.0. It is an
                      anatomical overview, not a rendering of all 124 million
                      mapped contacts.
                    </p>
                    <p>
                      Escape and motion use subsets; the heading selection
                      contains all 130 cells of the four named types.
                      Connections outside each selection are omitted.
                    </p>
                    <a href="/data/atlas.json" download>
                      Download anatomy & selection provenance{' '}
                      <Download size={13} />
                    </a>
                  </div>
                  <div>
                    <span className="eyebrow">02 / Dynamics</span>
                    <p>{models[model].explain}</p>
                    <p>
                      Contact counts are normalized by each target’s retained
                      input total, including after perturbations. ACh is modeled
                      as excitatory; GABA, glutamate and histamine as
                      inhibitory. Other/unclear transmitters contribute no
                      modeled synaptic current. These are modeling choices.
                    </p>
                  </div>
                  <div>
                    <span className="eyebrow">03 / Validation</span>
                    <p>
                      The measurements come from different animals, preparations
                      and stimuli than this connectome. No traces are fitted,
                      time-warped, or presented as a quantitative biological
                      match.
                    </p>
                    <p>
                      A useful next experiment would match stimulus, cell type,
                      modality and perturbation, then fit on training trials and
                      test predictions on held-out recordings.
                    </p>
                    <a href="/data/recordings.json" download>
                      Download recordings & provenance <Download size={13} />
                    </a>
                  </div>
                </div>
                <details>
                  <summary>Equations, limitations and reproducibility</summary>
                  <div className="details-grid">
                    <div>
                      <h4>Current conversion</h4>
                      <p>
                        LIF: τ dV/dt = Eₗ − V + 24u + 35gs. HH: external current
                        10u + 18gs µA/cm². Graded: C dV/dt = gₗ(Eₗ − V) + gₑ(0 −
                        V) + gᵢ(−75 − V). The drive u, coupling g and normalized
                        signed network input s are dimensionless. These scale
                        factors are not inferred from EM.
                      </p>
                      <h4>Time integration</h4>
                      <p>
                        LIF and graded models use 0.1 ms steps; HH uses 0.025
                        ms. Synaptic input is refreshed every 1 ms. Spiking
                        models use an 8 ms decay; all delays are effectively
                        limited by that 1 ms update. Sampled traces are
                        displayed every 1 ms.
                      </p>
                    </div>
                    <div>
                      <h4>What would improve biological fidelity?</h4>
                      <p>
                        Fit cell-type-specific passive and active properties,
                        dendritic morphology, receptor-dependent conductances,
                        synaptic kinetics, sensory tuning and circuit boundary
                        inputs. Validate a small circuit under unseen stimuli
                        and targeted silencing before scaling up.
                      </p>
                      <h4>Why a connectome is insufficient</h4>
                      <p>
                        The graph does not provide resting state, channel
                        densities, receptor localization, release probabilities,
                        neuromodulation, or a complete electrical-synapse model.
                        Reconstruction omissions are not random, and synapse
                        detection confidence is not calibrated circuit
                        confidence.
                      </p>
                    </div>
                  </div>
                </details>
              </section>
            </>
          )}
          <footer className="page-footer">
            <span>
              FLY/EM · An experiment in connecting structure to function
            </span>
            <span>
              MaleCNS anatomy / published physiology / explicit model
              assumptions
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
