'use client';
/* Scientific network and sensor diagrams; activity is continuous, not spiking. */
/* oxlint-disable react/react-compiler, jsx-a11y/prefer-tag-over-role */
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Explain, GameClock, GameNav, MiniTrace, useGameClock } from './shared';
import ResearchMedia from './research-media';
import {
  importantUnits,
  makeWiringModels,
  movie,
  predict,
  runMovie,
  testModel,
  trainModel,
  type Decoder,
  type WiringData,
} from '@/lib/wiring-game';
const labels = ['Anatomical wiring', 'Scrambled wiring', 'Movie features only'];
export default function WiringGame() {
  const [data, setData] = useState<WiringData | null>(null),
    [error, setError] = useState(''),
    [seed, setSeed] = useState(17),
    [bypass, setBypass] = useState(true),
    [selected, setSelected] = useState(0),
    [cell, setCell] = useState(0),
    [direction, setDirection] = useState(1),
    [clip, setClip] = useState(0),
    [revealed, setRevealed] = useState(false),
    [guess, setGuess] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [decoders, setDecoders] = useState<Decoder[] | null>(null),
    [scores, setScores] = useState<number[]>([]),
    [muted, setMuted] = useState<number[]>([]),
    [intervention, setIntervention] = useState(''),
    [afterScore, setAfterScore] = useState<number | null>(null),
    [retrained, setRetrained] = useState<Decoder | null>(null);
  useEffect(() => {
    const c = new AbortController();
    fetch('/data/games/wiring.json', { signal: c.signal })
      .then((r) => {
        if (!r.ok) throw Error('Wiring could not load.');
        return r.json();
      })
      .then((v) => setData(v as WiringData))
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      });
    return () => c.abort();
  }, []);
  const clock = useGameClock(600, 0.2),
    models = useMemo(
      () => (data ? makeWiringModels(data, seed) : []),
      [data, seed],
    );
  const order = useMemo(() => (seed % 2 ? [1, 2, 0] : [2, 0, 1]), [seed]),
    modelIndex = order[selected];
  const m = useMemo(
    () => movie(90001 + clip * 101, direction),
    [clip, direction],
  );
  const model = models[modelIndex],
    working = useMemo(
      () => (model ? { ...model, muted } : null),
      [model, muted],
    );
  const run = useMemo(
    () => (working ? runMovie(working, m, bypass) : null),
    [working, m, bypass],
  );
  const frame = Math.min(23, Math.floor(clock.time / 25)),
    decoder = retrained ?? decoders?.[modelIndex],
    output = decoder && run ? predict(decoder, run.features) : null;
  const clearIntervention = () => {
    setMuted([]);
    setAfterScore(null);
    setRetrained(null);
    setIntervention('');
  };
  const train = () => {
    setBusy(true);
    clearIntervention();
    setTimeout(() => {
      try {
        const ds = models.map((m) => trainModel(m, bypass, 1000 + seed));
        setDecoders(ds);
        setScores(
          models.map((m, i) => testModel(m, ds[i], bypass, 70000 + seed)),
        );
        setRevealed(false);
        setGuess(null);
      } catch {
        setError('Training failed. Reset the experiment and try again.');
      } finally {
        setBusy(false);
      }
    }, 30);
  };
  const silence = (all = false) => {
    const originalDecoder = decoders?.[modelIndex];
    if (!model || !originalDecoder) return;
    const ids = all
      ? model.matrix.map((_, i) => i)
      : importantUnits(model, originalDecoder);
    setMuted(ids);
    setRetrained(null);
    setAfterScore(
      testModel(
        { ...model, muted: ids },
        originalDecoder,
        bypass,
        70000 + seed,
      ),
    );
    setIntervention(
      `${all ? 'All recurrent units' : 'Four high-readout-weight units'} silenced. Original decoder is frozen.`,
    );
  };
  const retrain = () => {
    if (!model) return;
    setBusy(true);
    setTimeout(() => {
      const mm = { ...model, muted };
      const d = trainModel(mm, bypass, 1000 + seed);
      setRetrained(d);
      setAfterScore(testModel(mm, d, bypass, 70000 + seed));
      setIntervention(
        'Decoder retrained on the same 96 training movies, with those units still silenced.',
      );
      setBusy(false);
    }, 30);
  };
  return (
    <main className="games-page">
      <GameNav active="wiring" />
      <h1>Which wiring did the work?</h1>
      <p>
        Teach three models to read a moving dot: left or right. They see the
        same movies. Can you identify the one with fly connections just from its
        performance?
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="game-surface">
        <div className="game-workspace">
          <div className="game-board">
            <div className="game-caption">
              <span>Input · 24 frames / movie</span>
              <span>One dot, twelve light sensors</span>
            </div>
            <svg
              className="game-scene"
              viewBox="0 0 580 170"
              role="img"
              aria-label={`A dot moving ${direction === 1 ? 'right' : 'left'}, frame ${frame + 1} of 24`}
            >
              <line x1="40" x2="540" y1="80" y2="80" stroke="var(--border)" />
              {m.positions.slice(0, frame + 1).map((x, i) => (
                <circle
                  key={i}
                  cx={40 + 500 * x}
                  cy="65"
                  r={i === frame ? 13 : 3}
                  fill="var(--primary)"
                  opacity={i === frame ? 1 : 0.18}
                />
              ))}
              {m.pixels[frame].map((v, i) => (
                <rect
                  key={i}
                  x={40 + i * 42}
                  y="116"
                  width="33"
                  height="24"
                  fill="var(--primary)"
                  opacity={0.08 + 0.92 * v}
                />
              ))}
              <text x="40" y="160" fontSize="12" fill="currentColor">
                Dark sensor = brighter input. This is the model’s entire view.
              </text>
            </svg>
            <div className="game-toolbar">
              <Button
                variant="outline"
                onClick={() => {
                  setDirection(-1);
                  clock.setTime(0);
                  clock.setPlaying(true);
                }}
              >
                ← Send leftward dot
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDirection(1);
                  clock.setTime(0);
                  clock.setPlaying(true);
                }}
              >
                Send rightward dot →
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setClip(clip + 1);
                  clock.setTime(0);
                }}
              >
                New example
              </Button>
            </div>
            <div className="game-toolbar">
              <Button disabled={!data || busy} onClick={train}>
                {busy
                  ? 'Training…'
                  : decoders
                    ? 'Train again'
                    : 'Train all three models'}
              </Button>
              <span className="game-small">
                96 training movies · 48 separate test movies
              </span>
            </div>
            <div className="game-models">
              {order.map((mi, i) => (
                <Button
                  key={i}
                  variant="outline"
                  aria-pressed={selected === i}
                  onClick={() => {
                    setSelected(i);
                    setCell(0);
                    clearIntervention();
                  }}
                >
                  <strong>Model {'ABC'[i]}</strong>
                  <span>
                    {decoders
                      ? `${scores[mi]} / 48 correct`
                      : 'Not trained yet'}
                  </span>
                  <span>{revealed ? labels[mi] : 'Identity hidden'}</span>
                </Button>
              ))}
            </div>
            {decoders && !revealed && (
              <>
                <p className="game-small">
                  Which model has the anatomical connections? Commit a guess
                  before opening the box.
                </p>
                <div className="game-toolbar">
                  {order.map((_, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      onClick={() => {
                        setGuess(i);
                        setRevealed(true);
                      }}
                    >
                      Guess {'ABC'[i]}
                    </Button>
                  ))}
                  <Button variant="ghost" onClick={() => setRevealed(true)}>
                    Reveal without guessing
                  </Button>
                </div>
              </>
            )}
            {revealed && (
              <p className="game-small" role="status">
                {guess !== null ? `You chose ${'ABC'[guess]}. ` : ''}Model{' '}
                {'ABC'[order.indexOf(0)]} uses fly anatomy. These scores measure
                this task, seed and training setup.{' '}
                {scores.every((s) => s === scores[0])
                  ? 'All three tied, including the model without recurrent cells. This result cannot identify a special advantage of the anatomical wiring.'
                  : 'A difference on this task alone does not establish biological fidelity.'}
              </p>
            )}
          </div>
          <aside className="game-inspector">
            <h2>Inside model {'ABC'[selected]}</h2>
            {!revealed ? (
              <p>
                Make a prediction, then reveal the wiring to inspect its units.
                The performance table is deliberately blind.
              </p>
            ) : modelIndex === 2 ? (
              <>
                <h3>A classifier with no recurrent cells</h3>
                <p className="game-small">
                  It receives average sensor brightness in four successive time
                  windows. Those windows retain motion order. The learned
                  decoder can use that information directly.
                </p>
                <div className="wiring-flow">
                  <span>Movie</span>→<span>4 time windows</span>→
                  <span>Trained output</span>
                </div>
              </>
            ) : (
              <>
                <svg
                  className="game-network"
                  viewBox="0 0 360 250"
                  role="img"
                  aria-label="Select a model unit to inspect its continuous activation"
                >
                  {model.matrix.map((row, i) =>
                    row.map(
                      (w, j) =>
                        Math.abs(w) > 0.025 && (
                          <line
                            key={`${i}-${j}`}
                            x1={30 + (j % 8) * 42}
                            y1={30 + Math.floor(j / 8) * 58}
                            x2={30 + (i % 8) * 42}
                            y2={30 + Math.floor(i / 8) * 58}
                            stroke={
                              w > 0 ? 'var(--primary)' : 'var(--ink-violet)'
                            }
                            opacity=".15"
                          />
                        ),
                    ),
                  )}
                  {run?.states[frame].map((v, i) => (
                    <g
                      key={i}
                      role="button"
                      tabIndex={0}
                      aria-label={`Select unit ${i + 1}`}
                      onClick={() => setCell(i)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setCell(i);
                        }
                      }}
                    >
                      <circle
                        cx={30 + (i % 8) * 42}
                        cy={30 + Math.floor(i / 8) * 58}
                        r={cell === i ? 15 : 12}
                        fill={v >= 0 ? 'var(--primary)' : 'var(--ink-violet)'}
                        fillOpacity={
                          muted.includes(i) ? 0.04 : 0.12 + Math.abs(v) * 0.88
                        }
                        stroke={
                          cell === i ? 'var(--foreground)' : 'var(--border)'
                        }
                      />
                      <text
                        x={30 + (i % 8) * 42}
                        y={34 + Math.floor(i / 8) * 58}
                        textAnchor="middle"
                      >
                        {i + 1}
                      </text>
                    </g>
                  ))}
                </svg>
                <p className="game-small">
                  Unit {cell + 1}
                  {modelIndex === 0 && data
                    ? ` · ${data.nodes[cell].type}, body ${data.nodes[cell].id}`
                    : ''}
                  .{' '}
                  <Explain
                    title="Continuous activation, not spikes"
                    text="Each unit holds a number between −1 and +1. Green means positive, purple negative; stronger color means a larger magnitude. This leaky tanh model has no action potentials. Its value is not voltage or a biological firing rate."
                  >
                    Activation
                  </Explain>
                  : {run?.states[frame][cell].toFixed(3)} a.u.
                </p>
                <MiniTrace
                  values={run?.states.map((s) => s[cell]) ?? [0, 0]}
                  cursor={clock.time}
                  min={-1}
                  max={1}
                  unit="activation (a.u.)"
                />
                <div className="wiring-flow">
                  <span>Movie → fixed projection</span>→
                  <span>32 recurrent units</span>→<span>Trained decoder</span>
                </div>
              </>
            )}
            {revealed && (
              <p className="game-small">
                <strong>
                  {clock.time < 600
                    ? 'Output appears after the whole movie.'
                    : output === null
                      ? 'Train to get an output.'
                      : `Output: ${output >= 0 ? 'right →' : '← left'} · linear score ${output.toFixed(2)}`}
                </strong>
                <br />A score’s sign chooses a direction. Its magnitude is not a
                calibrated probability.
              </p>
            )}
          </aside>
        </div>
        <GameClock clock={clock} label="input movie" />
      </div>
      <h2>Where does the useful information enter?</h2>
      <p>
        The{' '}
        <Explain
          title="Readout / decoder"
          text="A trained weighted sum turns input features and model states into an answer. Training changes these output weights. It does not change the connections among the recurrent units."
        >
          decoder
        </Explain>{' '}
        is the part that learns. Both recurrent models can also receive the
        movie features directly, like a cable going around the network.
      </p>
      <div className="game-toolbar">
        <Button
          variant="outline"
          aria-pressed={bypass}
          disabled={busy}
          onClick={() => {
            setBypass(!bypass);
            setDecoders(null);
            setScores([]);
            clearIntervention();
          }}
        >
          Direct movie cable: {bypass ? 'connected' : 'cut'}
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            setSeed(seed + 1);
            setDecoders(null);
            setScores([]);
            setRevealed(false);
            setGuess(null);
            clearIntervention();
          }}
        >
          New wiring / input seed ({seed})
        </Button>
      </div>
      <p className="game-small">
        Changing the cable or seed requires fresh training. The movie-only
        baseline always receives its input. This toy task is deliberately easy
        enough for a direct decoder; it tests what the animation alone can
        establish.
      </p>
      {revealed && decoders && modelIndex !== 2 && (
        <section className="game-surface game-board">
          <h2>Break this implementation. Then let it adapt.</h2>
          <div className="game-toolbar">
            <Button
              variant="outline"
              disabled={busy || muted.length > 0}
              onClick={() => silence()}
            >
              Silence 4 influential units
            </Button>
            <Button
              variant="outline"
              disabled={busy || muted.length === model.matrix.length}
              onClick={() => silence(true)}
            >
              Silence all recurrent units
            </Button>
            <Button
              variant="outline"
              disabled={busy || muted.length === 0}
              onClick={retrain}
            >
              Retrain the decoder
            </Button>
            <Button variant="ghost" onClick={clearIntervention}>
              Restore
            </Button>
          </div>
          <p role="status">
            {intervention ||
              'First test removal while keeping the learned decoder fixed.'}
            {afterScore !== null && (
              <strong>
                {' '}
                Test: {afterScore}/48; original: {scores[modelIndex]}/48.
              </strong>
            )}
          </p>
          <p className="game-small">
            Importance here means readout-weight magnitude, not an identified
            biological function. Recovery after retraining answers a different
            question from removal after training.
          </p>
        </section>
      )}
      <details className="game-details">
        <summary>
          What is anatomical, what is learned, and how is the test run?
        </summary>
        <p>
          {data?.selection}. We retain recorded directed contacts, take log(1 +
          count), and assume acetylcholine is positive and other listed
          transmitters negative. Receptor-dependent signs and synaptic efficacy
          are not measured here. Scrambling shuffles all matrix entries,
          retaining the weight distribution but not degrees or transmitter
          consistency.
        </p>
        <p>
          Both matrices share a scale giving maximum absolute row sum ≤ 0.85.
          Units use x′ = 0.65x + 0.35 tanh(Wx + Pu); P is the same fixed random
          input projection for both. Four temporal averages become decoder
          features. Ridge regression uses standardized training features and
          penalty 4; only the decoder is fitted. Test movies use independent
          seeds and vary start, distance, contrast and noise.
        </p>
        <p>
          Results are calculated in your browser. Repeated inspection makes this
          an exploratory benchmark, not a confirmatory biological test. The
          source is{' '}
          <a href={data?.source ?? 'https://neuprint.janelia.org/'}>
            MaleCNS anatomy
          </a>
          . The comparison is inspired by the controls in{' '}
          <a href="https://oruk.ai/research/we-taught-a-fruit-fly-to-read-human-emotion">
            Oruk’s audio reservoir
          </a>
          ; it does not reproduce their private benchmark.
        </p>
      </details>
      <ResearchMedia game="wiring" />
    </main>
  );
}
