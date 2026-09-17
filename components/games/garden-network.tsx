'use client';
/* Functional SVG: schematic anatomy and signals from the computed LIF run. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import type { GardenCell, GardenEdge, GardenRun } from '@/lib/games';
import { gameSampleIndex } from '@/lib/game-playback';

const names = 'ABCDEFGHIJKL';
const angles = [-150, -95, -35, 35, 95, 155];
const color = (cell: GardenCell) =>
  cell.kind === 'exc' ? 'var(--primary)' : 'var(--ink-violet)';
type Point = { x: number; y: number };
function offset(p: Point, angle: number, distance: number): Point {
  return {
    x: p.x + Math.cos(angle) * distance,
    y: p.y + Math.sin(angle) * distance,
  };
}
function connection(a: GardenCell, b: GardenCell) {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const facing = angles
    .map((v) => (v * Math.PI) / 180)
    .reduce((best, v) =>
      Math.cos(v - angle - Math.PI) > Math.cos(best - angle - Math.PI)
        ? v
        : best,
    );
  const start = offset(a, angle, 20),
    end = offset(b, facing, 42);
  const bend = Math.min(65, Math.hypot(b.x - a.x, b.y - a.y) * 0.22);
  const mid = {
    x: (start.x + end.x) / 2 - Math.sin(angle) * bend,
    y: (start.y + end.y) / 2 + Math.cos(angle) * bend,
  };
  return {
    path: `M${start.x} ${start.y} Q${mid.x} ${mid.y} ${end.x} ${end.y}`,
    end,
    at: (t: number) => ({
      x: (1 - t) ** 2 * start.x + 2 * (1 - t) * t * mid.x + t * t * end.x,
      y: (1 - t) ** 2 * start.y + 2 * (1 - t) * t * mid.y + t * t * end.y,
    }),
  };
}

export default function GardenNetwork({
  cells,
  edges,
  run,
  time,
  selected,
  pulseCell,
  connecting,
  block,
  onSelect,
}: {
  cells: GardenCell[];
  edges: GardenEdge[];
  run: GardenRun;
  time: number;
  selected: number | null;
  pulseCell: number | null;
  connecting: number | null;
  block: boolean;
  onSelect: (id: number) => void;
}) {
  const sample = gameSampleIndex(time, run.duration + 1, run.duration);
  const height = Math.max(340, ...cells.map((c) => c.y + 110));
  const byId = new Map(cells.map((c, index) => [c.id, { cell: c, index }]));
  return (
    <svg
      className="garden-network"
      viewBox={`0 0 610 ${height}`}
      role="group"
      aria-label="Editable circuit with schematic branching neurons. Select a cell to inspect or delete it."
    >
      <text x="22" y="27" className="garden-figure-label">
        Schematic neurons · computed activity
      </text>
      {edges.map((edge) => {
        const source = byId.get(edge.from),
          target = byId.get(edge.to);
        if (!source || !target) return null;
        const curve = connection(source.cell, target.cell);
        const blocked = block && source.cell.kind === 'inh';
        const events = run.spikes[source.index].filter(
          (s) => time >= s && time - s < 10,
        );
        return (
          <g key={`${edge.from}-${edge.to}`}>
            <title>
              {names[edge.from]} → {names[edge.to]}:{' '}
              {blocked
                ? 'inhibitory output blocked'
                : source.cell.kind === 'exc'
                  ? 'excitatory synapse'
                  : 'inhibitory synapse'}
              . Events arrive after 2 ms.
            </title>
            <path
              d={curve.path}
              stroke="var(--canvas)"
              strokeWidth="7"
              fill="none"
            />
            <path
              d={curve.path}
              stroke={color(source.cell)}
              strokeWidth="2.3"
              strokeLinecap="round"
              fill="none"
              opacity={blocked ? 0.25 : 0.65}
            />
            <circle
              cx={curve.end.x}
              cy={curve.end.y}
              r="6"
              stroke={color(source.cell)}
              fill="var(--canvas)"
              strokeWidth="1.6"
              opacity={blocked ? 0.35 : 1}
            />
            <path
              d={`M${curve.end.x - 3} ${curve.end.y}h6${source.cell.kind === 'exc' ? `m-3 -3v6` : ''}`}
              stroke={color(source.cell)}
              strokeWidth="1.3"
              opacity={blocked ? 0.35 : 1}
            />
            {events.map((s) => {
              const age = time - s,
                p = curve.at(Math.min(1, age / 2));
              return age < 2 ? (
                <circle
                  key={s}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill={color(source.cell)}
                  stroke="var(--card)"
                  strokeWidth="1"
                />
              ) : (
                <circle
                  key={s}
                  cx={p.x}
                  cy={p.y}
                  r={7 + (age - 2) * 1.5}
                  fill="none"
                  stroke={color(source.cell)}
                  strokeWidth={blocked ? 1 : 2}
                  strokeDasharray={blocked ? '2 3' : undefined}
                  opacity={(1 - (age - 2) / 8) * (blocked ? 0.3 : 1)}
                />
              );
            })}
          </g>
        );
      })}
      {cells.map((cell, index) => {
        const recent = run.spikes[index].some((s) => time >= s && time - s < 8);
        const voltage = run.voltage[index][sample];
        const charge = Math.max(0, Math.min(1, (voltage + 65) / 15));
        const injected = run.input[index][sample] > 0;
        return (
          <g
            key={cell.id}
            role="button"
            tabIndex={0}
            aria-pressed={selected === cell.id}
            aria-label={`Select neuron ${names[cell.id]}, ${cell.kind === 'exc' ? 'excitatory' : 'inhibitory'}`}
            onClick={() => onSelect(cell.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(cell.id);
              }
            }}
          >
            <g transform={`translate(${cell.x} ${cell.y})`}>
              <circle r="61" fill="transparent" />
              {angles.map((angle, i) => (
                <g
                  key={angle}
                  transform={`rotate(${angle})`}
                  stroke={color(cell)}
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.42 + charge * 0.4}
                >
                  <path
                    d={`M16 0 Q28 ${i % 2 ? 4 : -4} 42 0 M31 0 Q38 -9 ${48 + (i % 3) * 3} -15 M41 0 Q49 3 56 12`}
                    strokeWidth="1.8"
                  />
                  <path d="M40 -10l1 -9 M49 5l9 -2" strokeWidth="1" />
                </g>
              ))}
              <circle
                className="garden-selection"
                r="28"
                fill="none"
                stroke="var(--foreground)"
                strokeWidth="1"
                strokeDasharray="2 4"
                opacity={selected === cell.id ? 0.7 : 0}
              />
              <path
                className="garden-soma"
                d="M-22 -3 C-23 -17 -10 -23 1 -20 C17 -24 22 -9 21 2 C26 16 9 23 -2 20 C-16 24 -22 12 -22 -3Z"
                fill="var(--card)"
                stroke={color(cell)}
                strokeWidth={selected === cell.id ? 2.5 : 1.6}
              />
              <path
                d="M-22 -3 C-23 -17 -10 -23 1 -20 C17 -24 22 -9 21 2 C26 16 9 23 -2 20 C-16 24 -22 12 -22 -3Z"
                fill={color(cell)}
                opacity={recent ? 0.85 : 0.07 + charge * 0.48}
                pointerEvents="none"
              />
              <ellipse
                cx="-3"
                cy="2"
                rx="7"
                ry="9"
                fill="none"
                stroke={color(cell)}
                opacity=".35"
              />
              <text
                y="6"
                textAnchor="middle"
                className="garden-cell-name"
                style={{
                  fill: recent ? 'var(--primary-foreground)' : undefined,
                }}
              >
                {names[cell.id]}
              </text>
              <text y="77" textAnchor="middle" style={{ fill: color(cell) }}>
                {cell.kind === 'exc' ? '+ excitatory' : '− inhibitory'}
              </text>
              {cell.id === pulseCell && (
                <g className="garden-electrode">
                  <path
                    d="M37 -65L8 -24M42 -62L12 -23"
                    stroke={
                      injected ? 'var(--ink-warm)' : 'var(--muted-foreground)'
                    }
                    strokeWidth={injected ? 2.5 : 1.5}
                    fill="none"
                  />
                  <text
                    x="42"
                    y="-68"
                    className="garden-figure-label"
                    style={{ fill: injected ? 'var(--ink-warm)' : undefined }}
                  >
                    {injected ? 'pulse ON' : 'pulse input'}
                  </text>
                </g>
              )}
            </g>
          </g>
        );
      })}
      {!cells.length && (
        <g>
          <text
            x="305"
            y="154"
            textAnchor="middle"
            className="garden-empty-title"
          >
            An empty circuit
          </text>
          <text x="305" y="181" textAnchor="middle">
            Add a cell below to begin again.
          </text>
        </g>
      )}
      <text x="22" y={height - 18} className="garden-figure-label">
        {connecting !== null
          ? `Choose a target for ${names[connecting]} (existing connections are removed).`
          : 'Cell → axon → synapse → receiving cell'}
      </text>
    </svg>
  );
}
