/* A scroll-driven camera projects real XYZ skeleton coordinates; pointer rotation has keyboard alternatives. */
/* oxlint-disable react/react-compiler, jsx-a11y/no-noninteractive-element-interactions */
'use client';
import { useEffect, useRef, useState } from 'react';
import type { Atlas } from '@/lib/simulation';
import { LessonCopy, publishedWording } from './lesson-copy';
const passages = [
  {
    title: 'What would it take to emulate this?',
    text: 'One neuron. An intricate, living piece of a brain. Before we try to emulate an entire nervous system, let’s start here.',
  },
  {
    title: 'The shape is only the beginning.',
    text: 'A reconstruction tells us where the branches go. It doesn’t tell us how the membrane responds, which channels are active, or when this cell will fire.',
  },
  {
    title: 'We need something to predict.',
    text: 'Give a cell a known input. Measure its response. Then ask a model to reproduce it. That is the experiment we’re about to build.',
  },
];
export function NeuronPrologue() {
  const root = useRef<HTMLElement>(null),
    drag = useRef<{ x: number; y: number } | null>(null);
  const [progress, setProgress] = useState(0),
    [rotation, setRotation] = useState(0),
    [cell, setCell] = useState<{ id: number; lines: number[][] } | null>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    fetch('/data/atlas.json', { signal: c.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((raw) => {
        const a = raw as Atlas;
        const n = a.circuits.heading.nodes.find(
          (n) => n.type === 'EPG' && a.skeletons[n.id],
        );
        if (!n) throw Error();
        setCell({ id: n.id, lines: a.skeletons[n.id] });
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setFailed(true);
      });
    return () => c.abort();
  }, []);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = root.current;
        if (el)
          setProgress(
            Math.max(
              0,
              Math.min(
                1,
                -el.getBoundingClientRect().top /
                  (el.offsetHeight - innerHeight),
              ),
            ),
          );
      });
    };
    update();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('scroll', update);
      removeEventListener('resize', update);
    };
  }, []);
  const stage = Math.min(2, Math.floor(progress * 3));
  const points =
    cell?.lines.flatMap((l) => [l.slice(0, 3), l.slice(3, 6)]) ?? [];
  const low = [0, 1, 2].map((i) => Math.min(...points.map((p) => p[i]))),
    high = [0, 1, 2].map((i) => Math.max(...points.map((p) => p[i])));
  const span = Math.max(...high.map((v, i) => v - low[i])) || 1;
  const yaw = rotation + progress * 1.45 - 0.35;
  const project = (p: number[]) => {
    const [x, y, z] = p.map((v, i) => (v - (low[i] + high[i]) / 2) / span);
    return [
      350 + (x * Math.cos(yaw) - y * Math.sin(yaw)) * 520,
      300 + (z * 0.95 + y * 0.15) * 520,
      y * Math.cos(yaw) + x * Math.sin(yaw),
    ];
  };
  return (
    <section
      ref={root}
      className="neuron-prologue"
      aria-label="From a reconstructed neuron to an emulation"
    >
      <div className="prologue-stage">
        <div className="prologue-topline">
          <LessonCopy as="span" copyId="prologue-field-note">
            FIELD NOTES / 001
          </LessonCopy>
          <LessonCopy as="span" copyId="prologue-topic">
            FROM NEURON TO EMULATION
          </LessonCopy>
        </div>
        <div className="prologue-art">
          {cell ? (
            <svg
              viewBox="0 0 700 600"
              aria-label={`Rotatable 3D reconstruction of E-PG neuron ${cell.id}`}
              onPointerDown={(e) => {
                drag.current = { x: e.clientX, y: rotation };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (drag.current)
                  setRotation(
                    drag.current.y + (e.clientX - drag.current.x) * 0.008,
                  );
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            >
              <defs>
                <radialGradient id="neuron-glow">
                  <stop stopColor="#25483d" />
                  <stop offset="1" stopColor="#102b27" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="350" cy="300" r="280" fill="url(#neuron-glow)" />
              {[180, 245].map((r) => (
                <circle
                  key={r}
                  cx="350"
                  cy="300"
                  r={r}
                  fill="none"
                  stroke="#d3ddbb"
                  strokeOpacity=".12"
                  strokeDasharray="2 9"
                />
              ))}
              {cell.lines.map((l, i) => {
                const a = project(l.slice(0, 3)),
                  b = project(l.slice(3, 6));
                return (
                  <path
                    key={i}
                    d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`}
                    stroke={a[2] > 0 ? '#efe1a5' : '#87b9a7'}
                    strokeOpacity={0.55 + (a[2] + 0.5) * 0.35}
                    strokeWidth={a[2] > 0 ? 1.7 : 1.15}
                    fill="none"
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>
          ) : (
            <p className="prologue-loading">
              {failed
                ? 'Reconstruction unavailable. Continue to the recordings below.'
                : 'Tracing a real neuron…'}
            </p>
          )}
          <div className="prologue-art-footer">
            <span>
              <LessonCopy as="span" copyId="prologue-arbor-label">
                E-PG / FLY CONNECTOME
              </LessonCopy>
              <br />
              <small>
                {cell
                  ? `Body ${cell.id} · simplified XYZ reconstruction`
                  : 'MaleCNS anatomy'}
              </small>
            </span>
            <div>
              <button
                aria-label="Rotate neuron left"
                onClick={() => setRotation((r) => r - 0.3)}
              >
                ↶
              </button>
              <button
                aria-label="Rotate neuron right"
                onClick={() => setRotation((r) => r + 0.3)}
              >
                ↷
              </button>
            </div>
          </div>
        </div>
        <div className="prologue-copy">
          <LessonCopy
            as="span"
            copyId="prologue-chapter-counter"
            className="prologue-count"
          >
            0{stage + 1}
            <small> / 03</small>
          </LessonCopy>
          {passages.map((p, i) => (
            <div key={i} hidden={stage !== i}>
              <LessonCopy
                as={i === 0 ? 'h1' : 'h2'}
                copyId={`prologue-title-${i}`}
              >
                {p.title}
              </LessonCopy>
              <LessonCopy copyId={`prologue-body-${i}`}>{p.text}</LessonCopy>
            </div>
          ))}
          <div className="prologue-progress" aria-label="Opening chapters">
            {passages.map((p, i) => (
              <button
                key={i}
                aria-label={`Opening: ${publishedWording[`prologue-title-${i}`] ?? p.title}`}
                aria-current={stage === i ? 'step' : undefined}
                onClick={() => {
                  const el = root.current;
                  if (el)
                    window.scrollTo({
                      top:
                        el.getBoundingClientRect().top +
                        scrollY +
                        ((el.offsetHeight - innerHeight) * (i + 0.05)) / 3,
                      behavior: matchMedia('(prefers-reduced-motion: reduce)')
                        .matches
                        ? 'instant'
                        : 'smooth',
                    });
                }}
              >
                <span />
                {i === stage ? '0' + (i + 1) : ''}
              </button>
            ))}
          </div>
          <a className="prologue-scroll" href="#recordings">
            {stage === 2 ? 'Meet the recording' : 'Scroll to look closer'} ↓
          </a>
        </div>
        <div className="prologue-bottomline">
          <LessonCopy as="span" copyId="prologue-rotate-hint">
            DRAG THE CELL TO ROTATE
          </LessonCopy>
          <LessonCopy as="span" copyId="prologue-anatomy-note">
            ANATOMY ≠ ACTIVITY
          </LessonCopy>
        </div>
      </div>
    </section>
  );
}
