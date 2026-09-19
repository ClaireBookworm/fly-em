'use client';
/* Animation is an external clock, not a React-derived value. */
/* oxlint-disable react/react-compiler, jsx-a11y/prefer-tag-over-role */
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
  PopoverDescription,
} from '@/components/ui/popover';
import { ThemeToggle } from '@/components/theme-toggle';
import { advanceGameTime, gameSampleIndex } from '@/lib/game-playback';

export function GameNav({ active }: { active: string }) {
  return (
    <nav className="game-nav" aria-label="Games">
      <a href="/">fly/em · lab</a>
      <div>
        {[
          ['garden', 'Circuit garden'],
          ['wiring', 'Which wiring?'],
          ['faces', 'Face code'],
        ].map(([id, label]) => (
          <a
            key={id}
            aria-current={active === id ? 'page' : undefined}
            href={`/games/${id}`}
          >
            {label}
          </a>
        ))}
        <a href="/embodied">Emulation</a>
        <ThemeToggle />
      </div>
    </nav>
  );
}
export function Explain({
  title,
  children,
  text,
  graphic,
  source,
}: {
  title: string;
  children: React.ReactNode;
  text: string;
  graphic?: React.ReactNode;
  source?: string;
}) {
  const [open, setOpen] = useState(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const close = () => {
    cancel();
    timer.current = setTimeout(() => setOpen(false), 350);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="term-trigger"
        onMouseEnter={() => {
          cancel();
          timer.current = setTimeout(() => setOpen(true), 150);
        }}
        onMouseLeave={close}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="term-window"
        sideOffset={8}
        initialFocus={false}
        onMouseEnter={cancel}
        onMouseLeave={close}
      >
        <div className="term-window-bar">
          <PopoverTitle>{title}</PopoverTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Close explanation"
          >
            <X size={16} />
          </Button>
        </div>
        <div className="term-window-body">
          <PopoverDescription>{text}</PopoverDescription>
          {graphic}
          {source && (
            <a href={source} target="_blank" rel="noreferrer">
              Read the source ↗
            </a>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
export function useGameClock(duration: number, speed = 0.15) {
  const [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    let raf = 0,
      before = performance.now();
    const tick = (now: number) => {
      const previous = before;
      before = now;
      setTime((t) => advanceGameTime(t, previous, now, duration, speed));
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
export function GameClock({
  clock,
  label = 'simulation',
}: {
  clock: ReturnType<typeof useGameClock>;
  label?: string;
}) {
  return (
    <div className="game-clock">
      <Button
        variant="outline"
        onClick={() => {
          if (clock.time >= clock.duration) clock.setTime(0);
          clock.setPlaying(!clock.playing);
        }}
        aria-label={`${clock.playing ? 'Pause' : 'Play'} ${label}`}
      >
        {clock.playing ? <Pause size={15} /> : <Play size={15} />}{' '}
        {clock.playing
          ? 'Pause'
          : clock.time >= clock.duration
            ? 'Replay'
            : 'Play'}
      </Button>
      <Slider
        aria-label={`${label} time`}
        min={0}
        max={clock.duration}
        value={[clock.time]}
        step={1}
        onValueChange={(v) => {
          clock.setPlaying(false);
          clock.setTime(Array.isArray(v) ? v[0] : v);
        }}
      />
      <output>{Math.round(clock.time)} ms</output>
    </div>
  );
}
export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="game-range">
      <span>
        {label}
        <output>
          {Number(value.toFixed(2))}
          {unit}
        </output>
      </span>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </label>
  );
}
export function MiniTrace({
  values,
  cursor,
  min = -75,
  max = 25,
  unit = 'mV',
  duration = 600,
  threshold,
}: {
  values: number[];
  cursor: number;
  min?: number;
  max?: number;
  unit?: string;
  duration?: number;
  threshold?: number;
}) {
  const y = (v: number) => 118 - ((v - min) / (max - min)) * 94;
  const end = gameSampleIndex(cursor, values.length, duration) + 1;
  return (
    <svg
      className="game-trace"
      viewBox="0 0 460 145"
      role="img"
      aria-label={`${unit} trace, through ${Math.round(cursor)} milliseconds`}
    >
      <text x="4" y="14">
        {unit}
      </text>
      {[min, max].map((v) => (
        <g key={v}>
          <path d={`M40 ${y(v)}H448`} stroke="var(--border)" />
          <text x="32" y={y(v) + 4} textAnchor="end">
            {v}
          </text>
        </g>
      ))}
      {threshold !== undefined && (
        <g>
          <path
            d={`M40 ${y(threshold)}H448`}
            stroke="var(--ink-warm)"
            strokeDasharray="4 4"
          />
          <text x="445" y={y(threshold) - 5} textAnchor="end">
            threshold {threshold}
          </text>
        </g>
      )}
      <path
        d={values
          .slice(0, end)
          .map(
            (v, i) =>
              `${i ? 'L' : 'M'}${40 + (i / (values.length - 1)) * 408},${y(v)}`,
          )
          .join(' ')}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
      />
      <circle
        cx={40 + ((end - 1) / (values.length - 1)) * 408}
        cy={y(values[end - 1])}
        r="4"
        fill="var(--primary)"
      />
      <text x="40" y="140">
        0
      </text>
      <text x="445" y="140" textAnchor="end">
        {duration} ms
      </text>
    </svg>
  );
}
