/* Effects synchronize the playback clock and optional WebMCP interface; this project does not enable the React compiler. */
/* oxlint-disable react/react-compiler */
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme, themeColor } from '@/lib/theme';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { TracePlot } from '@/components/science-plots';
import {
  labConstants,
  labDefaults,
  labGraph,
  simulateLab,
  validateLabInput,
  type LabParameters,
  type LabModel,
  type LabTrace,
  type Motif,
  type Stimulus,
} from '@/lib/neuron-lab';

const baseColors = [
  '#bee780',
  '#80d1ce',
  '#edae7c',
  '#b8bcff',
  '#e7bbde',
  '#f6d783',
];
const motifNames: Record<Motif, string> = {
  chain: 'Feedforward chain',
  feedback: 'Excitatory feedback',
  inhibition: 'Feedforward inhibition',
  modules: 'Two interacting circuits',
};
const motifText: Record<Motif, string> = {
  chain:
    'A receives the current. Its spikes open excitatory synapses onto B; B can then recruit C. A connection can produce a subthreshold response without making the next cell spike.',
  feedback:
    'C sends excitation back to A. Activity can circulate, but whether it persists depends on membrane recovery, input strength, synaptic decay and coupling. A loop in a graph does not guarantee an oscillation.',
  inhibition:
    'A excites B directly and also recruits I. The inhibitory route takes an extra neuron and synapse, so excitation can arrive before inhibition. Watch how this changes B’s voltage and spike count.',
  modules:
    'Each module contains recurrent excitation and an inhibitory cell. A2 excites B1; B2 sends weaker excitation back to A1. Cut the bridge to see whether activity in B actually depended on A.',
};
function useInk() {
  const theme = useTheme();
  return (color: string) => themeColor(color, theme);
}
function Knob({
  label,
  value,
  min = 0,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="learn-knob">
      <div>
        <span>{label}</span>
        <output>
          {value.toFixed(step < 1 ? 2 : 0)} <small>{unit}</small>
        </output>
      </div>
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
const explanations: Record<string, string> = {
  capacitance:
    'C stores charge across the membrane. Net inward current changes voltage at a rate I/C. A larger capacitance would make the same current change voltage more slowly; C is held at 1 µF/cm² here.',
  input:
    'Iext is current injected from outside this little circuit. Positive current drives voltage upward. In the connectome demo, “input drive” instead scales an invented sensory-input pattern; it is not a recorded current.',
  leak: 'The leak is always present. Its current is gL(V − EL), which pulls voltage toward the leak reversal potential EL. For LIF, τm = C/gL controls the rate of passive relaxation.',
  sodium:
    'The sodium conductance is ḡNa m³h. Depolarization rapidly increases m (activation); h later decreases (inactivation). Opening sodium channels usually drives V toward ENa = +50 mV, creating positive feedback.',
  potassium:
    'The potassium conductance is ḡK n⁴. Activation n rises more slowly. It pulls V toward EK = −77 mV, helping end the spike and producing an after-hyperpolarization.',
};
function Membrane({
  model,
  result,
  cursor,
  p,
  term,
}: {
  model: LabModel;
  result: LabTrace;
  cursor: number;
  p: LabParameters;
  term: string;
}) {
  const ink = useInk();
  const hh = model === 'hh',
    voltage = result.voltage[0][cursor];
  const branches = hh
    ? [
        { key: 'capacitance', label: 'C', x: 70 },
        { key: 'leak', label: 'Leak', x: 190 },
        { key: 'sodium', label: 'Na⁺', x: 310 },
        { key: 'potassium', label: 'K⁺', x: 430 },
      ]
    : [
        { key: 'capacitance', label: 'C', x: 160 },
        { key: 'leak', label: 'Leak', x: 340 },
      ];
  const active = hh
    ? voltage > 0
    : result.spikes[0].some(
        (t) => result.time[cursor] >= t && result.time[cursor] - t < 2,
      );
  return (
    <div className="membrane-visual">
      <div className="membrane-reading">
        <span>Inside relative to outside</span>
        <output>
          {voltage.toFixed(1)} <small>mV</small>
        </output>
        <span className={active ? 'membrane-phase firing' : 'membrane-phase'}>
          {active
            ? hh
              ? 'Action potential'
              : 'Spike event / reset'
            : 'Membrane state'}
        </span>
      </div>
      <svg
        viewBox="0 0 500 205"
        aria-label={`${hh ? 'Hodgkin–Huxley' : 'LIF'} equivalent electrical circuit. Membrane voltage ${voltage.toFixed(1)} millivolts.`}
      >
        <title>Parallel membrane capacitance and ion conductances</title>
        <path
          d="M35 42 H465 M35 170 H465"
          fill="none"
          stroke={ink('#586c5e')}
          strokeWidth="2"
        />
        <text x="35" y="24">
          Inside · V
        </text>
        <text x="35" y="197">
          Outside · 0 mV reference
        </text>
        <g
          stroke={term === 'input' ? ink('#e9d99b') : ink('#6e8775')}
          fill="none"
        >
          <path d="M35 42V89 M35 119V170" />
          <circle cx="35" cy="104" r="15" />
          <path d="M35 113V96 M30 101L35 96L40 101" />
          <text x="17" y="78" stroke="none" fill={ink('#c1cda7')}>
            Iext
          </text>
        </g>
        {branches.map((b) => {
          const color = term === b.key ? ink('#e5f5bc') : ink('#879d8f');
          const conductance =
            b.key === 'sodium'
              ? p.sodium *
                result.gates[0][cursor] ** 3 *
                result.gates[1][cursor]
              : b.key === 'potassium'
                ? p.potassium * result.gates[2][cursor] ** 4
                : hh
                  ? 0.3
                  : 1 / p.tau;
          const current =
            b.key === 'sodium'
              ? result.currents.sodium[cursor]
              : b.key === 'potassium'
                ? result.currents.potassium[cursor]
                : result.currents.leak[cursor];
          const frac = (result.time[cursor] * 0.11) % 1,
            flowY = current >= 0 ? 62 + frac * 72 : 134 - frac * 72;
          return (
            <g
              key={b.key}
              stroke={color}
              fill="none"
              strokeWidth={term === b.key ? 2.7 : 1.7}
            >
              <path
                d={
                  b.key === 'capacitance'
                    ? `M${b.x} 42 V79 M${b.x} 126 V170`
                    : `M${b.x} 42 V79 M${b.x} 126 V138 M${b.x} 146 V170`
                }
              />
              {b.key === 'capacitance' ? (
                <>
                  <path
                    d={`M${b.x - 17} 91 H${b.x + 17} M${b.x - 17} 108 H${b.x + 17} M${b.x} 79 V91 M${b.x} 108 V126`}
                  />
                  <text x={b.x + 23} y="106" fill={color} stroke="none">
                    C
                  </text>
                </>
              ) : (
                <>
                  <rect x={b.x - 12} y="79" width="24" height="35" rx="3" />
                  <path
                    d={`M${b.x} 114 V126 M${b.x - 13} 138 H${b.x + 13} M${b.x - 7} 146 H${b.x + 7}`}
                  />
                  <text
                    x={b.x}
                    y="65"
                    textAnchor="middle"
                    fill={color}
                    stroke="none"
                  >
                    {b.label}
                  </text>
                  <text x={b.x + 19} y="147" fill={color} stroke="none">
                    E
                  </text>
                  {Math.abs(current) > 0.05 && (
                    <circle
                      cx={b.x}
                      cy={flowY}
                      r={Math.min(5, 2 + Math.abs(current) / 25).toFixed(3)}
                      fill={current < 0 ? ink('#80d1ce') : ink('#edae7c')}
                      stroke="none"
                    />
                  )}
                  <text
                    x={b.x}
                    y="187"
                    fill={color}
                    stroke="none"
                    textAnchor="middle"
                  >
                    {conductance.toFixed(2)} mS/cm²
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      <p className="learn-micro">
        Electrical equivalent circuit. Moving dots indicate ionic-current
        direction, not individual ions; dot speed is illustrative. Cyan inward ·
        peach outward.
      </p>
    </div>
  );
}
export function CircuitDiagram({
  p,
  result,
  cursor,
  selected,
  onSelect,
}: {
  p: LabParameters;
  result: LabTrace;
  cursor: number;
  selected: number;
  onSelect: (n: number) => void;
}) {
  const ink = useInk();
  const colors = baseColors.map(ink);
  const graph = labGraph(p.motif),
    time = result.time[cursor];
  return (
    <div className="network-diagram">
      <svg
        viewBox="0 0 620 280"
        aria-label={`${motifNames[p.motif]}. Select a neuron using the buttons over the diagram.`}
      >
        <title>
          Directed synaptic connections; arrowheads excite and bars inhibit
        </title>
        <defs>
          <marker
            id="lab-excite"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10" fill={ink('#8eae91')} />
          </marker>
          <marker
            id="lab-inhibit"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M5 0V10" stroke={ink('#edae7c')} strokeWidth="2" />
          </marker>
        </defs>
        {p.motif === 'modules' && (
          <>
            <rect
              x="30"
              y="30"
              width="245"
              height="236"
              rx="20"
              fill={ink('#18271d')}
            />
            <rect
              x="350"
              y="30"
              width="245"
              height="236"
              rx="20"
              fill={ink('#172729')}
            />
            <text x="45" y="54">
              Circuit A
            </text>
            <text x="365" y="54">
              Circuit B
            </text>
          </>
        )}
        {graph.edges.map((e, k) => {
          const a = graph.nodes[e.from],
            b = graph.nodes[e.to],
            distance = Math.hypot(b.x - a.x, b.y - a.y),
            ux = (b.x - a.x) / distance,
            uy = (b.y - a.y) / distance;
          const x1 = a.x + ux * 30,
            y1 = a.y + uy * 30,
            x2 = b.x - ux * 32,
            y2 = b.y - uy * 32;
          const curved =
            graph.edges.some(
              (other) => other.from === e.to && other.to === e.from,
            ) ||
            (p.motif === 'feedback' && e.from === 2);
          const cx = (x1 + x2) / 2 - uy * 55,
            cy = (y1 + y2) / 2 + ux * 55;
          const d = curved
            ? `M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}`
            : `M${x1} ${y1}L${x2} ${y2}`;
          const cut = p.coupling === 0 || (e.bridge && p.bridge === 0);
          const spike = result.spikes[e.from].find(
            (t) => time >= t && time <= t + labConstants.delay,
          );
          const f =
            spike === undefined ? 0 : (time - spike) / labConstants.delay;
          const x = curved
            ? (1 - f) ** 2 * x1 + 2 * (1 - f) * f * cx + f * f * x2
            : x1 + (x2 - x1) * f;
          const y = curved
            ? (1 - f) ** 2 * y1 + 2 * (1 - f) * f * cy + f * f * y2
            : y1 + (y2 - y1) * f;
          return (
            <g key={k} opacity={cut ? 0.18 : 1}>
              <path
                d={d}
                stroke={
                  a.inhibitory
                    ? ink('#edae7c')
                    : e.bridge
                      ? ink('#80d1ce')
                      : ink('#8eae91')
                }
                fill="none"
                strokeWidth={1.5 + e.weight}
                strokeDasharray={e.bridge ? '5 4' : undefined}
                markerEnd={`url(#lab-${a.inhibitory ? 'inhibit' : 'excite'})`}
              />
              {spike !== undefined && !cut && (
                <circle
                  cx={x}
                  cy={y}
                  r="5"
                  fill={a.inhibitory ? ink('#edae7c') : ink('#e0f8ad')}
                />
              )}
            </g>
          );
        })}
        <text x="20" y="274">
          External current → {graph.nodes[0].name} only
        </text>
      </svg>
      {graph.nodes.map((n, i) => {
        const firing = result.spikes[i].some((t) => time >= t && time - t < 2);
        return (
          <button
            key={n.name}
            className={`lab-cell ${selected === i ? 'selected' : ''} ${firing ? 'firing' : ''}`}
            aria-pressed={selected === i}
            aria-label={`Inspect neuron ${n.name}, ${n.inhibitory ? 'inhibitory' : 'excitatory'}`}
            style={
              {
                left: `${(n.x / 620) * 100}%`,
                top: `${(n.y / 280) * 100}%`,
                '--cell-color': n.inhibitory ? ink('#edae7c') : colors[i],
              } as React.CSSProperties
            }
            onClick={() => onSelect(i)}
          >
            <strong>{n.name}</strong>
            <span>{result.voltage[i][cursor].toFixed(0)} mV</span>
          </button>
        );
      })}
    </div>
  );
}
export function NetworkRaster({
  result,
  names,
  cursor,
  reveal = false,
}: {
  result: LabTrace;
  names: string[];
  cursor: number;
  reveal?: boolean;
}) {
  const ink = useInk();
  const colors = baseColors.map(ink);
  const height = 48 + names.length * 24,
    x = (t: number) => 48 + (t / 180) * 540;
  return (
    <div className="learn-network-raster">
      <span className="learn-micro">Spike times · one row per neuron</span>
      <svg
        viewBox={`0 0 620 ${height}`}
        aria-label="Spike-event raster across all neurons in the teaching circuit"
      >
        <title>
          Each tick is a simulated spike event, plotted at its detected time
        </title>
        {names.map((name, i) => (
          <g key={name}>
            <text x="34" y={26 + i * 24} textAnchor="end">
              {name}
            </text>
            <line
              x1="48"
              x2="588"
              y1={22 + i * 24}
              y2={22 + i * 24}
              stroke={ink('#314535')}
            />
            {result.spikes[i]
              .filter((t) => !reveal || t <= result.time[cursor])
              .map((t, j) => (
                <line
                  key={j}
                  x1={x(t)}
                  x2={x(t)}
                  y1={15 + i * 24}
                  y2={29 + i * 24}
                  stroke={colors[i]}
                  strokeWidth="1.7"
                />
              ))}
          </g>
        ))}
        {[0, 60, 120, 180].map((t) => (
          <text key={t} x={x(t)} y={height - 6} textAnchor="middle">
            {t}
          </text>
        ))}
        <text x="614" y={height - 6} textAnchor="end">
          ms
        </text>
        <line
          x1={x(result.time[cursor])}
          x2={x(result.time[cursor])}
          y1="9"
          y2={height - 25}
          stroke={ink('#f1f5d780')}
        />
      </svg>
    </div>
  );
}
function Playback({
  cursor,
  setCursor,
  playing,
  setPlaying,
  label,
}: {
  cursor: number;
  setCursor: (n: number) => void;
  playing: boolean;
  setPlaying: (p: boolean) => void;
  label: string;
}) {
  return (
    <div className="learn-playback">
      <button
        className="play-button"
        onClick={() => setPlaying(!playing)}
        aria-label={playing ? 'Pause animations' : 'Play animations'}
      >
        {playing ? <Pause size={17} /> : <Play size={17} />}
      </button>
      <Slider
        aria-label={label}
        min={0}
        max={720}
        step={1}
        value={[cursor]}
        onValueChange={(v) => {
          setPlaying(false);
          setCursor(Array.isArray(v) ? v[0] : v);
        }}
      />
      <output>{(cursor * 0.25).toFixed(2)} ms</output>
    </div>
  );
}
export default function NeuronLab() {
  const ink = useInk();
  const colors = baseColors.map(ink);
  const [p, setP] = useState<LabParameters>(labDefaults),
    [cursor, setCursor] = useState(80),
    [playing, setPlaying] = useState(false),
    [term, setTerm] = useState('input'),
    [selected, setSelected] = useState(0);
  const lif = useMemo(() => simulateLab(p, 'lif'), [p]),
    hh = useMemo(() => simulateLab(p, 'hh'), [p]),
    network = useMemo(() => simulateLab(p, p.model, true), [p]);
  const graph = labGraph(p.motif),
    picked = Math.min(selected, graph.nodes.length - 1);
  const state = useRef<object>({});
  useEffect(() => {
    state.current = {
      parameters: p,
      timeMs: network.time[cursor],
      selectedNeuron: graph.nodes[picked].name,
      singleCellSpikes: { lif: lif.spikes[0].length, hh: hh.spikes[0].length },
      networkSpikes: network.spikes.map((s, i) => ({
        neuron: graph.nodes[i].name,
        count: s.length,
      })),
      ready: true,
    };
  }, [p, cursor, network, lif, hh, graph, picked]);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setCursor((c) => (c + 8) % 721), 40);
    return () => clearInterval(id);
  }, [playing]);
  const update = <K extends keyof LabParameters>(
    key: K,
    value: LabParameters[K],
  ) => {
    setP((prev) => ({ ...prev, [key]: value }));
    setPlaying(false);
    setCursor(80);
  };
  useEffect(() => {
    type Tool = {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (t: Tool, o: { signal: AbortSignal }) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const life = new AbortController();
    const tools: Tool[] = [
      {
        name: 'configure_neuron_lab',
        title: 'Configure neuron teaching lab',
        description:
          'Adjust the visible LIF and HH demonstrations and small synaptic network. Every result is illustrative and unfitted.',
        inputSchema: {
          type: 'object',
          properties: {
            current: { type: 'number', minimum: 0, maximum: 20 },
            tau: { type: 'number', minimum: 5, maximum: 40 },
            sodium: { type: 'number', minimum: 0, maximum: 160 },
            potassium: { type: 'number', minimum: 0, maximum: 72 },
            coupling: { type: 'number', minimum: 0, maximum: 2 },
            bridge: { type: 'number', minimum: 0, maximum: 2 },
            stimulus: { type: 'string', enum: ['step', 'pulse', 'pair'] },
            motif: {
              type: 'string',
              enum: ['chain', 'feedback', 'inhibition', 'modules'],
            },
            model: { type: 'string', enum: ['lif', 'hh'] },
          },
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          const patch = validateLabInput(input);
          flushSync(() => {
            setP((prev) => ({ ...prev, ...patch }));
            setPlaying(false);
            setCursor(80);
            setSelected(0);
          });
          return state.current;
        },
      },
      {
        name: 'read_neuron_lab',
        title: 'Read neuron teaching lab',
        description:
          'Read parameters, selected neuron, playback time, and computed spike counts.',
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
  const download = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify({
            provenance:
              'Synthetic teaching simulations. No measured fly traces or connectome weights.',
            parameters: p,
            constants: labConstants,
            units: {
              time: 'ms',
              voltage: 'mV',
              current: 'µA/cm²',
              conductance: 'mS/cm²',
            },
            graph,
            lif,
            hh,
            network,
          }),
        ],
        { type: 'application/json' },
      ),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neuron-lab-run.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="learn-page">
      <header className="topbar">
        <Link className="brand" href="/">
          FLY<span>/</span>EM <span className="brand-sub">MODEL NOTEBOOK</span>
        </Link>
        <nav className="learn-nav" aria-label="Notebook sections">
          <ThemeToggle />
          <a href="#membrane">The neuron</a>
          <a href="#circuits">The circuit</a>
          <a href="#comparison">The evidence</a>
          <Link href="/explore" className="learn-back">
            <ArrowLeft size={14} /> Observatory
          </Link>
        </nav>
      </header>
      <main className="learn-main">
        <section className="learn-intro">
          <div>
            <span className="eyebrow">An interactive field guide · 01—03</span>
            <h1>
              How does wiring
              <br />
              become activity?
            </h1>
            <p>
              A graph says who can influence whom. Neuron equations, synapses
              and inputs determine what happens over time. Build that picture
              here, from one membrane to two interacting circuits.
            </p>
          </div>
          <aside>
            <span className="eyebrow">What you are watching</span>
            <p>
              Live numerical solutions of simplified equations. Every animated
              voltage, channel gate and spike below comes from those solutions.
            </p>
            <strong>Teaching models · no fitted fly physiology</strong>
            <button className="quiet-button" onClick={download}>
              <Download size={15} /> Download run & parameters
            </button>
          </aside>
        </section>
        <section id="membrane" className="learn-section">
          <div className="learn-section-title">
            <div>
              <span className="eyebrow">01 / A single membrane</span>
              <h2>Same input. Different rules.</h2>
            </div>
            <button
              className="quiet-button"
              onClick={() => {
                setP(labDefaults);
                setCursor(80);
                setPlaying(false);
                setSelected(0);
              }}
            >
              <RotateCcw size={14} /> Reset notebook
            </button>
          </div>
          <div className="learn-input-bar">
            <div>
              <label htmlFor="lab-stimulus">Injected current protocol</label>
              <NativeSelect
                id="lab-stimulus"
                value={p.stimulus}
                onChange={(e) => update('stimulus', e.target.value as Stimulus)}
              >
                <NativeSelectOption value="step">
                  100 ms step · 20–120 ms
                </NativeSelectOption>
                <NativeSelectOption value="pulse">
                  5 ms pulse · 20–25 ms
                </NativeSelectOption>
                <NativeSelectOption value="pair">
                  Two 5 ms pulses · 20 & 30 ms
                </NativeSelectOption>
              </NativeSelect>
            </div>
            <Knob
              label="External current density"
              value={p.current}
              max={20}
              step={0.25}
              unit="µA/cm²"
              onChange={(v) => update('current', v)}
            />
            <div className="learn-input-chart">
              <TracePlot
                time={lif.time}
                lines={[
                  {
                    label: 'Iext · identical for both cells',
                    values: lif.input,
                    color: ink('#e9d99b'),
                  },
                ]}
                unit="µA/cm²"
                height={130}
                cursor={cursor}
                yDomain={[-1, 21]}
              />
            </div>
          </div>
          <Playback
            cursor={cursor}
            setCursor={setCursor}
            playing={playing}
            setPlaying={setPlaying}
            label="Single-neuron simulation time"
          />
          <p className="learn-micro playback-note">
            Play moves through a precomputed 180 ms run, about 20× slower than
            biological time. Scrub to inspect the same moment in every diagram
            and graph. Changes recompute the run.
          </p>
          <div className="learn-models">
            {(['lif', 'hh'] as LabModel[]).map((model) => {
              const r = model === 'lif' ? lif : hh,
                isHH = model === 'hh';
              return (
                <article className={`learn-model ${model}`} key={model}>
                  <div className="learn-card-heading">
                    <span className="eyebrow">
                      {isHH
                        ? 'Channels generate the waveform'
                        : 'A threshold generates an event'}
                    </span>
                    <h3>
                      {isHH ? 'Hodgkin–Huxley' : 'Leaky integrate & fire'}
                    </h3>
                    <span className="learn-count">
                      {r.spikes[0].length} spike
                      {r.spikes[0].length === 1 ? '' : 's'} / 180 ms
                    </span>
                  </div>
                  <Membrane
                    model={model}
                    result={r}
                    cursor={cursor}
                    p={p}
                    term={term}
                  />
                  <div
                    className="learn-equation"
                    aria-label={
                      isHH
                        ? 'Capacitance times voltage derivative equals input minus leak minus sodium minus potassium currents'
                        : 'Capacitance times voltage derivative equals input minus leak current'
                    }
                  >
                    <button
                      aria-pressed={term === 'capacitance'}
                      onClick={() => setTerm('capacitance')}
                    >
                      C <span>dV/dt</span>
                    </button>
                    <b>=</b>
                    <button
                      aria-pressed={term === 'input'}
                      onClick={() => setTerm('input')}
                    >
                      I<sub>ext</sub>
                    </button>
                    <b>−</b>
                    <button
                      aria-pressed={term === 'leak'}
                      onClick={() => setTerm('leak')}
                    >
                      g<sub>L</sub>(V − E<sub>L</sub>)
                    </button>
                    {isHH && (
                      <>
                        <b>−</b>
                        <button
                          aria-pressed={term === 'sodium'}
                          onClick={() => setTerm('sodium')}
                        >
                          ḡ<sub>Na</sub>m³h(V − E<sub>Na</sub>)
                        </button>
                        <b>−</b>
                        <button
                          aria-pressed={term === 'potassium'}
                          onClick={() => setTerm('potassium')}
                        >
                          ḡ<sub>K</sub>n⁴(V − E<sub>K</sub>)
                        </button>
                      </>
                    )}
                  </div>
                  <p className="learn-rule">
                    {isHH
                      ? 'No threshold reset shapes the spike. An upward crossing of 0 mV is counted as an event for the network readout.'
                      : 'When V reaches −50 mV: emit a spike event, reset to −65 mV, hold for 2 ms. The 30 mV peak drawn below is only a marker.'}
                  </p>
                  <TracePlot
                    time={r.time}
                    lines={[
                      {
                        label: isHH
                          ? 'Calculated action-potential waveform'
                          : 'Voltage + artificial spike markers',
                        values: r.displayVoltage[0],
                        color: isHH ? ink('#80d1ce') : ink('#bee780'),
                      },
                    ]}
                    yDomain={[-85, 55]}
                    cursor={cursor}
                    reference={
                      isHH
                        ? undefined
                        : { value: -50, label: 'event threshold' }
                    }
                    height={225}
                  />
                  {isHH ? (
                    <>
                      <div className="learn-knob-pair">
                        <Knob
                          label="Maximum Na conductance"
                          value={p.sodium}
                          max={160}
                          unit="mS/cm²"
                          onChange={(v) => update('sodium', v)}
                        />
                        <Knob
                          label="Maximum K conductance"
                          value={p.potassium}
                          max={72}
                          unit="mS/cm²"
                          onChange={(v) => update('potassium', v)}
                        />
                      </div>
                      <p className="learn-micro">
                        Try Na = 0: remove sodium feedback. Changing K alters
                        recovery. This changes conductance without fitting a
                        pharmacological experiment.
                      </p>
                    </>
                  ) : (
                    <>
                      <Knob
                        label="Membrane time constant τm"
                        value={p.tau}
                        min={5}
                        max={40}
                        unit="ms"
                        onChange={(v) => update('tau', v)}
                      />
                      <p className="learn-micro">
                        C is fixed, so changing τm changes gL = C/τm: currently{' '}
                        {(1 / p.tau).toFixed(3)} mS/cm². This changes both how
                        long input is remembered and the steady depolarization
                        I/gL.
                      </p>
                      <div className="learn-try">
                        <strong>Try a weak step.</strong>
                        <p>
                          At 0.5 µA/cm² with τm = 20 ms, the LIF voltage
                          approaches −55 mV, below threshold. The curve follows
                          V(t) = E<sub>L</sub> + (I/g<sub>L</sub>)(1 − e
                          <sup>−t/τm</sup>) after input onset.
                        </p>
                        <button
                          className="quiet-button"
                          onClick={() => {
                            setP((prev) => ({
                              ...prev,
                              current: 0.5,
                              tau: 20,
                              stimulus: 'step',
                            }));
                            setPlaying(false);
                            setCursor(280);
                          }}
                        >
                          Apply weak step <ArrowRight size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
          <div className="learn-term-note">
            <span className="eyebrow">Click an equation term</span>
            <p>{explanations[term]}</p>
          </div>
          <div className="learn-channels">
            <div>
              <span className="eyebrow">Inside the HH spike</span>
              <h3>Three gates, two ionic currents.</h3>
              <p>
                m activates sodium; h makes it available; n activates potassium.
                These are continuous gating variables between 0 and 1. The
                effective channel conductances are ḡNa m³h and ḡK n⁴, not the
                gates alone.
              </p>
              <div className="gate-equation">
                dx/dt = α<sub>x</sub>(V)(1 − x) − β<sub>x</sub>(V)x
                <br />
                <small>
                  x ∈ {`{m, h, n}`}; voltage-dependent opening and closing rates
                </small>
              </div>
              <p className="learn-micro">
                Ionic currents are positive outward here, so the large inward
                sodium current is negative. Input and synaptic currents are
                defined positive inward and added to the membrane equation.
              </p>
            </div>
            <Tabs defaultValue="gates">
              <TabsList variant="line">
                <TabsTrigger value="gates">Gate dynamics</TabsTrigger>
                <TabsTrigger value="currents">Ionic currents</TabsTrigger>
              </TabsList>
              <TabsContent value="gates">
                <TracePlot
                  time={hh.time}
                  lines={hh.gates.map((values, i) => ({
                    label: [
                      'm · Na activation',
                      'h · Na availability',
                      'n · K activation',
                    ][i],
                    values,
                    color: colors[i],
                  }))}
                  unit="gate (0–1)"
                  yDomain={[-0.05, 1.05]}
                  cursor={cursor}
                />
                <div className="learn-live-values">
                  {hh.gates.map((g, i) => (
                    <span key={i}>
                      {['m', 'h', 'n'][i]} <b>{g[cursor].toFixed(3)}</b>
                    </span>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="currents">
                <TracePlot
                  time={hh.time}
                  lines={[
                    {
                      label: 'INa · inward is negative',
                      values: hh.currents.sodium,
                      color: colors[0],
                    },
                    {
                      label: 'IK',
                      values: hh.currents.potassium,
                      color: colors[2],
                    },
                    {
                      label: 'Ileak',
                      values: hh.currents.leak,
                      color: colors[1],
                    },
                  ]}
                  unit="µA/cm²"
                  cursor={cursor}
                />
              </TabsContent>
            </Tabs>
          </div>
          <details className="learn-details">
            <summary>
              All single-cell parameters and the actual gate equations
            </summary>
            <div className="learn-details-grid">
              <div>
                <h4>Units and initial conditions</h4>
                <p>
                  Time ms; voltage mV; current density µA/cm²; conductance
                  density mS/cm². Both cells have C = 1 µF/cm² and start at −65
                  mV. HH gates start at their steady values α/(α+β) at that
                  voltage. There is no added noise.
                </p>
                <h4>LIF defaults</h4>
                <p>
                  τm = 20 ms; gL = 0.05 mS/cm²; EL = reset = −65 mV; threshold =
                  −50 mV; refractory = 2 ms. No temperature-dependent kinetics.
                </p>
                <h4>HH defaults</h4>
                <p>
                  ḡNa = 120, ḡK = 36, gL = 0.3 mS/cm²; ENa = +50, EK = −77, EL =
                  −54.4 mV. Classic squid-axon kinetics at 6.3°C. The sliders
                  override ḡNa and ḡK.
                </p>
              </div>
              <div>
                <h4>HH gate rates in ms⁻¹</h4>
                <div className="learn-formulas">
                  αm = 0.1(V + 40) / [1 − exp(−(V + 40)/10)]
                  <br />
                  βm = 4 exp(−(V + 65)/18)
                  <br />
                  αh = 0.07 exp(−(V + 65)/20)
                  <br />
                  βh = 1 / [1 + exp(−(V + 35)/10)]
                  <br />
                  αn = 0.01(V + 55) / [1 − exp(−(V + 55)/10)]
                  <br />
                  βn = 0.125 exp(−(V + 65)/80)
                </div>
                <p className="learn-micro">
                  Removable singularities use their limits: αm(−40) = 1 and
                  αn(−55) = 0.1 ms⁻¹. These equations use modern absolute
                  membrane-voltage conventions.
                </p>
                <h4>Numerics</h4>
                <p>
                  Integration step 0.025 ms. Gates use exponential updates at
                  the previous voltage; voltage uses an exponential update with
                  conductances held fixed for that step. Plots sample every 0.25
                  ms. LIF display markers and raw membrane states are exported
                  separately.
                </p>
              </div>
            </div>
            <p className="learn-important">
              The same current is a controlled input comparison, not a matched
              cell: leak, effective resistance and spike mechanism differ.
              Neither parameter set was estimated from the fly recordings.
            </p>
          </details>
        </section>
        <section id="circuits" className="learn-section">
          <div className="learn-section-title">
            <div>
              <span className="eyebrow">02 / From cells to a circuit</span>
              <h2>A spike becomes someone else’s input.</h2>
            </div>
            <span className="learn-tag">
              Constructed motifs · {graph.nodes.length} neurons
            </span>
          </div>
          <p className="learn-section-deck">
            Each neuron still obeys its own membrane equation. A presynaptic
            event adds a transient conductance at a connected neuron after a
            delay. The circuit’s dynamics emerge from many such interactions.
          </p>
          <div className="learn-circuit-controls">
            <div>
              <label htmlFor="lab-motif">Circuit motif</label>
              <NativeSelect
                id="lab-motif"
                value={p.motif}
                onChange={(e) => {
                  update('motif', e.target.value as Motif);
                  setSelected(0);
                }}
              >
                {Object.entries(motifNames).map(([value, name]) => (
                  <NativeSelectOption key={value} value={value}>
                    {name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div>
              <label htmlFor="lab-network-model">
                Neuron equations in this circuit
              </label>
              <NativeSelect
                id="lab-network-model"
                value={p.model}
                onChange={(e) => update('model', e.target.value as LabModel)}
              >
                <NativeSelectOption value="lif">
                  LIF · threshold & reset
                </NativeSelectOption>
                <NativeSelectOption value="hh">
                  HH · sodium & potassium
                </NativeSelectOption>
              </NativeSelect>
            </div>
            <Knob
              label="Synaptic coupling"
              value={p.coupling}
              max={2}
              step={0.05}
              unit="×"
              onChange={(v) => update('coupling', v)}
            />
          </div>
          <div className="learn-network-grid">
            <div>
              <CircuitDiagram
                p={p}
                result={network}
                cursor={cursor}
                selected={picked}
                onSelect={setSelected}
              />
              <div className="network-key">
                <span>→ Excitatory · Erev 0 mV</span>
                <span>⊣ Inhibitory · Erev −80 mV</span>
                <span>Dashed = between circuits</span>
              </div>
              <p className="learn-network-copy">{motifText[p.motif]}</p>
              {p.motif === 'modules' && (
                <div className="learn-bridge">
                  <Knob
                    label="Between-circuit coupling"
                    value={p.bridge}
                    max={2}
                    step={0.05}
                    unit="×"
                    onChange={(v) => update('bridge', v)}
                  />
                  <button
                    className="quiet-button"
                    onClick={() => update('bridge', p.bridge === 0 ? 1 : 0)}
                  >
                    {p.bridge === 0 ? 'Reconnect bridge' : 'Cut bridge'}
                  </button>
                </div>
              )}
              <p className="learn-micro">
                The current protocol and membrane sliders above apply here too.
                Only {graph.nodes[0].name} receives injected current. Neuron
                types, edges and signs are teaching choices, not a MaleCNS
                subgraph. Animation pulses traverse the assumed 1 ms synaptic
                delay.
              </p>
            </div>
            <div className="learn-network-output">
              <div className="learn-selected">
                <h3>Neuron {graph.nodes[picked].name}</h3>
                <span>
                  {graph.nodes[picked].inhibitory
                    ? 'Inhibitory output'
                    : 'Excitatory output'}{' '}
                  · {network.spikes[picked].length} spikes
                </span>
              </div>
              <TracePlot
                time={network.time}
                lines={[
                  {
                    label: `${graph.nodes[picked].name} · ${p.model === 'lif' ? 'voltage + event markers' : 'membrane voltage'}`,
                    values: network.displayVoltage[picked],
                    color: colors[picked],
                  },
                ]}
                yDomain={[-85, 55]}
                cursor={cursor}
                height={195}
              />
              <TracePlot
                time={network.time}
                lines={[
                  {
                    label: 'Excitatory conductance received',
                    values: network.conductanceE[picked],
                    color: ink('#80d1ce'),
                  },
                  {
                    label: 'Inhibitory conductance received',
                    values: network.conductanceI[picked],
                    color: ink('#edae7c'),
                  },
                ]}
                unit="mS/cm²"
                cursor={cursor}
                height={155}
              />
              <NetworkRaster
                result={network}
                names={graph.nodes.map((n) => n.name)}
                cursor={cursor}
              />
              <div className="learn-spike-counts">
                {network.spikes.map((s, i) => (
                  <button
                    key={i}
                    aria-pressed={picked === i}
                    onClick={() => setSelected(i)}
                  >
                    <span>{graph.nodes[i].name}</span>
                    <b>{s.length}</b>
                    <small>spikes</small>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Playback
            cursor={cursor}
            setCursor={setCursor}
            playing={playing}
            setPlaying={setPlaying}
            label="Circuit simulation time"
          />
          <div className="learn-synapse-explanation">
            <div>
              <h3>Input drive vs. synaptic coupling</h3>
              <p>
                <strong>External drive</strong> is the current injected into A
                (or A1). It can excite that cell even if every connection is
                cut. <strong>Coupling</strong> scales how strongly spikes from
                other cells change the receiving cell’s conductance. Set
                coupling to zero: the driven cell can still fire, while
                downstream cells lose that input.
              </p>
            </div>
            <div>
              <div className="gate-equation">
                C dV<sub>i</sub>/dt = I<sub>ext,i</sub> − I<sub>ion,i</sub> + I
                <sub>syn,i</sub>
                <br />I<sub>syn,i</sub> = Σ<sub>j</sub> g<sub>ij</sub>s
                <sub>j</sub>(E<sub>j</sub> − V<sub>i</sub>)
              </div>
              <p>
                A presynaptic event makes s jump by 1 after 1 ms. Between
                events, ds/dt = −s/τsyn. We assume τexc = 5 ms, τinh = 10 ms and
                gij = 0.1 × coupling × edge weight mS/cm²; bridge edges also
                multiply by the bridge slider. Repeated events add.
              </p>
              <p className="learn-micro">
                The receiving voltage matters: the same open channel passes less
                current near its reversal potential. Inhibitory input can also
                reduce the impact of excitation by increasing total conductance
                (shunting).
              </p>
            </div>
          </div>
          <details className="learn-details">
            <summary>
              Exact toy connections and differences from the connectome
              simulator
            </summary>
            <div className="learn-edge-list">
              {graph.edges.map((e, i) => (
                <span key={i}>
                  {graph.nodes[e.from].name}{' '}
                  {graph.nodes[e.from].inhibitory ? '⊣' : '→'}{' '}
                  {graph.nodes[e.to].name} · weight {e.weight}
                  {e.bridge ? ' · bridge' : ''}
                </span>
              ))}
            </div>
            <p>
              There is no weight normalization in this notebook. The observatory
              instead turns recorded contact counts into normalized incoming
              weights, then uses an assumed current conversion for LIF/HH and a
              different simplified graded model. Its stimulus and synaptic
              filtering also differ. This page teaches the mechanisms; it does
              not reproduce an observatory run with identical settings.
            </p>
          </details>
        </section>
        <section id="comparison" className="learn-section learn-comparison">
          <span className="eyebrow">03 / Back to a living fly</span>
          <h2>What would make a comparison meaningful?</h2>
          <p className="learn-section-deck">
            A similar-looking curve is a hypothesis to investigate. A
            different-looking curve can reveal a model limitation, but it can
            also come from a different stimulus, cell, temperature or
            measurement. The current observatory supports exploration, not a
            quantitative validation of a fly emulation.
          </p>
          <div className="learn-comparison-grid">
            <article>
              <span className="eyebrow">T4 · whole-cell voltage</span>
              <h3>Compare voltage with voltage.</h3>
              <p>
                The experimental curves are population means ± SEM during visual
                edge motion. Match stimulus direction, speed and receptive-field
                position first; model the input pathway, or inject measured
                currents. Then compare baseline, depolarization amplitude,
                timing and direction selectivity.
              </p>
              <p>
                Measured input resistance helps constrain passive behavior. It
                is not enough to determine capacitance, channel kinetics or
                synaptic strength. A LIF event marker has no biological spike
                shape to fit.
              </p>
            </article>
            <article>
              <span className="eyebrow">E-PG / Δ7 · calcium</span>
              <h3>Model what the microscope sees.</h3>
              <p>
                ΔF/F is fluorescence, not millivolts or a list of spikes. A
                model needs a calcium and indicator response, spatial averaging
                over the same ROIs, and matching sampling. Indicator dynamics
                and calcium coupling must be estimated for the cells and sensor.
              </p>
              <p>
                Compare bump position, width, stability and cue-following in a
                common observation space. Exact voltage-trace overlays would mix
                different quantities.
              </p>
            </article>
            <article>
              <span className="eyebrow">Giant fiber · published figure</span>
              <h3>Start with the original protocol.</h3>
              <p>
                The displayed GF figure uses small expanding disk arrays. Our
                abstract looming input is different. The downloaded source table
                has integrated responses; it does not contain the raw voltage
                vectors shown in the figure.
              </p>
              <p>
                For a numerical fit, obtain those vectors, reproduce the disk
                geometry and timing, and compare evoked voltage or integrated
                response over the same window. Do not fabricate a raw trace from
                the illustration.
              </p>
            </article>
          </div>
          <p className="learn-important learn-biophysics">
            More equations do not automatically make a model more biological. T4
            computation includes graded voltage and receptor-specific
            conductances. A smaller passive or active conductance model,
            constrained by the right physiology and dendritic geometry, can be
            more appropriate than assigning classic squid spikes to every fly
            neuron.
          </p>
          <div className="learn-workflow">
            <span>
              <b>1</b> Match cell & stimulus
            </span>
            <ArrowRight size={17} />
            <span>
              <b>2</b> Fit on training trials
            </span>
            <ArrowRight size={17} />
            <span>
              <b>3</b> Predict the measured signal
            </span>
            <ArrowRight size={17} />
            <span>
              <b>4</b> Test on held-out trials
            </span>
          </div>
          <p className="learn-section-deck">
            Report trial variability and compare against a simple baseline. Test
            a targeted perturbation, such as reducing a measured inhibitory
            conductance, using the same fitted parameters. Randomized wiring is
            a useful control only when the task, input, readout and fitting
            budget stay matched.
          </p>
          <Link href="/explore" className="learn-return">
            Return to the connectome and experimental panels{' '}
            <ArrowRight size={17} />
          </Link>
        </section>
        <footer className="learn-sources">
          <div>
            <span className="eyebrow">Equations & evidence</span>
            <p>
              <a
                href="https://neuronaldynamics.epfl.ch/online/Ch1.S3.html"
                target="_blank"
                rel="noreferrer"
              >
                Gerstner et al. · integrate-and-fire formulation
              </a>
              <a
                href="https://doi.org/10.1113/jphysiol.1952.sp004764"
                target="_blank"
                rel="noreferrer"
              >
                Hodgkin & Huxley, 1952 · original membrane model
              </a>
            </p>
          </div>
          <div>
            <a
              href="https://doi.org/10.1038/s41586-022-04428-3"
              target="_blank"
              rel="noreferrer"
            >
              Groschner et al., 2022 · T4 biophysics
            </a>
            <a
              href="https://doi.org/10.1016/j.neuron.2020.08.006"
              target="_blank"
              rel="noreferrer"
            >
              Turner-Evans et al., 2020 · ring attractor
            </a>
            <a
              href="https://doi.org/10.1038/s41586-022-05562-8"
              target="_blank"
              rel="noreferrer"
            >
              Dombrovski et al., 2023 · escape pathways
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
