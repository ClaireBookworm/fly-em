/* Canvas/SVG plots require image semantics. Pointer selection is an optional shortcut; the native neuron selector provides the same keyboard-accessible action. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */
'use client';
import { useEffect, useRef, useState } from 'react';
import type { Result } from '@/lib/simulation';
export interface Line {
  label: string;
  values: number[];
  color: string;
  sem?: number[];
}
export function TracePlot({
  time,
  lines,
  unit = 'mV',
  timeUnit = 'ms',
  cursor,
  height = 210,
}: {
  time: number[];
  lines: Line[];
  unit?: string;
  timeUnit?: string;
  cursor?: number;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (!time.length || !lines.length) return null;
  const W = 640,
    H = height,
    left = 48,
    right = 18,
    top = 22,
    bottom = 34;
  const all = lines.flatMap((l) =>
    l.values.flatMap((v, i) => [v - (l.sem?.[i] ?? 0), v + (l.sem?.[i] ?? 0)]),
  );
  let low = Math.min(...all),
    high = Math.max(...all);
  const pad = Math.max((high - low) * 0.12, 0.05);
  low -= pad;
  high += pad;
  const x = (i: number) =>
      left +
      ((time[i] - time[0]) / (time[time.length - 1] - time[0] || 1)) *
        (W - left - right),
    y = (v: number) => top + ((high - v) / (high - low)) * (H - top - bottom);
  const focus = hover ?? cursor;
  return (
    <div className="trace-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${unit} over time in ${timeUnit}: ${lines.map((l) => l.label).join(', ')}`}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const frac =
            (((e.clientX - r.left) / r.width) * W - left) / (W - left - right);
          setHover(
            Math.max(
              0,
              Math.min(time.length - 1, Math.round(frac * (time.length - 1))),
            ),
          );
        }}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 1, 2, 3].map((i) => {
          const val = low + ((high - low) * i) / 3;
          return (
            <g key={i}>
              <line
                x1={left}
                y1={y(val)}
                x2={W - right}
                y2={y(val)}
                stroke="#304136"
                strokeDasharray="3 5"
              />
              <text x={left - 8} y={y(val) + 4} textAnchor="end">
                {val.toFixed(Math.abs(high - low) > 10 ? 0 : 1)}
              </text>
            </g>
          );
        })}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const i = Math.round(f * (time.length - 1));
          return (
            <text key={f} x={x(i)} y={H - 12} textAnchor="middle">
              {time[i].toFixed(timeUnit === 's' ? 1 : 0)}
            </text>
          );
        })}
        <text x={7} y={13}>
          {unit}
        </text>
        <text x={W - 7} y={H - 12} textAnchor="end">
          {timeUnit}
        </text>
        {lines.map((l) => (
          <g key={l.label}>
            {l.sem && (
              <path
                d={
                  l.values
                    .map(
                      (v, i) =>
                        `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(v + l.sem![i]).toFixed(2)}`,
                    )
                    .join(' ') +
                  l.values
                    .map((_, j) => {
                      const i = l.values.length - 1 - j;
                      return `L${x(i).toFixed(2)},${y(l.values[i] - l.sem![i]).toFixed(2)}`;
                    })
                    .join(' ') +
                  'Z'
                }
                fill={l.color + '20'}
              />
            )}
            <path
              d={l.values
                .map(
                  (v, i) =>
                    `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(v).toFixed(2)}`,
                )
                .join(' ')}
              fill="none"
              stroke={l.color}
              strokeWidth="1.7"
            />
          </g>
        ))}
        {focus != null && focus < time.length && (
          <line
            x1={x(focus)}
            x2={x(focus)}
            y1={top}
            y2={H - bottom}
            stroke="#f2f6e780"
          />
        )}
      </svg>
      <div className="plot-legend">
        {lines.map((l) => (
          <span key={l.label}>
            <i style={{ background: l.color }} />
            {l.label}
            {hover != null && (
              <b>
                {l.values[hover]?.toFixed(2)} {unit}
              </b>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
export function Heatmap({
  rows,
  label,
  color = '#bee780',
  range,
  timeEnd,
  timeUnit = 'ms',
  cursor,
  onSelect,
}: {
  rows: number[][];
  label: string;
  color?: string;
  range?: number[];
  timeEnd: number;
  timeUnit?: string;
  cursor?: number;
  onSelect?: (i: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !rows.length) return;
    const w = rows[0].length,
      h = rows.length;
    el.width = w;
    el.height = h;
    const ctx = el.getContext('2d')!;
    const im = ctx.createImageData(w, h);
    let lo = range?.[0] ?? Infinity,
      hi = range?.[1] ?? -Infinity;
    if (!range)
      for (const r of rows)
        for (const v of r) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
    const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    rows.forEach((r, j) =>
      r.forEach((v, i) => {
        const f = Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1)));
        const at = (j * w + i) * 4;
        for (let k = 0; k < 3; k++) im.data[at + k] = 12 + (rgb[k] - 12) * f;
        im.data[at + 3] = 255;
      }),
    );
    ctx.putImageData(im, 0, 0);
    if (cursor != null) {
      ctx.fillStyle = '#ffffff88';
      ctx.fillRect(cursor, 0, 1, h);
    }
  }, [rows, color, range, cursor]);
  return (
    <div className="heatmap">
      <div className="small-label">{label}</div>
      <canvas
        ref={ref}
        role="img"
        aria-label={label}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onSelect?.(
            Math.min(
              rows.length - 1,
              Math.floor(((e.clientY - r.top) / r.height) * rows.length),
            ),
          );
        }}
      />
      <div className="heatmap-scale">
        <span>0</span>
        {range && (
          <span>
            Color scale {range[0]} to {range[1]}
          </span>
        )}
        <span>
          {timeEnd.toFixed(timeUnit === 's' ? 1 : 0)} {timeUnit}
        </span>
      </div>
    </div>
  );
}
export function Raster({
  result,
  onSelect,
}: {
  result: Result;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="raster">
      {result.totalSpikes === 0 && (
        <p className="annotation">
          No spike events in this run. This model can depolarize without
          crossing its spike threshold.
        </p>
      )}
      <div className="small-label">
        Spike times · {result.spikes.length} modeled neurons
      </div>
      <svg
        viewBox="0 0 600 125"
        role="img"
        aria-label="Simulated spike raster. Each row is a modeled neuron."
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          onSelect(
            Math.min(
              result.spikes.length - 1,
              Math.max(
                0,
                Math.floor(
                  ((e.clientY - r.top) / r.height) * result.spikes.length,
                ),
              ),
            ),
          );
        }}
      >
        {result.spikes.flatMap((s, i) =>
          s.map((t, j) => (
            <line
              key={`${i}-${j}`}
              x1={t}
              x2={t}
              y1={(i / result.spikes.length) * 120}
              y2={((i + 1) / result.spikes.length) * 120 + 1}
              stroke="#c2e699"
              strokeWidth="1"
            />
          )),
        )}
      </svg>
      <div className="heatmap-scale">
        <span>0</span>
        <span>600 ms</span>
      </div>
    </div>
  );
}
export function Trajectory({
  result,
  color,
  cursor,
}: {
  result: Result;
  color: string;
  cursor: number;
}) {
  const p = result.trajectory;
  if (!p.length) return null;
  const xs = p.map((v) => v[0]),
    ys = p.map((v) => v[1]),
    lo = [Math.min(...xs), Math.min(...ys)],
    hi = [Math.max(...xs), Math.max(...ys)];
  const xy = (v: number[]) => [
    25 + ((v[0] - lo[0]) / (hi[0] - lo[0] || 1)) * 280,
    165 - ((v[1] - lo[1]) / (hi[1] - lo[1] || 1)) * 140,
  ];
  const q = xy(p[Math.min(cursor, p.length - 1)]);
  return (
    <svg
      className="trajectory"
      viewBox="0 0 335 190"
      role="img"
      aria-label="First two principal components of simulated membrane voltages"
    >
      <path
        d={p.map((v, i) => `${i ? 'L' : 'M'}${xy(v).join(',')}`).join(' ')}
        stroke={color}
        fill="none"
        strokeWidth="1.4"
      />
      <circle cx={q[0]} cy={q[1]} r="4" fill="#fff" />
      <text x="230" y="187">
        PC1 {(result.explained[0] * 100).toFixed(0)}%
      </text>
      <text x="5" y="12">
        PC2 {(result.explained[1] * 100).toFixed(0)}%
      </text>
    </svg>
  );
}
