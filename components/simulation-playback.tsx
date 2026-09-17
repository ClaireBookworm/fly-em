/* Accessible SVG is the data visualization itself. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
'use client';
import { useMemo } from 'react';
import { sign, type Circuit, type Result } from '@/lib/simulation';
import { useTheme, themeColor } from '@/lib/theme';
export function SimulationPlayback({
  circuit,
  edges,
  result,
  selected,
  cursor,
}: {
  circuit: Circuit;
  edges: number[][];
  result: Result;
  selected: number;
  cursor: number;
}) {
  const theme = useTheme();
  const incoming = useMemo(
    () => edges.filter((e) => e[1] === selected).sort((a, b) => b[2] - a[2]),
    [edges, selected],
  );
  const d = result.diagnostics;
  if (
    !d ||
    !circuit.nodes[selected] ||
    result.rawVoltage.length !== circuit.nodes.length ||
    !d.external[selected]
  )
    return null;
  const at = Math.min(cursor, result.time.length - 1),
    now = result.time[at];
  const V = result.rawVoltage[selected][at],
    held = d.held[selected][at];
  const fired = result.spikes[selected].some((t) => t <= now && now - t < 4);
  const green = themeColor('#bee780', theme),
    warm = themeColor('#edae7c', theme),
    blue = themeColor('#80d1ce', theme);
  const sum = incoming.reduce((s, e) => s + e[2], 0);
  const rows = [
    { label: 'External input', value: d.external[selected][at], color: blue },
    {
      label: 'Connected cells (net)',
      value: d.synaptic[selected][at],
      color: green,
    },
    {
      label:
        result.model === 'hh' ? 'Sodium, potassium + leak' : 'Membrane leak',
      value: d.intrinsic[selected][at],
      color: warm,
    },
  ];
  const scale = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  const slope = d.derivative[selected][at];
  return (
    <section
      className="voltage-cause"
      aria-label="How the selected cell voltage is calculated"
    >
      <header>
        <strong>How this voltage is made</strong>
        <span>{now} ms</span>
      </header>
      <svg
        viewBox="0 0 510 192"
        role="img"
        aria-label={`Inputs into ${circuit.nodes[selected].type}, voltage ${V.toFixed(1)} millivolts. ${held ? 'Voltage held by model rule.' : `Instantaneous slope ${slope.toFixed(2)} millivolts per millisecond.`}`}
      >
        {incoming.slice(0, 3).map(([source, , weight], j) => {
          const y = 40 + j * 53,
            s = sign(circuit.nodes[source].nt),
            release = d.release[source][at];
          const event = result.spikes[source].some(
            (t) => t <= now && now - t < 4,
          );
          const active =
            result.model === 'graded'
              ? Math.min(1, release)
              : Math.min(1, release / 2);
          const ink = s < 0 ? warm : green;
          return (
            <g key={source}>
              <path
                d={`M145 ${y} C225 ${y},240 95,302 95`}
                fill="none"
                stroke={ink}
                strokeWidth={1 + (3 * weight) / Math.max(1, sum)}
                opacity={0.15 + 0.85 * active}
              />
              <circle
                cx="131"
                cy={y}
                r={event ? 13 : 9}
                fill={ink}
                fillOpacity={event ? 1 : 0.12 + 0.7 * active}
                stroke={ink}
              />
              <text x="112" y={y - 2} textAnchor="end">
                {circuit.nodes[source].type}
              </text>
              <text
                x="112"
                y={y + 14}
                textAnchor="end"
                style={{ fontSize: 11 }}
              >
                {weight} contacts ·{' '}
                {s > 0 ? 'assumed +' : s < 0 ? 'assumed −' : 'unassigned'}
              </text>
            </g>
          );
        })}
        {!incoming.length && (
          <text x="20" y="95">
            No retained incoming edges
          </text>
        )}
        <path
          d="M354 21 V49"
          stroke={blue}
          strokeWidth="3"
          opacity={Math.abs(rows[0].value) > 0.01 ? 1 : 0.2}
        />
        <path d="M349 43 L354 50 L359 43" fill="none" stroke={blue} />
        <text x="365" y="28">
          input
        </text>
        <circle
          cx="354"
          cy="95"
          r={fired ? 50 : 46}
          fill={green}
          fillOpacity={fired ? 0.3 : 0.08}
          stroke={green}
          strokeWidth={fired ? 3 : 1.5}
        />
        <text x="354" y="91" textAnchor="middle" className="cause-voltage">
          {V.toFixed(1)}
        </text>
        <text x="354" y="111" textAnchor="middle">
          mV
        </text>
        <text x="354" y="160" textAnchor="middle">
          {circuit.nodes[selected].type} ·{' '}
          {held === 2
            ? 'silenced'
            : held === 1
              ? 'refractory'
              : fired
                ? 'spike event'
                : 'modeled cell'}
        </text>
        <text x="20" y="183" style={{ fontSize: 12 }}>
          {incoming.length > 3
            ? `3 of ${incoming.length} inputs drawn; every retained input enters the sum.`
            : 'Connections use retained contact counts; signs are model assumptions.'}
        </text>
      </svg>
      {rows.map((r) => (
        <div className="balance-row" key={r.label}>
          <span>
            <i
              style={{
                background: r.color,
                width: 8 + (62 * Math.abs(r.value)) / scale,
              }}
            />
            {r.label}
          </span>
          <output>
            {r.value >= 0 ? '+' : ''}
            {r.value.toFixed(2)} mV/ms
          </output>
        </div>
      ))}
      <div className="balance-row">
        <strong>
          {held
            ? 'Voltage held by reset / silencing rule'
            : Math.abs(slope) < 0.015
              ? 'Approximately balanced'
              : slope > 0
                ? 'Voltage rising'
                : 'Voltage falling'}
        </strong>
        <output>
          {slope >= 0 ? '+' : ''}
          {slope.toFixed(2)} mV/ms
        </output>
      </div>
      <p>
        {held
          ? 'The hold rule overrides these current contributions. LIF’s reset jump is a separate event.'
          : 'The three terms add to the instantaneous voltage slope. Positive pushes upward; negative pulls downward.'}{' '}
        {result.model === 'graded'
          ? 'Cell shading follows continuous release; this model does not spike.'
          : 'Cell flashes mark computed spikes; connection brightness follows the decaying release signal.'}
      </p>
    </section>
  );
}
