'use client';
/* Effects synchronize the replay clock and media; no React compiler is enabled. */
/* SVG scientific plots need role=img; native form controls are wrapped by the installed component. */
/* oxlint-disable react/react-compiler, jsx-a11y/prefer-tag-over-role */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { ThemeToggle } from '@/components/theme-toggle';
import DigitalSphinx from '@/components/digital-sphinx';
import {
  muscleReadout,
  motionLesson,
  type MuscleIntervention,
  type WingReplay,
  type VisionReplay,
} from '@/lib/embodied';

const sources = {
  flyvis: 'https://doi.org/10.1038/s41586-024-07939-3',
  nmf: 'https://doi.org/10.1038/s41592-024-02497-y',
  wing: 'https://doi.org/10.1038/s41586-023-06099-0',
  hinge: 'https://doi.org/10.1038/s41586-024-07293-4',
  manc: 'https://elifesciences.org/articles/96084',
  colour: 'https://doi.org/10.1038/s41593-024-01640-4',
  inventory: 'https://doi.org/10.1038/s41586-025-08746-0',
  body: 'https://doi.org/10.1038/s41586-025-09029-4',
};
const colors = [
  'var(--primary)',
  'var(--ink-cool)',
  'var(--ink-warm)',
  'var(--ink-violet)',
  'var(--foreground)',
];

