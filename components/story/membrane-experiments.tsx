/* The custom drag handle implements the slider keyboard and pointer pattern; numeric entry is also provided. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
'use client';
import { EditableCopy } from './copy-editor';
import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import {
  membraneDefaults,
  simulateMembrane,
  type MembraneParameters,
  type MembraneRun,
} from '@/lib/membrane-experiment';
import { StoryPlayback, usePlayback } from './shared';

export interface PlotLine {
  values: number[];
  color: string;
  label: string;
  dashed?: boolean;
}
export function SignalPlot({
  time,
  lines,
  domain,
  unit = 'mV',
  timeUnit = 'ms',
  title,
  events = [],
  cursor,
  height = 190,
  threshold,
}: {
  time: number[];
  lines: PlotLine[];
  domain: [number, number];
  unit?: string;
  timeUnit?: string;
  title: string;
  events?: number[];
  cursor?: number;
  height?: number;
  threshold?: number;
}) {
  const left = 54,
    right = 70,
    top = 40,
    bottom = 32,
    width = 660;
  const first = time[0] ?? 0,
    last = time[time.length - 1] ?? 1;
  const x = (t: number) =>
    left + ((t - first) / (last - first || 1)) * (width - left - right);
  const y = (v: number) =>
    top + ((domain[1] - v) / (domain[1] - domain[0])) * (height - top - bottom);
  return (
    <figure className="em-signal">
      <figcaption>{title}</figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        aria-label={`${title}. ${unit} over ${timeUnit}. ${events.length ? `${events.length} simulated spike events.` : ''}`}
      >
        {[domain[0], (domain[0] + domain[1]) / 2, domain[1]].map((v) => (
          <g key={v}>
            <line
              x1={left}
              x2={width - right}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--story-line)"
              strokeDasharray="3 5"
            />
            <text x={left - 8} y={y(v) + 4} textAnchor="end">
              {Number(v.toFixed(1))}
            </text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text
            key={f}
            x={x(first + (last - first) * f)}
            y={height - 9}
            textAnchor="middle"
          >
            {Number((first + (last - first) * f).toFixed(1))}
          </text>
        ))}
        <text x="8" y="21">
          {unit}
        </text>
        <text x={width - 2} y={height - 9} textAnchor="end">
          {timeUnit}
        </text>
        {threshold !== undefined && (
          <line
            x1={left}
            x2={width - right}
            y1={y(threshold)}
            y2={y(threshold)}
            stroke="var(--story-warm)"
            strokeDasharray="6 4"
          />
        )}
        {lines.map((line) => (
          <path
            key={line.label}
            d={line.values
              .map(
                (v, i) =>
                  `${i ? 'L' : 'M'}${x(time[i]).toFixed(2)},${y(v).toFixed(2)}`,
              )
              .join(' ')}
            fill="none"
            stroke={line.color}
            strokeWidth={line.dashed ? 1.6 : 2.1}
            strokeDasharray={line.dashed ? '5 4' : undefined}
            opacity={line.dashed ? 0.55 : 1}
          />
        ))}
        {events
          .filter((t) => t >= first && t <= last)
          .map((t, i) => (
            <line
              key={i}
              x1={x(t)}
              x2={x(t)}
              y1="3"
              y2="17"
              stroke="var(--story-warm)"
              strokeWidth="2"
            />
          ))}
        {cursor !== undefined && (
          <line
            x1={x(cursor)}
            x2={x(cursor)}
            y1={top}
            y2={height - bottom}
            stroke="var(--story-muted)"
            strokeDasharray="2 3"
          />
        )}
      </svg>
      <div className="em-legend">
        {lines.length > 1 &&
          lines.map((l) => (
            <span key={l.label} style={{ color: l.color }}>
              {l.dashed ? '┄' : '━'} {l.label}
            </span>
          ))}
        {events.length > 0 && <span>│ Spike events, not spike shapes</span>}
      </div>
    </figure>
  );
}

export function EquationNumber({
  label,
  symbol,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  onFocus,
}: {
  label: string;
  symbol: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
  onFocus?: () => void;
}) {
  const drag = useRef<{ x: number; value: number } | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (n: number) => {
    if (Number.isFinite(n))
      onChange(Math.min(max, Math.max(min, Math.round(n / step) * step)));
  };
  return (
    <span
      className={`em-equation-number ${symbol === 'gL' ? 'em-leak' : symbol.startsWith('I') ? 'em-input' : 'em-capacitance'}`}
      onFocus={onFocus}
    >
      <span className="em-symbol">{symbol}</span>
      <span
        role="slider"
        tabIndex={0}
        aria-label={`Drag ${label}`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} ${unit}`}
        className="em-drag-number"
        onPointerDown={(e) => {
          setDraft(null);
          drag.current = { x: e.clientX, value };
          e.currentTarget.setPointerCapture(e.pointerId);
          onFocus?.();
        }}
        onPointerMove={(e) => {
          if (drag.current)
            commit(
              drag.current.value +
                ((e.clientX - drag.current.x) * (max - min)) / 240,
            );
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onKeyDown={(e) => {
          if (
            [
              'ArrowLeft',
              'ArrowDown',
              'ArrowRight',
              'ArrowUp',
              'Home',
              'End',
            ].includes(e.key)
          ) {
            e.preventDefault();
            commit(
              e.key === 'Home'
                ? min
                : e.key === 'End'
                  ? max
                  : value +
                    (['ArrowLeft', 'ArrowDown'].includes(e.key) ? -step : step),
            );
          }
        }}
      >
        ↔
      </span>
      <Input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft ?? value}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          const n = Number(text);
          if (text !== '' && Number.isFinite(n) && n >= min && n <= max)
            commit(n);
        }}
        onBlur={() => {
          if (draft !== null && draft !== '') commit(Number(draft));
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
      <span className="em-unit">{unit}</span>
    </span>
  );
}

function MembraneCircuit({
  p,
  v,
  input,
  focus,
  reset,
}: {
  p: MembraneParameters;
  v: number;
  input: number;
  focus: string;
  reset: boolean;
}) {
  const leak = p.leak * (v - p.rest),
    storage = input - leak;
  return (
    <div className="em-circuit">
      <svg
        viewBox="0 0 370 285"
        aria-label="Electrical equivalent of one membrane: a capacitance in parallel with a leak conductance and its reversal potential."
      >
        <text x="15" y="20">
          ONE ELECTRICAL COMPARTMENT
        </text>
        <path
          d="M70 63H285 M70 237H285 M70 63V100 M70 150V237 M150 63V127 M150 143V237 M263 63V96 M263 151V182 M263 194V237"
          fill="none"
          stroke="var(--story-line)"
          strokeWidth="2"
        />
        <circle
          cx="70"
          cy="125"
          r="25"
          fill="none"
          stroke="var(--story-warm)"
          strokeWidth="2"
        />
        <path
          d="M70 142V108 M62 120L70 108L78 120"
          stroke="var(--story-warm)"
          strokeWidth="2"
          fill="none"
        />
        <text x="15" y="178" fill="var(--story-warm)">
          I(t)
        </text>
        <path
          d="M125 127H175 M125 143H175"
          stroke="var(--em-cool)"
          strokeWidth={focus === 'capacitance' ? 5 : 3}
        />
        <rect
          x="250"
          y="96"
          width="26"
          height="55"
          fill="var(--paper)"
          stroke="var(--story-green)"
          strokeWidth={focus === 'leak' ? 4 : 2}
        />
        <path
          d="M247 182H279 M255 194H271"
          stroke="var(--story-green)"
          strokeWidth="2"
        />
        <text x="129" y="111">
          C
        </text>
        <text x="282" y="128">
          gL
        </text>
        <text x="282" y="192">
          EL
        </text>
        <text x="89" y="52">
          inside
        </text>
        <text x="89" y="263">
          outside · 0 mV reference
        </text>
        <text x="123" y="212" className="em-circuit-voltage">
          {v.toFixed(1)} mV
        </text>
      </svg>
      <div className="em-current-balance">
        <span>
          Injected <b>{input.toFixed(0)} pA</b>
        </span>
        <span>
          Leak, outward <b>{leak.toFixed(0)} pA</b>
        </span>
        <span>
          {reset ? 'Reset rule active' : 'Charging membrane'}{' '}
          <b>{reset ? 'V held at rest' : `${storage.toFixed(0)} pA`}</b>
        </span>
      </div>
      <EditableCopy copyId="membrane-explanation-1" className="essay-fine">
        The membrane stores separated charge; channels provide a path across it.
        The battery represents the leak reversal potential. This is an
        electrical equivalent, not the cell’s anatomy.
      </EditableCopy>
    </div>
  );
}

export function EquationExperiment() {
  const [p, setP] = useState(membraneDefaults),
    [focus, setFocus] = useState('capacitance'),
    [pinned, setPinned] = useState<MembraneRun | null>(null);
  const run = useMemo(() => simulateMembrane(p), [p]);
  const clock = usePlayback(run.time.length - 1, 5, 220);
  const update = (key: keyof MembraneParameters, value: number) => {
    setP((old) => ({ ...old, [key]: value }));
    setFocus(key);
    clock.setPlaying(false);
  };
  const index = Math.min(clock.cursor, run.time.length - 1),
    v = run.voltage[index],
    input = run.input[index];
  const descriptions: Record<string, string> = {
    capacitance:
      'Capacitance is charge-storage capacity. Increase C: the same current changes voltage more slowly. With leak fixed, the input also takes longer to fade.',
    leak: 'Leak conductance is how easily current crosses the passive membrane. Increase gL: voltage returns toward EL faster, and sustained current produces a smaller voltage change.',
    amplitude:
      'Current delivers charge. Raise I: each pulse moves voltage farther. These are injected current pulses, not a reconstruction of neurotransmitter release.',
    gap: 'Move the second pulse later. Has the first response faded too far for the pair to reach threshold? The gap is measured from one pulse’s start to the next.',
  };
  return (
    <div className="em-experiment">
      <div className="em-experiment-heading">
        <span className="essay-kicker">
          Experiment 01 · make two inputs count
        </span>
        <Button
          variant="outline"
          onClick={() => {
            setP(membraneDefaults);
            setPinned(null);
            clock.setCursor(220);
            clock.setPlaying(false);
          }}
        >
          Reset
        </Button>
      </div>
      <EditableCopy copyId="membrane-explanation-2" className="em-challenge">
        Two weak inputs can trigger a spike together.{' '}
        <strong>
          How far apart can you move them before that stops working?
        </strong>
      </EditableCopy>
      <div
        className="em-live-equation"
        aria-label="Capacitance times rate of voltage change equals injected current minus leak current"
      >
        <EquationNumber
          label="Membrane capacitance"
          symbol="C"
          value={p.capacitance}
          min={50}
          max={200}
          step={5}
          unit="pF"
          onChange={(v) => update('capacitance', v)}
          onFocus={() => setFocus('capacitance')}
        />
        <span>
          ×{' '}
          <span className="em-derivative">
            dV/dt<small>voltage change / time</small>
          </span>{' '}
          ={' '}
        </span>
        <EquationNumber
          label="Pulse current"
          symbol="I(t)"
          value={p.amplitude}
          min={50}
          max={500}
          step={10}
          unit="pA"
          onChange={(v) => update('amplitude', v)}
          onFocus={() => setFocus('amplitude')}
        />
        <span>−</span>
        <EquationNumber
          label="Leak conductance"
          symbol="gL"
          value={p.leak}
          min={2}
          max={15}
          step={0.5}
          unit="nS"
          onChange={(v) => update('leak', v)}
          onFocus={() => setFocus('leak')}
        />
        <span>
          × (V − (
          <span className="em-fixed">
            −65<small>mV · EL</small>
          </span>
          ))
        </span>
      </div>
      <EditableCopy
        copyId="membrane-explanation-3"
        className="em-equation-help"
      >
        Drag ↔ above a number, type a value, or use arrow keys. I(t) is zero
        between pulses.
      </EditableCopy>
      <p className="em-term-explanation" aria-live="polite">
        {descriptions[focus] ?? descriptions.capacitance}
      </p>
      <div className="em-equation-results">
        <MembraneCircuit
          p={p}
          v={v}
          input={input}
          focus={focus}
          reset={run.spikes.some(
            (t) => t <= run.time[index] && run.time[index] < t + 2,
          )}
        />
        <div>
          <SignalPlot
            title="Calculated voltage · threshold at −50 mV"
            time={run.time}
            domain={[-70, -40]}
            lines={[
              ...(pinned
                ? [
                    {
                      values: pinned.voltage,
                      color: 'var(--story-muted)',
                      label: 'Pinned response',
                      dashed: true,
                    },
                  ]
                : []),
              {
                values: run.voltage,
                color: 'var(--story-green)',
                label: 'Current response',
              },
            ]}
            events={run.spikes}
            cursor={run.time[index]}
            threshold={-50}
          />
          <SignalPlot
            title="Injected current · two 5 ms pulses"
            time={run.time}
            domain={[0, 500]}
            unit="pA"
            lines={[
              {
                values: run.input,
                color: 'var(--story-warm)',
                label: 'Injected current',
              },
            ]}
            cursor={run.time[index]}
            height={130}
          />
        </div>
      </div>
      <div className="em-gap-control">
        <label htmlFor="pulse-gap">
          Time between pulse starts <b>{p.gap} ms</b>
        </label>
        <Slider
          id="pulse-gap"
          aria-label="Time between pulse starts"
          min={5}
          max={60}
          step={1}
          value={[p.gap]}
          onValueChange={(value) =>
            update('gap', Array.isArray(value) ? value[0] : value)
          }
        />
        <div className="em-range-ends">
          <span>close together</span>
          <span>far apart</span>
        </div>
      </div>
      <div className="em-outcome" aria-live="polite">
        <strong>
          {run.spikes.length === 0
            ? 'No spike'
            : `${run.spikes.length} spike${run.spikes.length === 1 ? '' : 's'}`}
        </strong>
        <span>
          τ = C/gL = {(p.capacitance / p.leak).toFixed(1)} ms · the membrane’s
          fading timescale
        </span>
        <Button variant="outline" onClick={() => setPinned(run)}>
          Pin this response
        </Button>
      </div>
      <StoryPlayback
        cursor={index}
        max={run.time.length - 1}
        onCursor={clock.setCursor}
        playing={clock.playing}
        onPlaying={clock.setPlaying}
        timeScale={0.1}
      />
      <EditableCopy copyId="membrane-explanation-5" className="essay-fine">
        Scrub to inspect the current balance at one instant. Playback is slowed
        down. At −50 mV, LIF emits an event and resets to −65 mV for 2 ms; the
        balance equation applies outside that reset period. The ticks mark
        events, not biological spike waveforms. These parameters are teaching
        choices.
      </EditableCopy>
    </div>
  );
}
