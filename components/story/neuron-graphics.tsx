'use client';
import { useEffect, useState } from 'react';
import type { Atlas } from '@/lib/simulation';
import type { LabTrace, LabParameters } from '@/lib/neuron-lab';
import { useTheme, themeColor } from '@/lib/theme';
export function ReconstructedCell() {
  const [cell, setCell] = useState<{
      id: number;
      label: string;
      lines: number[][];
    } | null>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    fetch('/data/atlas.json', { signal: c.signal })
      .then((r) => {
        if (!r.ok) throw Error('No reconstruction');
        return r.json();
      })
      .then((raw) => {
        const atlas = raw as Atlas;
        const n = atlas.circuits.heading.nodes.find(
          (n) => n.type === 'EPG' && atlas.skeletons[n.id],
        );
        if (!n) throw Error('No matching arbor');
        setCell({ id: n.id, label: n.label, lines: atlas.skeletons[n.id] });
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setFailed(true);
      });
    return () => c.abort();
  }, []);
  if (!cell)
    return (
      <div className="essay-cell-loading">
        {failed
          ? 'The reconstructed cell could not load. The membrane experiments below remain available.'
          : 'Tracing one reconstructed neuron…'}
      </div>
    );
  const points = cell.lines.flatMap((l) => [
    [l[0], l[2]],
    [l[3], l[5]],
  ]);
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const low = [Math.min(...xs), Math.min(...ys)],
    high = [Math.max(...xs), Math.max(...ys)],
    scale = Math.min(
      510 / (high[0] - low[0] || 1),
      330 / (high[1] - low[1] || 1),
    );
  const project = (x: number, z: number) => [
    350 + (x - (low[0] + high[0]) / 2) * scale,
    215 + (z - (low[1] + high[1]) / 2) * scale,
  ];
  return (
    <figure className="essay-reconstructed-cell">
      <svg
        viewBox="0 0 700 445"
        aria-label={`Actual simplified arbor of ${cell.label}, MaleCNS body ${cell.id}`}
      >
        <title>One reconstructed E-PG neuron, projected in the x/z plane</title>
        <path
          d={cell.lines
            .map((l) => {
              const a = project(l[0], l[2]),
                b = project(l[3], l[5]);
              return `M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
            })
            .join(' ')}
          fill="none"
          stroke="var(--story-green)"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <text x="35" y="32" className="essay-svg-label">
          RECONSTRUCTED SHAPE
        </text>
        <text x="35" y="414" className="essay-svg-label">
          E-PG · body {cell.id}
        </text>
        <line
          x1="490"
          x2={490 + 10 * scale}
          y1="400"
          y2="400"
          stroke="var(--story-muted)"
        />
        <text x="490" y="423" className="essay-svg-label">
          10 µm
        </text>
      </svg>
      <figcaption>
        Real anatomy, simplified for display. Our one-compartment equations do
        not use this branching shape.
      </figcaption>
    </figure>
  );
}
export function VoltageMembrane({
  voltage,
  fired = false,
  input = 0,
}: {
  voltage: number;
  fired?: boolean;
  input?: number;
}) {
  return (
    <div className={`essay-voltage-membrane ${fired ? 'is-firing' : ''}`}>
      <svg
        viewBox="0 0 700 260"
        aria-label={`Single membrane compartment at ${voltage.toFixed(1)} millivolts`}
      >
        <title>
          A membrane separates the outside from the inside; current changes the
          voltage across it
        </title>
        <defs>
          <marker
            id="passive-current-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M0 0L10 5L0 10" fill="var(--story-warm)" />
          </marker>
        </defs>
        <rect
          x="35"
          y="118"
          width="630"
          height="122"
          rx="0"
          fill="var(--surface-accent,#1b3021)"
        />
        <path
          d="M35 108H665 M35 118H665"
          stroke="var(--story-green)"
          strokeWidth="2"
        />
        <text x="52" y="49" className="essay-svg-label">
          OUTSIDE
        </text>
        <text x="52" y="210" className="essay-svg-label">
          INSIDE
        </text>
        <text
          x="350"
          y="201"
          textAnchor="middle"
          className="essay-voltage-number"
        >
          {voltage.toFixed(1)}
          <tspan className="essay-voltage-unit"> mV</tspan>
        </text>
        <text x="52" y="100" className="essay-svg-label">
          cell membrane
        </text>
        <path
          d="M535 49V164"
          stroke="var(--story-warm)"
          strokeWidth={input > 0 ? 3 : 1}
          strokeDasharray={input > 0 ? undefined : '4 4'}
          markerEnd="url(#passive-current-arrow)"
          opacity={input > 0 ? 1 : 0.35}
        />
        <text x="553" y="66" className="essay-svg-label">
          {input > 0 ? 'current in' : 'input'}
        </text>
        <text x="350" y="60" textAnchor="middle" className="essay-event-word">
          {fired ? 'SPIKE EVENT' : ''}
        </text>
      </svg>
    </div>
  );
}
export function MembranePatch({
  result,
  cursor,
  parameters,
}: {
  result: LabTrace;
  cursor: number;
  parameters: LabParameters;
}) {
  const theme = useTheme(),
    v = result.voltage[0][cursor];
  const channels = [
    {
      name: 'Sodium',
      symbol: 'Na⁺',
      x: 265,
      current: result.currents.sodium[cursor],
      fraction: result.gates[0][cursor] ** 3 * result.gates[1][cursor],
      color: themeColor('#80d1ce', theme),
      max: parameters.sodium,
    },
    {
      name: 'Potassium',
      symbol: 'K⁺',
      x: 465,
      current: result.currents.potassium[cursor],
      fraction: result.gates[2][cursor] ** 4,
      color: themeColor('#edae7c', theme),
      max: parameters.potassium,
    },
  ];
  return (
    <div className="essay-channel-patch">
      <svg
        viewBox="0 0 700 315"
        aria-label={`Hodgkin–Huxley membrane at ${v.toFixed(1)} millivolts. Sodium and potassium currents determine the voltage waveform.`}
      >
        <title>
          Voltage-gated channel diagram driven by the calculated channel states
        </title>
        <defs>
          {channels.map((c) => (
            <marker
              key={c.name}
              id={`ion-arrow-${c.name}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M0 0L10 5L0 10" fill={c.color} />
            </marker>
          ))}
        </defs>
        <rect
          x="30"
          y="151"
          width="640"
          height="146"
          fill="var(--surface-cool,#19312c)"
        />
        <path
          d="M30 137H670 M30 151H670"
          stroke="var(--story-green)"
          strokeWidth="2"
        />
        <text x="44" y="50" className="essay-svg-label">
          OUTSIDE
        </text>
        <text x="44" y="200" className="essay-svg-label">
          INSIDE
        </text>
        <text x="45" y="242" className="essay-patch-voltage">
          {v.toFixed(1)}
        </text>
        <text x="45" y="266" className="essay-svg-label">
          millivolts
        </text>
        {channels.map((c) => {
          const inward = c.current < 0,
            amount = Math.abs(c.current),
            frac = (result.time[cursor] * 0.11) % 1,
            y = inward ? 90 + frac * 120 : 210 - frac * 120;
          return (
            <g key={c.name}>
              <text
                x={c.x}
                y="44"
                textAnchor="middle"
                className="essay-ion-name"
                fill={c.color}
              >
                {c.symbol}
              </text>
              <text
                x={c.x}
                y="69"
                textAnchor="middle"
                className="essay-svg-label"
              >
                {c.name} channel
              </text>
              <rect
                x={c.x - 23}
                y="119"
                width="46"
                height="49"
                rx="7"
                fill="var(--paper)"
                stroke={c.color}
                strokeWidth="2"
              />
              <rect
                x={c.x - 14}
                y="127"
                width="28"
                height="33"
                rx="4"
                fill={c.color}
                opacity={
                  c.max === 0
                    ? 0.08
                    : Math.min(1, 0.12 + c.fraction * 2).toFixed(3)
                }
              />
              <line
                x1={c.x}
                x2={c.x}
                y1={inward ? 85 : 207}
                y2={inward ? 207 : 85}
                stroke={c.color}
                strokeWidth="2"
                markerEnd={`url(#ion-arrow-${c.name})`}
                opacity={amount > 0.1 ? 1 : 0.15}
              />
              {amount > 0.1 && (
                <circle cx={c.x} cy={y.toFixed(3)} r="4" fill={c.color} />
              )}
              <text
                x={c.x}
                y="243"
                textAnchor="middle"
                className="essay-channel-current"
                fill={c.color}
              >
                {c.current.toFixed(1)}
              </text>
              <text
                x={c.x}
                y="267"
                textAnchor="middle"
                className="essay-svg-label"
              >
                µA/cm² ·{' '}
                {c.max === 0 ? 'blocked' : inward ? 'inward' : 'outward'}
              </text>
            </g>
          );
        })}
        <text x="634" y="123" textAnchor="end" className="essay-svg-label">
          membrane
        </text>
      </svg>
      <p className="essay-fine">
        Channel states and currents come from the HH equations. Dots indicate
        flow direction at illustrative speed. Leak current is included in the
        model but omitted from this two-channel diagram.
      </p>
    </div>
  );
}
export function SweepPlot({
  result,
  cursor,
  model,
  limit = 180,
  title,
}: {
  result: LabTrace;
  cursor: number;
  model: 'lif' | 'hh';
  limit?: number;
  title: string;
}) {
  const theme = useTheme(),
    color = themeColor(model === 'lif' ? '#bee780' : '#80d1ce', theme),
    W = 700,
    H = 205,
    left = 48,
    right = 22,
    top = 38,
    bottom = 32,
    low = model === 'lif' ? -70 : -85,
    high = model === 'lif' ? -40 : 55;
  const x = (t: number) => left + (t / limit) * (W - left - right),
    y = (v: number) => top + ((high - v) / (high - low)) * (H - top - bottom);
  const last = Math.min(cursor, Math.round(limit / 0.25)),
    values = result.voltage[0];
  const d = values
    .slice(0, last + 1)
    .map(
      (v, i) =>
        `${i ? 'L' : 'M'}${x(result.time[i]).toFixed(2)} ${y(v).toFixed(2)}`,
    )
    .join(' ');
  return (
    <figure className="essay-sweep-plot">
      <figcaption>{title}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        aria-label={`${title}. Voltage in millivolts over ${limit} milliseconds; current time ${result.time[last].toFixed(1)} milliseconds.`}
      >
        <title>Voltage trace revealed by the simulation playhead</title>
        {[low, (low + high) / 2, high].map((v) => (
          <g key={v}>
            <line
              x1={left}
              x2={W - right}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--story-line)"
              strokeDasharray="3 5"
            />
            <text
              x={left - 9}
              y={y(v) + 4}
              textAnchor="end"
              className="essay-svg-label"
            >
              {v}
            </text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text
            key={f}
            x={x(f * limit)}
            y={H - 9}
            textAnchor="middle"
            className="essay-svg-label"
          >
            {f * limit}
          </text>
        ))}
        <text x="6" y="28" className="essay-svg-label">
          mV
        </text>
        <text x="697" y={H - 9} textAnchor="end" className="essay-svg-label">
          ms
        </text>
        {model === 'lif' && (
          <>
            <line
              x1={left}
              x2={W - right}
              y1={y(-50)}
              y2={y(-50)}
              stroke="var(--story-warm)"
              strokeDasharray="5 5"
            />
            <text
              x={W - right}
              y={y(-50) - 8}
              textAnchor="end"
              className="essay-svg-label"
            >
              −50 mV · event threshold
            </text>
            <text x={left} y="15" className="essay-svg-label">
              EVENTS
            </text>
            {result.spikes[0]
              .filter((t) => t <= result.time[last])
              .map((t) => (
                <line
                  key={t}
                  x1={x(t)}
                  x2={x(t)}
                  y1="4"
                  y2="20"
                  stroke="var(--story-warm)"
                  strokeWidth="2.5"
                />
              ))}
          </>
        )}
        <path d={d} stroke={color} strokeWidth="2.4" fill="none" />
        <circle
          cx={x(result.time[last])}
          cy={y(values[last])}
          r="4"
          fill={color}
        />
      </svg>
    </figure>
  );
}