function useReplay<T>(url: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error('The replay could not be loaded.');
        return r.json();
      })
      .then((value) => setData(value as T))
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => controller.abort();
  }, [url]);
  return { data, error };
}
function useClock(duration: number, speed: number, initial = 0) {
  const [time, setTime] = useState(initial),
    [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    let previous = performance.now(),
      raf = 0;
    const tick = (now: number) => {
      if (now - previous < 30) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const delta = Math.min(now - previous, 100) * speed;
      previous = now;
      setTime((t) => Math.min(duration, t + delta));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration, speed]);
  useEffect(() => {
    if (time >= duration) setPlaying(false);
  }, [time, duration]);
  return { time, setTime, playing, setPlaying, duration };
}
type Clock = ReturnType<typeof useClock>;
function ReplayClock({
  clock,
  label,
  offset = 0,
}: {
  clock: Clock;
  label: string;
  offset?: number;
}) {
  return (
    <div className="embodied-clock">
      <Button
        variant="outline"
        aria-label={clock.playing ? `Pause ${label}` : `Play ${label}`}
        onClick={() => {
          if (clock.time >= clock.duration) clock.setTime(0);
          clock.setPlaying(!clock.playing);
        }}
      >
        {clock.playing ? <Pause size={15} /> : <Play size={15} />}
        <span>
          {clock.playing
            ? 'Pause'
            : clock.time >= clock.duration
              ? 'Replay'
              : 'Play'}
        </span>
      </Button>
      <Slider
        aria-label={`${label} time in milliseconds`}
        value={[clock.time]}
        min={0}
        max={clock.duration}
        step={0.5}
        onValueChange={(v) => {
          clock.setPlaying(false);
          clock.setTime(Array.isArray(v) ? v[0] : v);
        }}
      />
      <output>{Math.round(clock.time + offset)} ms</output>
    </div>
  );
}
function Trace({
  lines,
  duration,
  cursor,
  min,
  max,
  unit = 'a.u.',
  start = 0,
}: {
  lines: {
    values: number[];
    color?: string;
    label: string;
    dt: number;
    offset?: number;
  }[];
  duration: number;
  cursor: number;
  min: number;
  max: number;
  unit?: string;
  start?: number;
}) {
  const W = 660,
    H = 175,
    x = (t: number) => 46 + ((t - start) / duration) * 598,
    y = (v: number) => 143 - ((v - min) / (max - min || 1)) * 120;
  return (
    <svg
      className="embodied-trace"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${lines.map((l) => l.label).join(', ')}; ${unit}; visible to ${Math.round(cursor)} milliseconds`}
    >
      <text x={3} y={13} fontSize={12} fill="currentColor">
        {unit}
      </text>
      {[min, (min + max) / 2, max].map((v) => (
        <g key={v}>
          <line
            x1={46}
            y1={y(v)}
            x2={644}
            y2={y(v)}
            stroke="var(--border)"
            strokeDasharray="3 5"
          />
          <text
            x={38}
            y={y(v) + 4}
            textAnchor="end"
            fontSize={12}
            fill="currentColor"
          >
            {Math.abs(v) < 2 ? v.toFixed(1) : Math.round(v)}
          </text>
        </g>
      ))}
      {lines.map((l, j) => (
        <polyline
          key={l.label}
          fill="none"
          stroke={l.color || colors[j % colors.length]}
          strokeWidth={1.6}
          points={l.values
            .flatMap((v, i) => {
              const t = (l.offset || 0) + i * l.dt;
              return t >= start && t <= Math.min(cursor, start + duration)
                ? [`${x(t).toFixed(1)},${y(v).toFixed(1)}`]
                : [];
            })
            .join(' ')}
        />
      ))}
      <line
        x1={x(Math.max(start, Math.min(start + duration, cursor)))}
        x2={x(Math.max(start, Math.min(start + duration, cursor)))}
        y1={20}
        y2={145}
        stroke="var(--foreground)"
        opacity={0.45}
      />
      {[0, 0.5, 1].map((f) => (
        <text
          key={f}
          x={46 + 598 * f}
          y={165}
          fontSize={12}
          fill="currentColor"
          textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}
        >
          {Math.round(start + duration * f)} ms
        </text>
      ))}
    </svg>
  );
}
function SpikeRaster({
  trains,
  cursor,
  start = 3000,
  duration = 1000,
  prefix = 'MN',
}: {
  trains: number[][];
  cursor: number;
  start?: number;
  duration?: number;
  prefix?: string;
}) {
  return (
    <svg
      className="embodied-trace"
      viewBox="0 0 660 167"
      role="img"
      aria-label={`${prefix} spike times, ${start} to ${start + duration} milliseconds`}
    >
      {trains.map((train, i) => (
        <g key={i}>
          <text x={2} y={27 + i * 25} fontSize={12} fill="currentColor">
            {prefix} {i + 1}
          </text>
          <line
            x1={48}
            x2={644}
            y1={24 + i * 25}
            y2={24 + i * 25}
            stroke="var(--border)"
          />
          {train
            .filter(
              (t) => t >= start && t <= Math.min(cursor, start + duration),
            )
            .map((t, j) => (
              <line
                key={j}
                x1={48 + ((t - start) / duration) * 596}
                x2={48 + ((t - start) / duration) * 596}
                y1={16 + i * 25}
                y2={32 + i * 25}
                stroke={colors[i]}
                strokeWidth={1.6}
              />
            ))}
        </g>
      ))}
      <line
        x1={
          48 +
          (Math.max(0, Math.min(duration, cursor - start)) / duration) * 596
        }
        x2={
          48 +
          (Math.max(0, Math.min(duration, cursor - start)) / duration) * 596
        }
        y1={12}
        y2={137}
        stroke="var(--foreground)"
        opacity={0.5}
      />
      <text x={48} y={160} fontSize={12} fill="currentColor">
        {start} ms
      </text>
      <text x={644} y={160} textAnchor="end" fontSize={12} fill="currentColor">
        {start + duration} ms
      </text>
    </svg>
  );
}
function HexField({
  nodes,
  values,
  selected,
  onSelect,
  title,
  signed = false,
  scale = 1,
}: {
  nodes: { u: number; v: number }[];
  values: number[];
  selected?: number;
  onSelect?: (i: number) => void;
  title: string;
  signed?: boolean;
  scale?: number;
}) {
  return (
    <svg
      className="embodied-grid"
      viewBox="-158 -158 316 316"
      role="img"
      aria-label={title}
    >
      {nodes.map((n, i) => {
        const value = values[i] || 0,
          magnitude = Math.min(1, Math.abs(value) / (scale || 1)),
          cx = (n.u + n.v / 2) * 9,
          cy = n.v * 7.794;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={selected === i ? 5.6 : 3.8}
            fill={
              signed
                ? value >= 0
                  ? 'var(--ink-warm)'
                  : 'var(--ink-cool)'
                : `rgb(${Math.round(Math.max(0, Math.min(1, value)) * 255)} ${Math.round(Math.max(0, Math.min(1, value)) * 255)} ${Math.round(Math.max(0, Math.min(1, value)) * 255)})`
            }
            fillOpacity={signed ? 0.08 + 0.9 * magnitude : 1}
            stroke={selected === i ? 'var(--foreground)' : 'none'}
            strokeWidth={2}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect && selected === i ? 0 : undefined}
            aria-label={
              onSelect
                ? `${title}, column ${n.u}, ${n.v}, activity ${value.toFixed(3)}`
                : undefined
            }
            onClick={onSelect ? () => onSelect(i) : undefined}
            onKeyDown={
              onSelect
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(i);
                    }
                  }
                : undefined
            }
          >
            <title>
              {n.u}, {n.v}: {value.toFixed(3)}
            </title>
          </circle>
        );
      })}
    </svg>
  );
}

const cellExplanations: Record<string, string> = {
  R1: 'One outer photoreceptor class. The replay supplies luminance to a simplified receptor layer; it does not simulate phototransduction chemistry.',
  L1: 'A lamina neuron contributing to the ON motion pathway. Contrast and temporal filtering begin before direction selectivity emerges.',
  L2: 'A lamina neuron contributing to the OFF pathway. ON and OFF mean brightness increments and decrements, not excitatory and inhibitory synapses.',
  Mi1: 'A major medulla input to T4. Its spatial and temporal response combines with other inputs at the T4 dendrite.',
  Tm3: 'A transmedullary input to T4. Individual inputs need not prefer a motion direction for their combination to do so.',
  Mi4: 'One of the spatially offset inputs to T4. Different input timings can help distinguish two motion directions.',
  Mi9: 'An input to the T4 circuit; synaptic sign and timing contribute to the computation. Transmitter identity alone is not a full synaptic model.',
  T4a: 'An ON-motion output subtype. The four T4 subtypes prefer different local motion directions.',
  T4b: 'Another ON-motion subtype. Compare the same moving stimulus with T4a, then compare positions within each layer.',
  T5a: 'An OFF-motion output subtype. T5 cells detect motion of dark features through a different input circuit from T4.',
  T5b: 'Another OFF-motion subtype. These are continuous model activities, so a peak is not an action potential.',
};
function VisionInspector() {
  const { data, error } = useReplay<VisionReplay>(
    '/data/embodied/vision-replay.json',
  );
  const { data: parameters } = useReplay<{
    cellParameters: NonNullable<VisionReplay['cellParameters']>;
  }>('/data/embodied/vision-parameters.json');
  const clock = useClock(500, 0.1),
    video = useRef<HTMLVideoElement>(null);
  const [type, setType] = useState('T4a'),
    [eye, setEye] = useState(0),
    [column, setColumn] = useState(0);
  const indices = useMemo(
    () => data?.nodes.flatMap((n, i) => (n.type === type ? [i] : [])) || [],
    [data, type],
  );
  const center = indices.findIndex(
    (i) => data?.nodes[i].u === 0 && data?.nodes[i].v === 0,
  );
  const localIndex =
    column < 0 ? Math.max(0, center) : Math.min(column, indices.length - 1);
  const nodeIndex = indices[localIndex],
    node = data?.nodes[nodeIndex];
  const frameIndex = data
    ? Math.max(
        0,
        data.frames.findLastIndex((f) => f.timeMs <= clock.time),
      )
    : 0;
  const frame = data?.frames[frameIndex];
  const trace = useMemo(
    () =>
      data && node ? data.frames.map((f) => f.activity[eye][nodeIndex]) : [],
    [data, node, nodeIndex, eye],
  );
  const baseline = data?.frames[0];
  const changes = indices.map(
    (i) => (frame?.activity[eye][i] || 0) - (baseline?.activity[eye][i] || 0),
  );
  const activityScale = useMemo(
    () =>
      data
        ? Math.max(
            0.01,
            ...data.frames.flatMap((f) =>
              indices.map((i) =>
                Math.abs(f.activity[eye][i] - data.frames[0].activity[eye][i]),
              ),
            ),
          )
        : 1,
    [data, eye, indices],
  );
  useEffect(() => {
    setColumn(-1);
  }, [type]);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const expected = clock.time / 100;
    if (Math.abs(el.currentTime - expected) > 0.12 || !clock.playing)
      el.currentTime = expected;
    if (clock.playing) el.play().catch(() => {});
    else el.pause();
  }, [clock.time, clock.playing, data]);
  if (!data)
    return (
      <div className="embodied-figure embodied-state" role="status">
        {error || 'Loading the synchronized visual replay…'}
      </div>
    );
  return (
    <figure className="embodied-figure">
      <div className="embodied-figure-title">
        <h3>A stationary fly watches another fly walk past</h3>
        <span className="embodied-kicker">
          Research models · local replay · 10× slower
        </span>
      </div>
      <div className="embodied-world">
        <div>
          <h3>MuJoCo world</h3>
          <div className="embodied-video-viewport">
            <video
              ref={video}
              src="/data/embodied/observer.mp4"
              muted
              playsInline
              preload="auto"
              aria-label="Synchronized NeuroMechFly simulation: stationary observer and walking target"
            />
          </div>
          <p className="embodied-caption">
            The camera view is for us. The observer receives the sampled view at
            right. The horizontal fly is the observer; the other is the target.
          </p>
        </div>
        <div>
          <h3>{eye === 0 ? 'Left' : 'Right'} eye input</h3>
          <HexField
            nodes={data.retina}
            values={frame?.retina[eye] || []}
            title="Retinal luminance"
          />
          <p className="embodied-caption">
            721 grayscale samples in FlyVis coordinates. One dot is a model
            input location. White is brighter, black is darker.
          </p>
        </div>
        <div>
          <h3>{type} layer</h3>
          <HexField
            nodes={indices.map((i) => data.nodes[i])}
            values={changes}
            selected={localIndex}
            onSelect={setColumn}
            title={type}
            signed
            scale={activityScale}
          />
          <p className="embodied-caption">
            Click a cell. Orange = increase; teal = decrease from the first
            frame. Scale ±{activityScale.toFixed(2)} a.u.
          </p>
        </div>
      </div>
      <ReplayClock clock={clock} label="visual replay" />
      <div className="embodied-controls">
        <label htmlFor="vision-eye">
          Eye
          <NativeSelect
            id="vision-eye"
            value={eye}
            onChange={(e) => setEye(Number(e.target.value))}
          >
            <NativeSelectOption value={0}>Left eye</NativeSelectOption>
            <NativeSelectOption value={1}>Right eye</NativeSelectOption>
          </NativeSelect>
        </label>
        <label htmlFor="vision-type">
          Cell type
          <NativeSelect
            id="vision-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {data.types.map((t) => (
              <NativeSelectOption key={t} value={t}>
                {t}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label htmlFor="vision-cell">
          Cell position (column coordinates)
          <NativeSelect
            id="vision-cell"
            value={localIndex}
            onChange={(e) => setColumn(Number(e.target.value))}
          >
            {indices.map((i, j) => (
              <NativeSelectOption key={i} value={j}>
                {data.nodes[i].u}, {data.nodes[i].v}
                {data.nodes[i].u === 0 && data.nodes[i].v === 0
                  ? ' · centre'
                  : ''}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
      </div>
      <div className="embodied-split">
        <div>
          <h3>
            {type} ({node?.u}, {node?.v}) · raw activity
          </h3>
          <Trace
            lines={[
              {
                label: type,
                values: trace,
                dt: data.sampleDtMs,
                offset: data.frames[0].timeMs,
              },
            ]}
            duration={500}
            cursor={clock.time}
            min={Math.min(...trace) - 0.05}
            max={Math.max(...trace) + 0.05}
          />
          <p className="embodied-caption">
            The trace is sampled directly from this model cell during this
            video. It is continuous activity in arbitrary units, not mV, Hz,
            spikes, or a biological recording.
          </p>
        </div>
        <div>
          <p>
            {cellExplanations[type] ||
              'A transmedullary cell in the motion-processing network. Its activity depends on the visual input and its recurrent connections.'}
          </p>
          <div className="embodied-metrics">
            <div>
              <strong>{frame?.activity[eye][nodeIndex]?.toFixed(3)}</strong>
              current activity · a.u.
            </div>
            <div>
              <strong>{data.totalCellsPerEye.toLocaleString()}</strong>simulated
              cells per eye
            </div>
          </div>
          <p className="embodied-caption">
            Model identity: {type}, column ({node?.u}, {node?.v}), index{' '}
            {node?.index}. These are tiled FlyVis cells, not matched MaleCNS
            body IDs.
          </p>
          {parameters?.cellParameters[type] && (
            <dl className="embodied-parameters">
              <div>
                <dt>Fitted bias</dt>
                <dd>{parameters.cellParameters[type].bias.toFixed(3)} a.u.</dd>
              </div>
              <div>
                <dt>Fitted time constant</dt>
                <dd>
                  {(
                    parameters.cellParameters[type].timeConstantSeconds * 1000
                  ).toFixed(2)}{' '}
                  ms
                </dd>
              </div>
              <div>
                <dt>Release</dt>
                <dd>Rectified activity</dd>
              </div>
            </dl>
          )}
        </div>
      </div>
      <details>
        <summary>
          What makes the target walk? Where does the visual model end?
        </summary>
        <p>
          The target’s left/right descending drive is fixed at [1, 1]; the
          observer’s is [0, 0]. A hybrid controller combines a walking rhythm
          with sensory corrections and commands joint actuators. The target is
          moving because of that controller. The observer’s visual activity does
          not drive either animal in this example.
        </p>
        <p>
          The separate published following example adds a hand-written readout
          of visual-cell activity, then feeds the resulting turning drive into
          the walking controller. That interface is an additional assumption; it
          is not a reconstructed visual-neuron → descending-neuron →
          motor-neuron chain.{' '}
          <a href="https://github.com/NeLy-EPFL/flygym-gymnasium/blob/d285260a1c8a7b3494150cd1590f2c9fe4b5e06b/flygym_gymnasium/examples/vision/follow_fly_closed_loop.py">
            Inspect the published controller.
          </a>
        </p>
        <Trace
          lines={[
            {
              label: 'Target joint angle',
              values: data.frames.map((f) => f.targetJoints[0]),
              dt: data.sampleDtMs,
              offset: data.frames[0].timeMs,
            },
          ]}
          duration={500}
          cursor={clock.time}
          min={Math.min(...data.frames.map((f) => f.targetJoints[0])) - 0.1}
          max={Math.max(...data.frames.map((f) => f.targetJoints[0])) + 0.1}
          unit="rad"
        />
        <p className="embodied-caption">
          Left front coxa joint (joint_LFCoxa): physical joint position from the
          same run. This is a motor/controller readout, not a neural firing
          trace.
        </p>
      </details>
      <details>
        <summary>Model, methods, and downloadable data</summary>
        <p>
          <a href={sources.flyvis}>Lappalainen et al. (2024)</a> constrained a
          recurrent network with anatomical connectivity and trained it on optic
          flow. Its 64 cell types use shared parameters across a tiled visual
          field. This replay uses checkpoint flow/0000/000, with 15 cell types
          exposed for inspection; the full network runs underneath.{' '}
          <a href={sources.nmf}>NeuroMechFly v2</a> supplies the body, eyes, and
          physics.
        </p>
        <p className="embodied-caption">
          The implementation has 65 group labels because CT1 is split into two
          compartments. Retina and activity use the nearest earlier saved frame,
          held between 10 ms samples.
        </p>
        <p>
          The movie, retina, neural states, and joint positions were exported
          together. Physics steps: 0.1 ms; visual-network steps: 5 ms; web data
          samples: 10 ms. Playback changes the time cursor; it does not rerun or
          retrain the model.
        </p>
        <p>
          Each cell follows τeffective da/dt = −a + bias + Σ w · ReLU(apre) +
          input. The weight combines anatomical contact count, sign, and fitted
          synaptic strength. The implementation floors the effective time
          constant at the 5 ms integration step. A cell’s activity therefore
          reflects both current input and the network’s previous state. These
          fitted quantities are not measured membrane capacitances or
          ion-channel conductances.
        </p>
        <p>
          <a href="/data/embodied/vision-replay.json" download>
            Download this replay and provenance
          </a>
        </p>
      </details>
    </figure>
  );
}

function MotionExplainer() {
  const [direction, setDirection] = useState<'right' | 'left'>('right'),
    [delay, setDelay] = useState(70),
    [contrast, setContrast] = useState(1);
  const data = useMemo(
    () => motionLesson(direction, contrast, delay),
    [direction, contrast, delay],
  );
  const clock = useClock(1200, 0.25, 560),
    i = Math.min(600, Math.floor(clock.time / 2));
  return (
    <figure className="embodied-figure">
      <div className="embodied-figure-title">
        <h3>Why two neighbouring inputs need different timing</h3>
        <span className="embodied-kicker">
          Teaching algorithm · not a T4 reconstruction
        </span>
      </div>
      <div className="embodied-controls">
        <label htmlFor="motion-direction">
          Moving light bar
          <NativeSelect
            id="motion-direction"
            value={direction}
            onChange={(e) => {
              setDirection(e.target.value as 'right' | 'left');
              clock.setTime(0);
            }}
          >
            <NativeSelectOption value="right">Left → right</NativeSelectOption>
            <NativeSelectOption value="left">Right → left</NativeSelectOption>
          </NativeSelect>
        </label>
        <label>
          Temporal filter · {delay} ms
          <Slider
            value={[delay]}
            min={2}
            max={200}
            step={2}
            aria-label="Temporal filter time constant"
            onValueChange={(v) => setDelay(Array.isArray(v) ? v[0] : v)}
          />
        </label>
        <label>
          Contrast · {contrast.toFixed(1)}
          <Slider
            value={[contrast]}
            min={0}
            max={1}
            step={0.1}
            aria-label="Visual contrast"
            onValueChange={(v) => setContrast(Array.isArray(v) ? v[0] : v)}
          />
        </label>
      </div>
      <div className="embodied-split">
        <svg
          viewBox="0 0 470 250"
          className="embodied-mechanics"
          role="img"
          aria-label="Two receptors, low-pass delays, multiplication, and subtraction form an opponent motion detector"
        >
          {[
            { x: 95, label: 'Left receptor', v: data.left[i] },
            { x: 350, label: 'Right receptor', v: data.right[i] },
          ].map((r) => (
            <g key={r.label}>
              <circle
                cx={r.x}
                cy={40}
                r={19}
                fill="var(--ink-warm)"
                fillOpacity={0.1 + 0.9 * r.v}
                stroke="currentColor"
              />
              <text
                x={r.x}
                y={13}
                fontSize={13}
                textAnchor="middle"
                fill="currentColor"
              >
                {r.label}
              </text>
            </g>
          ))}
          <g fill="none" stroke="var(--muted-foreground)" strokeWidth={1.5}>
            <path d="M95 60 V105 H173 V151 M350 60 V151 H190 M350 60 V105 H290 V151 M95 60 V151 H272" />
            <path d="M182 170 V206 H231 M282 170 V206 H248" />
          </g>
          <g fill="var(--card)" stroke="var(--border)">
            <rect x={60} y={80} width={70} height={30} rx={4} />
            <rect x={315} y={80} width={70} height={30} rx={4} />
          </g>
          <g fontSize={14} fill="currentColor" textAnchor="middle">
            <text x={95} y={100}>
              delay
            </text>
            <text x={350} y={100}>
              delay
            </text>
            <text x={182} y={166}>
              ×
            </text>
            <text x={282} y={166}>
              ×
            </text>
            <text x={239} y={211}>
              −
            </text>
            <text x={235} y={242}>
              Motion signal: {data.response[i].toFixed(3)}
            </text>
          </g>
        </svg>
        <div>
          <Trace
            lines={[
              {
                label: 'Left luminance',
                values: data.left,
                dt: 2,
                color: colors[0],
              },
              {
                label: 'Right luminance',
                values: data.right,
                dt: 2,
                color: colors[1],
              },
            ]}
            duration={1200}
            cursor={clock.time}
            min={0}
            max={1}
          />
          <p className="embodied-caption">
            Green: left input. Teal: right input. Their order reverses when the
            light bar reverses.
          </p>
        </div>
      </div>
      <Trace
        lines={[
          { label: 'Opponent motion response', values: data.response, dt: 2 },
        ]}
        duration={1200}
        cursor={clock.time}
        min={-0.6}
        max={0.6}
      />
      <ReplayClock clock={clock} label="motion computation" />
      <p>
        A single brightness measurement cannot tell you which way something
        moved. Here, a lingering copy of the left signal overlaps the fresh
        right signal more than the reverse combination. Reverse the order and
        the output changes sign. Set contrast to zero and there is nothing to
        detect.
      </p>
      <details>
        <summary>Equations and relation to the biological circuit</summary>
        <p>
          τ dL̃/dt = L − L̃; τ dR̃/dt = R − R̃; D = L̃R − R̃L. The “delay” is a
          low-pass filter, not a fixed waiting period. The
          multiplier-and-subtractor diagram is a Reichardt-style teaching
          abstraction. Actual T4/T5 neurons combine spatially offset, temporally
          filtered inputs through dendrites and synapses; their computation is
          not established by drawing this diagram. The fitted FlyVis replay
          above is a different model.{' '}
          <a href={sources.flyvis}>
            Compare the circuit mechanisms studied in FlyVis.
          </a>
        </p>
      </details>
    </figure>
  );
}

function WingInspector() {
  const { data, error } = useReplay<WingReplay>(
    '/data/embodied/wing-replay.json',
  );
  const [variant, setVariant] = useState<'published' | 'uncoupled' | 'strong'>(
      'published',
    ),
    [cell, setCell] = useState(0),
    [intervention, setIntervention] = useState<MuscleIntervention>('intact'),
    [zoom, setZoom] = useState(false);
  const clock = useClock(1000, zoom ? 0.005 : 0.05, 0),
    t = 3000 + clock.time;
  const run = data?.variants[variant],
    mechanics = run ? muscleReadout(run.spikes, t, cell, intervention) : null;
  const original = run ? muscleReadout(run.spikes, t, cell, 'intact') : null;
  if (!data || !run || !mechanics || !original)
    return (
      <div className="embodied-figure embodied-state" role="status">
        {error || 'Loading the wing motor model and recorded spike times…'}
      </div>
    );
  const recent = run.spikes.map((s) =>
    s.some((event) => t >= event && t - event < 5),
  );
  const selectedVoltage =
    run.voltage[cell][
      Math.min(run.voltage[cell].length - 1, Math.floor(t / data.sampleDtMs))
    ];
  const xTip = (angle: number) => 590 + 85 * Math.cos((angle * Math.PI) / 180),
    yTip = (angle: number) => 128 - 85 * Math.sin((angle * Math.PI) / 180);
  return (
    <figure className="embodied-figure">
      <div className="embodied-figure-title">
        <h3>Five motor neurons supplying the flight power muscles</h3>
        <span className="embodied-kicker">
          Published neural model + assumed muscle mechanics
        </span>
      </div>
      <div className="embodied-controls">
        <label htmlFor="wing-variant">
          Neural simulation
          <NativeSelect
            id="wing-variant"
            value={variant}
            onChange={(e) => {
              setVariant(e.target.value as typeof variant);
              clock.setPlaying(false);
              clock.setTime(0);
            }}
          >
            <NativeSelectOption value="published">
              Published weak coupling
            </NativeSelectOption>
            <NativeSelectOption value="uncoupled">
              Remove electrical coupling
            </NativeSelectOption>
            <NativeSelectOption value="strong">
              Increase coupling to 3 nS
            </NativeSelectOption>
          </NativeSelect>
        </label>
        <label htmlFor="wing-cell">
          Inspect neuron
          <NativeSelect
            id="wing-cell"
            value={cell}
            onChange={(e) => setCell(Number(e.target.value))}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <NativeSelectOption value={i} key={i}>
                MN {i + 1}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label htmlFor="wing-mapping">
          After the neuron · fixed spike train
          <NativeSelect
            id="wing-mapping"
            value={intervention}
            onChange={(e) =>
              setIntervention(e.target.value as MuscleIntervention)
            }
          >
            <NativeSelectOption value="intact">
              Intact teaching mapping
            </NativeSelectOption>
            <NativeSelectOption value="blocked">
              Disconnect selected NMJ
            </NativeSelectOption>
            <NativeSelectOption value="wrong-target">
              Send it to the next muscle target
            </NativeSelectOption>
            <NativeSelectOption value="reversed-hinge">
              Reverse hinge transmission
            </NativeSelectOption>
          </NativeSelect>
        </label>
      </div>
      <svg
        className="embodied-mechanics"
        viewBox={zoom ? '275 0 445 245' : '0 0 720 245'}
        role="img"
        aria-label="Scientific schematic: five motor neurons, neuromuscular junctions, six DLM fibres, and an assumed wing hinge output"
      >
        <g fontSize={13} fill="currentColor">
          <text x={20} y={18}>
            Motor neurons
          </text>
          <text x={180} y={18}>
            Existing NMJs
          </text>
          <text x={324} y={18}>
            DLM fibres
          </text>
          <text x={548} y={18}>
            Hinge → wing
          </text>
        </g>
        {run.spikes.map((_, i) => (
          <g key={i}>
            <path
              d={`M70 ${47 + i * 36} H155 L226 ${47 + (intervention === 'wrong-target' && cell === i ? (i + 1) % 5 : i) * 36} H327`}
              fill="none"
              stroke={colors[i]}
              opacity={intervention === 'blocked' && cell === i ? 0.16 : 0.55}
              strokeWidth={1.8}
            />
            <circle
              cx={53}
              cy={47 + i * 36}
              r={15}
              fill={recent[i] ? colors[i] : 'var(--card)'}
              stroke={colors[i]}
              strokeWidth={cell === i ? 3 : 1.5}
            />
            <text
              x={53}
              y={51 + i * 36}
              textAnchor="middle"
              fontSize={12}
              fill={recent[i] ? 'var(--card)' : 'currentColor'}
            >
              {i + 1}
            </text>
            <circle
              cx={226}
              cy={47 + i * 36}
              r={5 + mechanics.effective[i] * 7}
              fill={colors[i]}
              opacity={0.2 + mechanics.effective[i] * 0.8}
            />
            {recent[i] && (
              <circle
                cx={
                  70 + ((t - run.spikes[i].findLast((s) => s <= t)!) / 5) * 80
                }
                cy={47 + i * 36}
                r={4}
                fill={colors[i]}
              />
            )}
            <rect
              x={330}
              y={35 + i * 36}
              width={90 - mechanics.effective[i] * 22}
              height={i === 4 ? 30 : 23}
              rx={3}
              fill={colors[i]}
              fillOpacity={0.12 + 0.75 * mechanics.effective[i]}
              stroke={colors[i]}
            />
            {i === 4 && (
              <line
                x1={330}
                x2={420 - mechanics.effective[i] * 22}
                y1={50 + i * 36}
                y2={50 + i * 36}
                stroke="var(--card)"
              />
            )}
            <text x={432} y={51 + i * 36} fontSize={12} fill="currentColor">
              {i === 4 ? '5 + 6' : i + 1}
            </text>
          </g>
        ))}
        <path
          d="M478 44 H495 V192 H478 M495 128 H590"
          stroke="var(--muted-foreground)"
          fill="none"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <circle cx={590} cy={128} r={7} fill="var(--foreground)" />
        <line
          x1={590}
          y1={128}
          x2={xTip(original.angle)}
          y2={yTip(original.angle)}
          stroke="var(--muted-foreground)"
          strokeWidth={4}
          opacity={0.3}
        />
        <line
          x1={590}
          y1={128}
          x2={xTip(mechanics.angle)}
          y2={yTip(mechanics.angle)}
          stroke="var(--primary)"
          strokeWidth={5}
        />
        <path
          d="M560 150 L620 150 M570 158 L610 158"
          stroke="var(--border)"
          strokeWidth={2}
        />
        <text x={541} y={194} fontSize={12} fill="currentColor">
          200 Hz imposed cycle
        </text>
        <text x={20} y={235} fontSize={12} fill="var(--muted-foreground)">
          Schematic, not anatomical scale. Dashed connection = assumed
          mechanical transform.
        </text>
      </svg>
      <div className="embodied-metrics">
        <div>
          <strong>{selectedVoltage.toFixed(1)} mV</strong>MN {cell + 1} model
          voltage
        </div>
        <div>
          <strong>{mechanics.activation[cell].toFixed(2)}</strong>activation
          proxy before intervention
        </div>
        <div>
          <strong>{mechanics.power.toFixed(2)}</strong>mean fibre activation ·
          a.u.
        </div>
        <div>
          <strong>{mechanics.angle.toFixed(1)}°</strong>illustrative wing angle
        </div>
      </div>
      <Button variant="outline" onClick={() => setZoom(!zoom)}>
        {zoom
          ? 'Show the neural circuit · 20× slower'
          : 'Zoom to muscle & hinge · 200× slower'}
      </Button>
      <ReplayClock clock={clock} label="wing motor replay" offset={3000} />
      <p className="embodied-caption">
        The grey wing line is the intact mapping at the same time. Changing the
        NMJ or hinge changes only the teaching readout; the model spikes and
        voltage stay fixed. The six rectangles represent fibres, not six
        separate flight muscles. MN 5 supplies two fibres; soma laterality is
        omitted.
      </p>
      <div className="embodied-split">
        <div>
          <h3>Model voltage · MN {cell + 1}</h3>
          <Trace
            lines={[
              {
                label: `MN ${cell + 1}`,
                values: run.voltage[cell],
                dt: data.sampleDtMs,
                color: colors[cell],
              },
            ]}
            duration={1000}
            start={3000}
            cursor={t}
            min={-75}
            max={45}
            unit="mV"
          />
          <h3>Model spike times</h3>
          <SpikeRaster trains={run.spikes} cursor={t} />
        </div>
        <div>
          <h3>Recorded motor-unit events</h3>
          <SpikeRaster
            trains={data.experimental.spikes}
            cursor={t}
            prefix="Unit"
          />
          <p>
            These are detected events from a real control fly in the paper’s
            archive. They are not generated by our simulation, and the archive
            used here does not contain intracellular voltage waveforms for these
            units.
          </p>
          <p className="embodied-caption">
            Same 1-second display scale; independent runs, no trial alignment.
            Compare coordination and rates, not individual spike timestamps.
            Whole 5-second crop:{' '}
            {data.experimental.spikes.reduce((a, s) => a + s.length, 0)} motor
            events; {data.experimental.wingbeats.length} wingbeats (
            {(data.experimental.wingbeats.length / 5).toFixed(0)} Hz).
          </p>
        </div>
      </div>
      <details>
        <summary>What is from the paper, and what did we add?</summary>
        <p>
          The five-neuron voltage and spike replay reproduces the authors’
          deterministic Fig. 3B setup: a reduced fly conductance model, based on
          Berger & Crook, coupled by electrical synapses. Removing coupling or
          using 3 nS are our controlled changes to that setup. They are not
          reproductions of the paper’s noisy population experiments.{' '}
          <a href={sources.wing}>Hürkey et al. (2023)</a> combine electrical
          recordings, genetic perturbations, and modelling.
        </p>
        <p>
          The NMJ flashes, muscle rectangles, and wing lever are a teaching
          model added here. Spikes add to a calcium-like activation proxy after
          2 ms; it decays with a 120 ms time constant and saturates at 1. Wing
          motion uses a prescribed 200 Hz sine wave scaled by mean fibre
          activation. None of these mechanical parameters are fitted to this
          fly. There is no aerodynamic force prediction, real hinge geometry, or
          stretch-activation model in this diagram.
        </p>
        <p>
          In the biological power system, DLM and DVM muscles alternately deform
          the thorax and activate through stretch. Slower motor firing regulates
          their activation; it does not directly time every wingbeat. Small
          steering muscles operate differently, changing wing motion with
          precisely timed contractions.{' '}
          <a href={sources.hinge}>The hinge study</a> measured muscle calcium
          signals and 3D wing kinematics, then tested a learned mechanical
          mapping.
        </p>
      </details>
      <details>
        <summary>Neuron parameters, equations, and data provenance</summary>
        <p>
          C dV/dt = Iinput + Σ ggap(Vother − V) − INa − IShab − Ileak. This is a
          fly-specific reduced conductance model with voltage-dependent gates,
          not the classic squid HH parameters used in our introductory lab. The
          gap-junction current can affect spike timing without a chemical
          synapse or presynaptic spike event.
        </p>
        <dl className="embodied-parameters">
          {Object.entries(data.parameters)
            .filter(([k]) =>
              ['Cm', 'I_in', 'gna', 'gsb', 'gl', 'Ena', 'Ek', 'Ele'].includes(
                k,
              ),
            )
            .map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{String(v).replaceAll('*', ' ')}</dd>
              </div>
            ))}
          <div>
            <dt>Electrical coupling</dt>
            <dd>
              {variant === 'published'
                ? '0.0435 nS'
                : variant === 'uncoupled'
                  ? '0 nS'
                  : '3 nS'}{' '}
              per pair
            </dd>
          </div>
          <div>
            <dt>Integration</dt>
            <dd>RK4 · 0.1 ms</dd>
          </div>
          <div>
            <dt>Web voltage sampling</dt>
            <dd>0.5 ms</dd>
          </div>
          <div>
            <dt>Noise</dt>
            <dd>None</dd>
          </div>
        </dl>
        <p>
          Recorded data: control file{' '}
          <code>{data.experimental.file.split('/').at(-1)}</code>, cropped from{' '}
          {data.experimental.cropStartSeconds}–
          {data.experimental.cropStartSeconds + 5} seconds. Displayed motor
          units are not anatomically matched one-to-one to the model traces. The
          page shows model time 3–4 seconds and the corresponding relative
          interval of the independent data crop.
        </p>
        <p>
          <a href="https://zenodo.org/records/7740678">
            Authors’ source code and recorded events
          </a>{' '}
          ·{' '}
          <a href="/data/embodied/wing-replay.json" download>
            Download our reproduction and recording crop
          </a>
        </p>
      </details>
    </figure>
  );
}

export default function EmbodiedExplorer() {
  return (
    <main className="embodied-page">
      <nav className="embodied-nav" aria-label="Explorable navigation">
        <Link href="/">
          <ArrowLeft size={14} style={{ display: 'inline' }} /> Compact lab
        </Link>
        <div>
          <Link href="/games/garden">Games</Link>
          <a href="#sphinx">Emulation</a>
          <a href="#vision">Visual input</a>
          <a href="#motor">Motor neurons & wings</a>
          <a href="#boundaries">What is missing?</a>
          <ThemeToggle />
        </div>
      </nav>
      <h1>From seeing to moving</h1>
      <p className="embodied-intro">
        A moving fly on a screen can hide several different models. Here you can
        open up the visual response, inspect individual cells, and follow the
        extra assumptions needed to turn motor activity into movement.
      </p>
      <DigitalSphinx />
      <section className="embodied-section" id="vision">
        <h2>What does the fly’s eye send to the brain?</h2>
        <p>
          Flies have optic lobes, rather than a visual cortex. Light is already
          being transformed as it passes from photoreceptors through the lamina
          and medulla. Many early visual neurons communicate through graded
          changes in voltage, so “which neurons spike?” is often the wrong first
          question.
        </p>
        <VisionInspector />
        <h2>How much of that processing do we understand?</h2>
        <p>
          Some computations are understood at the level of identified cell
          types, synapses, and measured responses. A wiring diagram can still
          include cell types whose function we barely know. A{' '}
          <a href={sources.inventory}>
            recent complete visual-system inventory
          </a>{' '}
          makes that gap especially clear: a parts list is much more
          comprehensive than our account of what every part computes.
        </p>
        <div className="embodied-chain">
          <div>
            <strong>Light & contrast</strong>
            <p>
              Outer photoreceptors R1–R6 feed circuits sensitive to luminance
              and its changes.
            </p>
          </div>
          <div>
            <strong>Local motion</strong>
            <p>
              ON and OFF pathways converge on T4 and T5, each with four
              direction-selective subtypes.
            </p>
          </div>
          <div>
            <strong>Colour</strong>
            <p>
              R7/R8 and recurrent circuits compare spectral inputs. A normal
              display cannot reproduce ultraviolet light.
            </p>
          </div>
          <div>
            <strong>Central brain</strong>
            <p>
              Visual features contribute to object responses, navigation,
              escape, and other behaviours.
            </p>
          </div>
        </div>
        <p className="embodied-caption">
          These branches interact; the diagram is not a strict set of
          independent serial processors. The grayscale FlyVis replay above is
          not a model of colour vision.{' '}
          <a href={sources.colour}>Colour opponency and recurrent circuitry.</a>
        </p>
        <MotionExplainer />
        <details>
          <summary>
            How would visual signals recruit the three circuits in the compact
            lab?
          </summary>
          <p>
            <strong>Motion:</strong> medulla inputs combine in T4/T5, then
            downstream visual circuits pool local motion.{' '}
            <strong>Escape:</strong> expansion-sensitive pathways including
            LPLC2 and LC4 contribute to giant-fibre recruitment.{' '}
            <strong>Heading:</strong> visual landmark signals can anchor the
            E-PG compass through intervening pathways; E-PG activity is not a
            direct camera image.
          </p>
          <p>
            These functions suggest different measurements: direction tuning,
            looming-evoked response timing, or a heading-related population
            bump. They do not supply numerical predictions without stimulus
            calibration and a model of the intervening cells. The replay on this
            page does not feed the three MaleCNS extracts.
          </p>
          <div className="embodied-controls">
            <Link href="/?circuit=motion">Motion circuit ↗</Link>
            <Link href="/?circuit=escape">Escape circuit ↗</Link>
            <Link href="/?circuit=heading">Heading circuit ↗</Link>
          </div>
        </details>
      </section>
      <section className="embodied-section" id="motor">
        <h2>What connects a motor spike to a wingbeat?</h2>
        <p>
          A spike arrives at an existing neuromuscular junction; it does not
          create a new junction each time. Transmitter release excites the
          muscle, muscle activation produces force, and the attachment and hinge
          determine what that force does. The wing blade itself does not
          contract.
        </p>
        <p>
          The flight power muscles offer a striking example. Their motor neurons
          fire far more slowly than the wings beat.{' '}
          <a href={sources.wing}>Hürkey and colleagues</a> studied five neurons
          innervating six dorsal longitudinal muscle fibres and showed how
          electrical coupling and membrane dynamics organize their firing.
        </p>
        <WingInspector />
      </section>
      <section className="embodied-section" id="boundaries">
        <h2>Which parts can a connectome actually supply?</h2>
        <p>
          The central nervous system and the body meet at a boundary that an
          impressive animation can easily hide. A central EM volume does not, by
          itself, reconstruct every peripheral neuromuscular junction, muscle,
          attachment, or joint.
        </p>
        <div className="embodied-table-wrap">
          <table className="embodied-table">
            <thead>
              <tr>
                <th>Link in the chain</th>
                <th>Evidence that helps</th>
                <th>What the model still needs</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Light → visual neuron</td>
                <td>
                  Optical measurements, receptive fields, visual connectomes,
                  physiology
                </td>
                <td>
                  Eye geometry, phototransduction, adaptation, synaptic and
                  membrane parameters
                </td>
              </tr>
              <tr>
                <td>Visual circuit → descending output</td>
                <td>
                  Central connections, cell identities, activity and
                  perturbation studies
                </td>
                <td>
                  A calibrated transformation from features into
                  behaviour-dependent commands
                </td>
              </tr>
              <tr>
                <td>Descending neuron → motor neuron</td>
                <td>
                  VNC reconstructions, premotor interneurons, sensory pathways
                </td>
                <td>
                  Dynamics and feedback; this is rarely a single direct
                  connection
                </td>
              </tr>
              <tr>
                <td>Motor neuron → muscle</td>
                <td>
                  Peripheral tracing and light-microscopy matches to identified
                  muscles
                </td>
                <td>
                  Correct target, release, receptors, excitation–contraction
                  coupling, force dynamics
                </td>
              </tr>
              <tr>
                <td>Muscle → joint → movement</td>
                <td>
                  Anatomy, measured kinematics, force and mechanical studies
                </td>
                <td>
                  Attachments, moment arms, hinge mechanics, contact or
                  aerodynamic forces
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          <a href={sources.manc}>The MANC motor-circuit study</a> links central
          motor neurons to muscle identities using additional anatomical
          evidence. Some assignments remain incomplete. A chemical-synapse graph
          also does not supply the electrical coupling strengths used in the
          five-neuron example.
        </p>
        <details>
          <summary>Do MuJoCo simulations ignore muscles?</summary>
          <p>
            It depends on the model. MuJoCo is a physics engine, not a
            commitment to one biological level of detail. The NeuroMechFly
            replay here uses joint actuators and a designed walking controller.
            The published <a href={sources.body}>FlyBody model</a> also uses
            non-muscle actuators and explicitly discusses muscle modelling as
            further work. Other configurations can include muscle actuators.
            None of those choices automatically provides the correct
            motor-neuron-to-muscle mapping or adult NMJ physiology.
          </p>
          <p>
            A useful claim to test is therefore specific: which measured
            behaviour or neural response does this model reproduce, under which
            intervention? Looking fly-like is evidence about the rendered
            behaviour; matching neuron tuning, spike coordination, and the
            effects of a muscle perturbation are additional tests.
          </p>
        </details>
        <p className="embodied-callout">
          The visual replay, the flight motor model, and the teaching mechanics
          are three explicitly different pieces. They are inspectable here, but
          they do not form a validated end-to-end emulation of a fly.
        </p>
      </section>
    </main>
  );
}
