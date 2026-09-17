/* Effects stop the external playback clock at its final sample; React compiler is not enabled. */
/* oxlint-disable react/react-compiler */
'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Pause, Play } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { EditableCopy } from './copy-editor';

export function StoryHeader({ part }: { part: 'connectome' | 'neuron' }) {
  const progress = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - innerHeight;
        if (progress.current)
          progress.current.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
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
  return (
    <header className="essay-header">
      <Link href="/" className="essay-wordmark">
        fly<span>/</span>em
      </Link>
      <nav aria-label="Story navigation">
        <Link
          href="/"
          aria-current={part === 'connectome' ? 'page' : undefined}
        >
          Connectome lab
        </Link>
        <Link
          href="/learn"
          aria-current={part === 'neuron' ? 'page' : undefined}
        >
          Neuron models
        </Link>
        <Link
          className="essay-bench-link"
          href={part === 'connectome' ? '/explore' : '/lab'}
        >
          Open workbench ↗
        </Link>
        <Link href="/games/garden">Circuit games</Link>
        <ThemeToggle />
      </nav>
      <div className="essay-progress" ref={progress} />
    </header>
  );
}
export function Chapter({
  title,
  paragraphs,
  number,
  id,
}: {
  number: string;
  title: string;
  paragraphs: string[];
  id?: string;
}) {
  return (
    <div className="essay-copy" id={id}>
      <EditableCopy as="h2" copyId={`chapter-${number}-title`}>
        {title}
      </EditableCopy>
      {paragraphs.map((p, i) => (
        <EditableCopy copyId={`chapter-${number}-paragraph-${i}`} key={p}>
          {p}
        </EditableCopy>
      ))}
    </div>
  );
}
export function ScrollPrompt({
  href,
  label = 'Follow the connections',
}: {
  href: string;
  label?: string;
}) {
  return (
    <a className="essay-scroll-prompt" href={href}>
      {label}
      <ArrowDown size={17} />
    </a>
  );
}
export function StoryNext({
  title,
  text,
  href,
  label,
}: {
  title: string;
  text: string;
  href: string;
  label: string;
}) {
  return (
    <section className="essay-next">
      <span className="essay-kicker">Keep exploring</span>
      <EditableCopy as="h2" copyId="next-title">
        {title}
      </EditableCopy>
      <EditableCopy copyId="next-text">{text}</EditableCopy>
      <Link href={href}>
        {label}
        <ArrowRight size={22} />
      </Link>
    </section>
  );
}
export function StoryControl({
  label,
  value,
  min = 0,
  max = 2,
  step = 0.1,
  unit = '×',
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="essay-control">
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
export function StoryPlayback({
  cursor,
  max,
  onCursor,
  playing,
  onPlaying,
  disabled = false,
  step = 1,
  timeScale = 1,
}: {
  cursor: number;
  max: number;
  onCursor: (n: number) => void;
  playing: boolean;
  onPlaying: (b: boolean) => void;
  disabled?: boolean;
  step?: number;
  timeScale?: number;
}) {
  return (
    <div className="essay-playback">
      <Button
        variant="outline"
        className="essay-play-button"
        disabled={disabled}
        onClick={() => onPlaying(!playing)}
        aria-label={playing ? 'Pause simulation' : 'Play simulation'}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
        <span>{playing ? 'Pause' : 'Play'}</span>
      </Button>
      <Slider
        aria-label="Simulation time"
        min={0}
        max={max}
        step={step}
        value={[cursor]}
        disabled={disabled}
        onValueChange={(v) => {
          onPlaying(false);
          onCursor(Array.isArray(v) ? v[0] : v);
        }}
      />
      <output>
        {(cursor * timeScale).toFixed(timeScale < 1 ? 1 : 0)} <small>ms</small>
      </output>
    </div>
  );
}
export function StoryFooter() {
  return (
    <footer className="essay-footer">
      <Link href="/">fly/em</Link>
      <p>Fly connectome anatomy and illustrative neuron models.</p>
      <Link href="/explore#methods">Sources & assumptions ↗</Link>
    </footer>
  );
}
export function usePlayback(max: number, speed = 2, initial = 0) {
  const [cursor, setCursor] = useState(initial),
    [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () => setCursor((t) => Math.min(max, t + speed)),
      40,
    );
    return () => clearInterval(timer);
  }, [playing, max, speed]);
  useEffect(() => {
    if (cursor >= max) setPlaying(false);
  }, [cursor, max]);
  const play = (active: boolean) => {
    if (active && cursor >= max) setCursor(0);
    setPlaying(active);
  };
  return {
    cursor,
    setCursor,
    playing,
    setPlaying: play,
    replay: () => {
      setCursor(0);
      setPlaying(true);
    },
  };
}
