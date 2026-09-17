/* Canvas/SVG plots require image semantics. Pointer selection is an optional shortcut; the native neuron selector provides the same keyboard-accessible action. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */
'use client';
import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Plus, Minus, Move3D } from 'lucide-react';
import { useTheme, themeColor } from '@/lib/theme';
import type { Atlas, Circuit, Result } from '@/lib/simulation';
export function AtlasView({
  atlas,
  circuit,
  color,
  selected,
  onSelect,
  result,
  cursor,
  graph,
  edges,
}: {
  atlas: Atlas;
  circuit: Circuit;
  color: string;
  selected: number;
  onSelect: (i: number) => void;
  result?: Result;
  cursor: number;
  graph: boolean;
  edges: number[][];
}) {
  const theme = useTheme();
  const canvas = useRef<HTMLCanvasElement>(null),
    hits = useRef<number[][]>([]),
    drag = useRef({ x: 0, y: 0, moved: false, down: false });
  const [camera, setCamera] = useState({
    yaw: 0,
    pitch: 0,
    zoom: 1,
    cns: false,
  });
  const [size, setSize] = useState([800, 470]);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ob = new ResizeObserver(([e]) =>
      setSize([e.contentRect.width, e.contentRect.height]),
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    const [w, h] = size,
      dpr = Math.min(devicePixelRatio || 1, 2);
    el.width = w * dpr;
    el.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const scale =
        Math.min(w / 830, h / (camera.cns ? 1110 : 420)) * camera.zoom,
      center = [390, 280, camera.cns ? 570 : 280];
    const project = (p: number[]) => {
      const x = p[0] - center[0];
      let y = p[1] - center[1],
        z = p[2] - center[2];
      const xx = x * Math.cos(camera.yaw) + y * Math.sin(camera.yaw);
      y = y * Math.cos(camera.yaw) - x * Math.sin(camera.yaw);
      z = z * Math.cos(camera.pitch) + y * Math.sin(camera.pitch);
      return [w / 2 + xx * scale, h / 2 + z * scale];
    };
    const activity = (i: number) => {
      const v =
        result?.voltage[i]?.[Math.min(cursor, result.time.length - 1)] ?? -65;
      return Math.max(
        0,
        Math.min(1, (v + 65) / (result?.model === 'hh' ? 90 : 35)),
      );
    };
    const dot = (p: number[], r: number, c: string) => {
      ctx.beginPath();
      ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
    };
    if (!graph) {
      ctx.fillStyle = themeColor('#819b8648', theme);
      for (const p of atlas.points) {
        const q = project(p);
        ctx.fillRect(q[0], q[1], 1, 1);
      }
      const drawSkeleton = (id: number, stroke: string, lw: number) => {
        const lines = atlas.skeletons[id];
        if (!lines) return;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lw;
        ctx.beginPath();
        for (const l of lines) {
          const a = project(l.slice(0, 3)),
            b = project(l.slice(3));
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
        }
        ctx.stroke();
      };
      for (const id of atlas.backgroundIds)
        drawSkeleton(id, themeColor('#8da69624', theme), 0.6);
      for (const id of circuit.skeletonIds)
        drawSkeleton(id, color + 'b0', 0.85);
      const active = circuit.nodes[selected];
      if (active) drawSkeleton(active.id, themeColor('#f5f8e9', theme), 1.5);
      hits.current = circuit.nodes.map((n, i) => {
        if (!n.position) return [-10000, -10000, i];
        const q = project(n.position),
          a = activity(i);
        dot(
          q,
          i === selected ? 5 : 2 + a * 3,
          i === selected
            ? themeColor('#ffffed', theme)
            : color + (a > 0.1 ? 'ee' : '99'),
        );
        return [...q, i];
      });
      ctx.fillStyle = themeColor('#8fa096', theme);
      ctx.font = '12px Arial';
      ctx.fillText('100 µm', 28, h - 25);
      ctx.strokeStyle = themeColor('#8fa096', theme);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(28, h - 38);
      ctx.lineTo(28 + 100 * scale, h - 38);
      ctx.stroke();
    } else {
      const types = [...new Set(circuit.nodes.map((n) => n.type))];
      const layout = circuit.nodes.map((n, i) => {
        const peers = circuit.nodes
            .map((v, j) => (v.type === n.type ? j : -1))
            .filter((j) => j >= 0),
          j = peers.indexOf(i);
        return [
          60 +
            (types.indexOf(n.type) * (w - 120)) / Math.max(1, types.length - 1),
          72 + (j * (h - 130)) / Math.max(1, peers.length - 1),
        ];
      });
      ctx.lineWidth = 0.65;
      for (const [a, b, weight] of edges) {
        const from = layout[a],
          to = layout[b];
        ctx.strokeStyle =
          a === selected || b === selected
            ? color + 'bb'
            : themeColor('#6e907c1e', theme);
        ctx.lineWidth =
          a === selected || b === selected
            ? Math.min(3, 0.5 + Math.log1p(weight) / 3)
            : 0.6;
        ctx.beginPath();
        ctx.moveTo(...(from as [number, number]));
        ctx.quadraticCurveTo(
          (from[0] + to[0]) / 2 + 20,
          (from[1] + to[1]) / 2 - 12,
          to[0],
          to[1],
        );
        ctx.stroke();
      }
      hits.current = layout.map((p, i) => {
        dot(
          p,
          i === selected ? 6 : 2.5 + activity(i) * 3,
          i === selected ? themeColor('#ffffed', theme) : color,
        );
        return [...p, i];
      });
      ctx.font = '12px Arial';
      ctx.fillStyle = themeColor('#b6c8bc', theme);
      ctx.textAlign = 'center';
      types.forEach((t, i) =>
        ctx.fillText(
          t.replace('PEN_a(PEN1)', 'PEN1').replace('PEN_b(PEN2)', 'PEN2'),
          60 + (i * (w - 120)) / Math.max(1, types.length - 1),
          35,
        ),
      );
      ctx.textAlign = 'left';
    }
  }, [
    theme,
    atlas,
    circuit,
    color,
    selected,
    result,
    cursor,
    graph,
    edges,
    camera,
    size,
  ]);
  return (
    <div className="atlas-surface">
      <div className="atlas-toolbar">
        <span className="small-label">
          <Move3D size={14} />
          {graph ? 'Directed contact graph' : 'Reconstructed anatomy'}
        </span>
        <div className="button-group">
          {!graph && (
            <button
              className="quiet-button"
              onClick={() => setCamera((c) => ({ ...c, cns: !c.cns, zoom: 1 }))}
            >
              {camera.cns ? 'Focus brain' : 'Include nerve cord'}
            </button>
          )}
          <button
            className="icon-button"
            aria-label="Zoom in"
            disabled={graph}
            onClick={() =>
              setCamera((c) => ({ ...c, zoom: Math.min(3, c.zoom * 1.2) }))
            }
          >
            <Plus size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Zoom out"
            disabled={graph}
            onClick={() =>
              setCamera((c) => ({ ...c, zoom: Math.max(0.5, c.zoom / 1.2) }))
            }
          >
            <Minus size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Reset anatomical view"
            onClick={() => setCamera({ yaw: 0, pitch: 0, zoom: 1, cns: false })}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
      <canvas
        ref={canvas}
        className="atlas-canvas"
        role="img"
        aria-label={
          graph
            ? 'Selected circuit contact graph. Use the neuron selector for accessible inspection.'
            : 'MaleCNS soma sample and reconstructed neuron skeletons. Drag to rotate; select a highlighted soma to inspect a neuron.'
        }
        tabIndex={0}
        onKeyDown={(e) => {
          if (
            ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
          ) {
            e.preventDefault();
            setCamera((c) => ({
              ...c,
              yaw:
                c.yaw +
                (e.key === 'ArrowRight'
                  ? 0.1
                  : e.key === 'ArrowLeft'
                    ? -0.1
                    : 0),
              pitch:
                c.pitch +
                (e.key === 'ArrowDown' ? 0.1 : e.key === 'ArrowUp' ? -0.1 : 0),
            }));
          }
        }}
        onPointerDown={(e) => {
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            moved: false,
            down: true,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current.down || graph) return;
          const dx = e.clientX - drag.current.x,
            dy = e.clientY - drag.current.y;
          if (Math.abs(dx) + Math.abs(dy) > 2) drag.current.moved = true;
          setCamera((c) => ({
            ...c,
            yaw: c.yaw + dx * 0.006,
            pitch: Math.max(-1.2, Math.min(1.2, c.pitch + dy * 0.005)),
          }));
          drag.current.x = e.clientX;
          drag.current.y = e.clientY;
        }}
        onPointerUp={(e) => {
          if (!drag.current.moved) {
            const rect = e.currentTarget.getBoundingClientRect(),
              x = e.clientX - rect.left,
              y = e.clientY - rect.top;
            const nearest = hits.current
              .map((p) => ({ i: p[2], d: Math.hypot(p[0] - x, p[1] - y) }))
              .sort((a, b) => a.d - b.d)[0];
            if (nearest && nearest.d < 18) onSelect(nearest.i);
          }
          drag.current.down = false;
        }}
        onPointerCancel={() => (drag.current.down = false)}
      />
      <div className="atlas-caption">
        <span>
          <i style={{ background: color }} />
          {circuit.nodes.length} selected neurons · {circuit.skeletonIds.length}{' '}
          arbor exemplars
        </span>
        <span>
          {graph
            ? 'Columns group cell types; curves are connections.'
            : 'Drag to orbit · click a soma · highlighted activity is simulated'}
        </span>
      </div>
    </div>
  );
}
