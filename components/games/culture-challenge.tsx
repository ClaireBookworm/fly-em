'use client';
/* This figure plots measured trial summaries, not generated spike trains. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Explain } from './shared';
type Trial = {
  id: string;
  pre: { fraction: number };
  stim: { fraction: number };
  post?: { fraction: number };
};
type CultureData = { layouts: { id: string; trials: Trial[] }[] };
const descriptions = [
  'One bridge between neighboring islands',
  'Three bridges between neighboring islands',
  'One continuous culture',
];
export default function CultureChallenge() {
  const [data, setData] = useState<CultureData | null>(null),
    [error, setError] = useState(''),
    [layout, setLayout] = useState(0),
    [guess, setGuess] = useState<number | null>(null),
    [trial, setTrial] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    fetch('/data/games/cultures.json', { signal: c.signal })
      .then((r) => {
        if (!r.ok) throw Error('Experimental measurements could not load.');
        return r.json();
      })
      .then((v) => setData(v as CultureData))
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => c.abort();
  }, []);
  const trials = data?.layouts[layout].trials ?? [],
    selected = trials[trial];
  const median = (a: number[]) => {
    const b = [...a].sort((a, b) => a - b);
    return b.length % 2
      ? b[Math.floor(b.length / 2)]
      : (b[b.length / 2 - 1] + b[b.length / 2]) / 2;
  };
  const before = median(trials.map((t) => t.pre.fraction)),
    after = median(trials.map((t) => t.stim.fraction));
  return (
    <section className="game-details">
      <h2>Now predict a real culture’s response.</h2>
      <p>
        In this experiment, light stimulates cells at irregular times. Will each
        collective burst recruit more of the culture, fewer cells, or about the
        same fraction?
      </p>
      <div className="game-toolbar">
        {['One bridge', 'Three bridges', 'Merged'].map((name, i) => (
          <Button
            variant="outline"
            key={name}
            aria-pressed={layout === i}
            onClick={() => {
              setLayout(i);
              setGuess(null);
              setTrial(0);
            }}
          >
            {name}
          </Button>
        ))}
      </div>
      <div className="game-two">
        <div>
          <svg
            viewBox="0 0 440 190"
            className="game-scene"
            role="img"
            aria-label={`${descriptions[layout]}; schematic architecture`}
          >
            {layout === 2 ? (
              <rect
                x="100"
                y="25"
                width="220"
                height="130"
                rx="4"
                fill="var(--secondary)"
                stroke="var(--foreground)"
              />
            ) : (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <rect
                    key={i}
                    x={105 + (i % 2) * 145}
                    y={20 + Math.floor(i / 2) * 90}
                    width="70"
                    height="55"
                    rx="4"
                    fill={i % 2 ? 'var(--surface-accent)' : 'var(--secondary)'}
                    stroke="var(--foreground)"
                  />
                ))}
                {Array.from({ length: layout === 0 ? 1 : 3 }, (_, i) => (
                  <path
                    key={i}
                    d={`M175 ${42 + i * 5}H250 M175 ${132 + i * 5}H250 M${133 + i * 5} 75V110 M${278 + i * 5} 75V110`}
                    stroke="var(--foreground)"
                  />
                ))}
              </>
            )}
            <text
              x="220"
              y="182"
              textAnchor="middle"
              fontSize="12"
              fill="currentColor"
            >
              Layout schematic · not an activity replay
            </text>
          </svg>
          <p className="game-small">
            {descriptions[layout]}.{' '}
            <Explain
              title="Calcium-derived burst participation"
              text="The authors detected population events from calcium-imaging data, then measured the fraction of recorded cells participating. Each point here is one culture’s median event participation in that condition. This is not a voltage trace or a count of individual action potentials."
              source="https://doi.org/10.1126/sciadv.ade1755"
            >
              Burst participation
            </Explain>{' '}
            measures how much of the recorded population joins an event.
          </p>
          <div className="game-toolbar">
            {['Fewer cells', 'About the same', 'More cells'].map((g, i) => (
              <Button
                key={g}
                variant="outline"
                disabled={!data}
                aria-pressed={guess === i}
                onClick={() => setGuess(i)}
              >
                {g}
              </Button>
            ))}
          </div>
        </div>
        <div>
          {error && <p role="alert">{error}</p>}
          {guess === null ? (
            <p>
              Make a prediction to reveal the measured results. Every line will
              connect the same culture before and during stimulation.
            </p>
          ) : (
            <>
              <svg
                viewBox="0 0 420 255"
                className="game-trace"
                role="img"
                aria-label={`Measured participation before ${Math.round(before * 100)} percent, during ${Math.round(after * 100)} percent; medians across ${trials.length} cultures`}
              >
                {[0, 0.5, 1].map((v) => (
                  <g key={v}>
                    <path
                      d={`M50 ${205 - v * 175}H390`}
                      stroke="var(--border)"
                    />
                    <text x="40" y={210 - v * 175} textAnchor="end">
                      {v * 100}%
                    </text>
                  </g>
                ))}
                {trials.map((r, i) => (
                  <g
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Inspect culture ${r.id}`}
                    onClick={() => setTrial(i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setTrial(i);
                      }
                    }}
                  >
                    <path
                      d={`M100 ${205 - r.pre.fraction * 175}L335 ${205 - r.stim.fraction * 175}`}
                      stroke={
                        trial === i
                          ? 'var(--primary)'
                          : 'var(--muted-foreground)'
                      }
                      strokeWidth={trial === i ? 3 : 1}
                      opacity={trial === i ? 1 : 0.4}
                    />
                    <circle
                      cx="100"
                      cy={205 - r.pre.fraction * 175}
                      r="5"
                      fill="var(--primary)"
                    />
                    <circle
                      cx="335"
                      cy={205 - r.stim.fraction * 175}
                      r="5"
                      fill="var(--ink-warm)"
                    />
                  </g>
                ))}
                <text x="100" y="235" textAnchor="middle">
                  Before
                </text>
                <text x="335" y="235" textAnchor="middle">
                  During light
                </text>
              </svg>
              <p className="game-small" role="status">
                {after < before - 0.05
                  ? 'Typical bursts involved fewer cells.'
                  : after > before + 0.05
                    ? 'Typical bursts involved more cells.'
                    : 'The median changed little in this group.'}{' '}
                Across {trials.length} cultures:{' '}
                <strong>
                  {Math.round(before * 100)}% → {Math.round(after * 100)}%
                </strong>
                . These are descriptive medians, not a significance test.
              </p>
              {selected && (
                <p className="game-small">
                  Selected culture {selected.id}:{' '}
                  {Math.round(selected.pre.fraction * 100)}% →{' '}
                  {Math.round(selected.stim.fraction * 100)}%. Click a line to
                  inspect another.
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <p className="game-small">
        Yamamoto et al. (2023),{' '}
        <a href="https://doi.org/10.1126/sciadv.ade1755">paper</a> ·{' '}
        <a href="/data/games/cultures.json" download>
          Download plotted measurements
        </a>{' '}
        ·{' '}
        <a href="https://doi.gin.g-node.org/10.12751/g-node.t77b3p/">
          Original data, CC BY-NC 4.0
        </a>
        . From the authors’ processed “Median Fraction” per trial. The sandbox
        above is not fitted to these cultures.
      </p>
    </section>
  );
}
