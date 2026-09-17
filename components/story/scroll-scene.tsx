'use client';
import { useEffect, useRef } from 'react';
export interface StoryStep {
  id: string;
  title: string;
  text: string;
  after: string;
}
export function ScrollScene({
  steps,
  active,
  onActive,
  children,
}: {
  steps: readonly StoryStep[];
  active: number;
  onActive: (n: number) => void;
  children: React.ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting)
            onActive(Number((entry.target as HTMLElement).dataset.step));
      },
      {
        rootMargin: matchMedia('(max-width: 800px)').matches
          ? '-55% 0px -15% 0px'
          : '-35% 0px -35% 0px',
        threshold: 0,
      },
    );
    el.querySelectorAll('[data-step]').forEach((step) =>
      observer.observe(step),
    );
    return () => observer.disconnect();
  }, [onActive]);
  return (
    <div className="essay-scroll-scene" ref={container}>
      <div className="essay-scene-prose">
        {steps.map((step, i) => (
          <section
            className={`essay-scene-step ${active === i ? 'is-current' : ''}`}
            data-step={i}
            key={step.id}
            id={`step-${step.id}`}
          >
            <span className="essay-step-index">0{i + 1} / 04</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
            <p className="essay-scene-after">{step.after}</p>
          </section>
        ))}
      </div>
      <div className="essay-sticky-scene">
        <div
          className="essay-scene-tabs"
          aria-label="Membrane explanation steps"
        >
          {steps.map((step, i) => (
            <button
              key={step.id}
              aria-label={step.title}
              aria-pressed={active === i}
              onClick={() => {
                onActive(i);
                container.current
                  ?.querySelector(`[data-step="${i}"]`)
                  ?.scrollIntoView({
                    block: 'center',
                    behavior: matchMedia('(prefers-reduced-motion: reduce)')
                      .matches
                      ? 'auto'
                      : 'smooth',
                  });
              }}
            >
              0{i + 1}
            </button>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}
