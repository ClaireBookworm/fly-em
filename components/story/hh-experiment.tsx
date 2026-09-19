'use client';
import { LessonCopy } from './lesson-copy';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { labDefaults, simulateLab } from '@/lib/neuron-lab';
import { MembranePatch } from './neuron-graphics';
import { EquationNumber, SignalPlot } from './membrane-experiments';
import { StoryPlayback, usePlayback } from './shared';

export function HHExperiment() {
  const [current, setCurrent] = useState(8),
    [sodium, setSodium] = useState(120);
  const parameters = useMemo(
    () => ({ ...labDefaults, current, sodium, stimulus: 'pulse' as const }),
    [current, sodium],
  );
  const result = useMemo(() => simulateLab(parameters, 'hh'), [parameters]);
  const reference = useMemo(
    () => simulateLab({ ...labDefaults, current, stimulus: 'pulse' }, 'hh'),
    [current],
  );
  const lif = useMemo(() => simulateLab(parameters, 'lif'), [parameters]);
  const clock = usePlayback(240, 1, 76),
    i = clock.cursor;
  const cut = 241,
    time = result.time.slice(0, cut);
  const peak = reference.voltage[0]
    .slice(80, 145)
    .reduce(
      (best, v, offset) =>
        v > reference.voltage[0][best] ? offset + 80 : best,
      80,
    );
  const trough = reference.voltage[0]
    .slice(peak, peak + 70)
    .reduce(
      (best, v, offset) =>
        v < reference.voltage[0][best] ? offset + peak : best,
      peak,
    );
  const phases = [
    {
      name: '1 · Rest',
      index: 76,
      text: 'Before the input, inward and outward currents nearly balance. The membrane voltage is near −65 mV.',
    },
    {
      name: '2 · Rise',
      index: Math.max(81, peak - 2),
      text: 'Sodium activation rises quickly. Inward sodium current raises voltage, which activates more sodium conductance: positive feedback.',
    },
    {
      name: '3 · Fall',
      index: Math.min(peak + 5, 240),
      text: 'Sodium inactivation reduces its availability while potassium activation has increased. The changing current balance brings voltage down.',
    },
    {
      name: '4 · Recover',
      index: Math.min(trough, 240),
      text: 'Potassium conductance remains elevated after the spike, pulling voltage below rest. Gates then relax toward their resting states.',
    },
  ];
  const phase = i <= 80 ? 0 : i < peak ? 1 : i < peak + 7 ? 2 : 3;
  const update = (key: 'current' | 'sodium', value: number) => {
    if (key === 'current') setCurrent(value);
    else setSodium(value);
    clock.setPlaying(false);
  };
  return (
    <div className="em-experiment em-hh-guide">
      <div className="em-experiment-heading">
        <LessonCopy
          as="span"
          copyId="hh-experiment-label-1"
          className="essay-kicker"
        >
          Experiment 02 · where the spike comes from
        </LessonCopy>
        <Button
          variant="outline"
          onClick={() => update('sodium', sodium === 0 ? 120 : 0)}
        >
          {sodium === 0 ? 'Restore sodium channels' : 'Block sodium channels'}
        </Button>
      </div>
      <div className="em-channel-equation">
        <span>C dV/dt = Iinput − Ileak − </span>
        <span className="em-na">ḡNa m³h (V − ENa)</span>
        <span> − </span>
        <span className="em-k">ḡK n⁴ (V − EK)</span>
      </div>
      <LessonCopy copyId="channels-explanation-1">
        Instead of inserting a spike at a threshold, HH updates voltage and
        three channel gates. The waveform emerges from their interaction.{' '}
        <strong>
          Choose a moment in the spike to see the current balance change.
        </strong>
      </LessonCopy>
      <div
        className="em-phase-buttons"
        aria-label="Moments in an action potential"
      >
        {phases.map((p, j) => (
          <Button
            key={p.name}
            variant="outline"
            aria-pressed={phase === j}
            onClick={() => {
              clock.setPlaying(false);
              clock.setCursor(p.index);
            }}
          >
            {p.name}
          </Button>
        ))}
      </div>
      <p className="em-phase-copy" aria-live="polite">
        {sodium === 0
          ? 'Sodium is blocked. The fast inward current is gone, so this pulse no longer generates the classic HH action potential. The phase buttons retain the timing of the unblocked reference.'
          : result.spikes[0].length === 0
            ? 'At this input, the HH model does not generate a spike. Increase the input or reset to 8 µA/cm² to follow the four phases.'
            : phases[phase].text}
      </p>
      <div className="em-hh-linked">
        <div>
          <MembranePatch result={result} cursor={i} parameters={parameters} />
          <div className="em-gate-readout">
            <span>
              m · Na activation <b>{result.gates[0][i].toFixed(2)}</b>
            </span>
            <span>
              h · Na availability <b>{result.gates[1][i].toFixed(2)}</b>
            </span>
            <span>
              n · K activation <b>{result.gates[2][i].toFixed(2)}</b>
            </span>
          </div>
        </div>
        <div>
          <SignalPlot
            title="HH · waveform from channel dynamics"
            time={time}
            domain={[-85, 55]}
            lines={[
              {
                values: result.voltage[0].slice(0, cut),
                color: 'var(--em-cool)',
                label: 'HH voltage',
              },
            ]}
            cursor={result.time[i]}
          />
          <SignalPlot
            title="Same injected pulse · LIF declares events"
            time={time}
            domain={[-70, -40]}
            lines={[
              {
                values: lif.voltage[0].slice(0, cut),
                color: 'var(--story-green)',
                label: 'LIF voltage',
              },
            ]}
            events={lif.spikes[0].filter((t) => t <= 60)}
            cursor={result.time[i]}
            threshold={-50}
            height={145}
          />
        </div>
      </div>
      <StoryPlayback
        cursor={i}
        max={240}
        onCursor={clock.setCursor}
        playing={clock.playing}
        onPlaying={clock.setPlaying}
        timeScale={0.25}
      />
      <div className="em-hh-controls">
        <EquationNumber
          label="HH comparison input"
          symbol="Iinput"
          value={current}
          min={0}
          max={20}
          step={0.25}
          unit="µA/cm²"
          onChange={(v) => update('current', v)}
        />
        <EquationNumber
          label="Maximum sodium conductance"
          symbol="ḡNa"
          value={sodium}
          min={0}
          max={160}
          step={1}
          unit="mS/cm²"
          onChange={(v) => update('sodium', v)}
        />
        <Button
          variant="outline"
          onClick={() => {
            setCurrent(8);
            setSodium(120);
            clock.setCursor(76);
            clock.setPlaying(false);
          }}
        >
          Reset channels
        </Button>
      </div>
      <LessonCopy copyId="channels-explanation-3" className="essay-fine">
        Both teaching cells receive a 5 ms pulse starting at 20 ms. Axes differ
        so LIF’s subthreshold voltage stays readable. Sodium changes only HH;
        LIF contains no sodium channels. Gate values lie between 0 and 1;
        effective Na conductance is ḡNa m³h and K conductance is ḡK n⁴.
      </LessonCopy>
      <details className="essay-method-note">
        <summary>Channel equations, units and limits</summary>
        <LessonCopy copyId="channels-explanation-4">
          Each gate x follows dx/dt = αx(V)(1 − x) − βx(V)x. HH uses C = 1
          µF/cm²; ḡNa = {sodium}, ḡK = 36, gL = 0.3 mS/cm²; ENa = +50, EK = −77,
          EL = −54.4 mV. These are classic squid-axon parameters and 6.3°C gate
          kinetics, not a fit to the mouse recording or a fly neuron.
        </LessonCopy>
        <LessonCopy copyId="channels-explanation-5">
          Both integrate at 0.025 ms; plots sample at 0.25 ms. LIF uses τ = 20
          ms, rest/reset −65 mV, threshold −50 mV and a 2 ms refractory period.
          Identical injected current density does not make the membrane
          parameters physiologically equivalent.
        </LessonCopy>
        <LessonCopy copyId="channels-explanation-6">
          <a
            href="https://doi.org/10.1113/jphysiol.1952.sp004764"
            target="_blank"
            rel="noreferrer"
          >
            Hodgkin & Huxley (1952) ↗
          </a>{' '}
          · <a href="/lab">Inspect all gate equations ↗</a>
        </LessonCopy>
      </details>
    </div>
  );
}
