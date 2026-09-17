'use client';
import { useMemo, useReducer, useState } from 'react';
import { Button } from '@/components/ui/button';
import { gardenRun } from '@/lib/games';
import {
  gardenEditor,
  gardenHasFeedback,
  initialGarden,
} from '@/lib/garden-editor';
import { gameSampleIndex } from '@/lib/game-playback';
import GardenNetwork from './garden-network';
import ResearchMedia from './research-media';
import {
  Explain,
  GameClock,
  GameNav,
  MiniTrace,
  Range,
  useGameClock,
} from './shared';
import CultureChallenge from './culture-challenge';
const names = 'ABCDEFGHIJKL';
export default function Garden() {
  const [editor, dispatch] = useReducer(gardenEditor, initialGarden);
  const { cells, edges, selected, connecting, pulseCell } = editor;
  const [editNotice, setEditNotice] = useState('');
  const [drive, setDrive] = useState(400),
    [coupling, setCoupling] = useState(850),
    [recovery, setRecovery] = useState(true),
    [block, setBlock] = useState(false),
    [paired, setPaired] = useState(false);
  const clock = useGameClock(600, 0.12);
  const run = useMemo(
    () =>
      gardenRun(cells, edges, {
        drive,
        coupling,
        recovery,
        block,
        pulseCell: pulseCell ?? -1,
        paired,
      }),
    [cells, edges, drive, coupling, recovery, block, pulseCell, paired],
  );
  const index = cells.findIndex((c) => c.id === selected);
  const t = gameSampleIndex(clock.time, run.duration + 1, run.duration);
  const changed = () => {
    clock.setPlaying(false);
    clock.setTime(0);
    setEditNotice('');
  };
  const add = (kind: 'exc' | 'inh') => {
    changed();
    dispatch({ type: 'add', kind });
  };
  const select = (id: number) => {
    if (connecting !== null && connecting !== id) changed();
    dispatch({ type: 'select', id });
  };
  const remove = () => {
    if (selected === null) return;
    changed();
    dispatch({ type: 'delete', id: selected });
    setEditNotice(
      `Cell ${names[selected]} and its connections removed. Remaining cells keep their letters.`,
    );
  };
  const reached = run.spikes.filter((s) => s.some((v) => v <= t)).length;
  return (
    <main className="games-page">
      <GameNav active="garden" />
      <h1>Build a circuit. Send it a pulse.</h1>
      <p>
        Start with one cell. Add a neighbor, then follow the signal. Underlined
        words open little explanations—hover, tap, or use your keyboard.
      </p>
      <div className="game-steps">
        <span className={reached ? 'done' : ''}>1 · Make a cell fire</span>
        <span className={reached > 1 ? 'done' : ''}>
          2 · Pass the signal on
        </span>
        <span className={gardenHasFeedback(edges) ? 'done' : ''}>
          3 · Add feedback
        </span>
        <span className={cells.some((c) => c.kind === 'inh') ? 'done' : ''}>
          4 · Try an inhibitory cell
        </span>
      </div>
      <div className="game-surface">
        <div className="game-workspace">
          <div className="game-board">
            <div className="game-caption">
              <span>
                {cells.length} model {cells.length === 1 ? 'neuron' : 'neurons'}{' '}
                · {edges.length} connections
              </span>
              <span>Click a cell to inspect it</span>
            </div>
            <GardenNetwork
              cells={cells}
              edges={edges}
              run={run}
              time={clock.time}
              selected={selected}
              pulseCell={pulseCell}
              connecting={connecting}
              block={block}
              onSelect={select}
            />
            <p className="game-small garden-anatomy-key">
              <Explain
                title="Dendrites · receiving branches"
                text="Many neurons receive input along branching dendrites. Here the little branches show the receiving side of a cell; they are a schematic, not a reconstruction. This model combines all inputs into one voltage, so it does not calculate voltages separately along the branches."
              >
                Branches receive
              </Explain>
              {' · '}
              <Explain
                title="Cell body · the soma"
                text="The cell body contains the nucleus. Its color here follows the model’s voltage: more saturated as voltage rises, with a flash when the model emits a spike. Real neurons initiate spikes in a specialized region, whose location depends on the cell; this drawing does not model that region separately."
              >
                Cell body brightens
              </Explain>
              {' · '}
              <Explain
                title="Axons and synapses · sending to the next cell"
                text="A dot follows the curved axon after a computed spike. It reaches the synapse 2 modeled milliseconds later, when the simulator adds current to the receiving cell. A + terminal adds current; a − terminal subtracts it. Arrival rings and cell flashes linger for 8 ms for visibility, not to represent spike duration."
              >
                Axon carries a spike
              </Explain>
            </p>
            <p className="game-small">
              Schematic anatomy; still one LIF voltage per cell. Branch shape
              and distance do not change the calculation.
            </p>
            <div className="game-toolbar">
              <Button
                variant="outline"
                disabled={cells.length >= 12}
                onClick={() => add('exc')}
              >
                + Add excitatory cell
              </Button>
              <Button
                variant="outline"
                disabled={cells.length >= 12}
                onClick={() => add('inh')}
              >
                + Add inhibitory cell
              </Button>
              <Button
                variant="outline"
                aria-pressed={connecting !== null}
                disabled={selected === null || cells.length < 2}
                onClick={() => dispatch({ type: 'connect' })}
              >
                {connecting === null
                  ? selected === null
                    ? 'Connect cells'
                    : `Connect from ${names[selected]}`
                  : 'Cancel connection'}
              </Button>
              <Button
                variant="outline"
                disabled={selected === null}
                onClick={remove}
              >
                {selected === null
                  ? 'Delete cell'
                  : `Delete ${names[selected]}`}
              </Button>
            </div>
            <output className="game-small garden-edit-notice">
              {editNotice}
            </output>
            <p className="game-small">
              New cells receive a connection from the selected cell. To make a
              loop, select the last cell, choose “Connect from”, then select the
              first.
            </p>
          </div>
          <aside className="game-inspector">
            {index >= 0 && selected !== null ? (
              <>
                <h2>Inside cell {names[selected]}</h2>
                <p className="game-small">
                  The membrane stores electrical charge. Input raises its{' '}
                  <Explain
                    title="Membrane voltage"
                    text="Voltage is the electrical potential inside a cell relative to outside. Here it starts at −65 millivolts. The cell’s shading and this trace follow the same computed voltage."
                  >
                    voltage
                  </Explain>
                  ;{' '}
                  <Explain
                    title="Leak"
                    text="When input stops, charge does not stay forever. The model drifts toward its resting voltage. A 20 ms time constant describes how quickly the difference decays."
                  >
                    leak
                  </Explain>{' '}
                  draws it back toward rest.
                </p>
                <MiniTrace
                  values={run.voltage[index]}
                  cursor={clock.time}
                  min={Math.min(
                    -75,
                    Math.floor(Math.min(...run.voltage[index]) / 10) * 10,
                  )}
                  threshold={-50}
                />
                <p className="game-small">
                  <strong>
                    {run.spikes[index].includes(t)
                      ? 'Spike event → reset to −65 mV'
                      : `${run.voltage[index][t].toFixed(1)} mV`}
                  </strong>{' '}
                  · {run.spikes[index].filter((v) => v <= t).length} events so
                  far. In{' '}
                  <Explain
                    title="Leaky integrate-and-fire (LIF)"
                    text="This model adds incoming currents, leaks toward rest, and emits an event when voltage reaches a threshold. It then resets. The tall spike drawn here is a marker, not a computed biological spike shape."
                    source="https://neuronaldynamics.epfl.ch/online/Ch1.S3.html"
                  >
                    LIF
                  </Explain>
                  , crossing −50 mV triggers a spike and reset.
                </p>
                <h3>What is changing the voltage now?</h3>
                <p className="game-small">
                  Direct pulse:{' '}
                  <strong>{run.input[index][t].toFixed(0)} pA</strong>
                  <br />
                  From neighbors:{' '}
                  <strong>{run.synaptic[index][t].toFixed(0)} pA</strong>
                  <br />
                  Leak: pulls toward −65 mV.
                </p>
                <p className="game-small">
                  <Explain
                    title="Electrical current, in picoamps"
                    text="Current is moving electric charge. A picoamp (pA) is one trillionth of an amp. The pulse is charge supplied directly by this experiment; synaptic current comes from other cells. The same current changes voltage more in a cell with higher electrical resistance."
                  >
                    pA measures electrical current
                  </Explain>
                  , the input that changes voltage.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    dispatch({ type: 'pulse', id: selected });
                    setEditNotice('');
                    clock.setTime(0);
                    clock.setPlaying(true);
                  }}
                >
                  Send pulse to {names[selected]}
                </Button>
              </>
            ) : (
              <div className="garden-empty-inspector">
                <h2>No neuron selected</h2>
                <p className="game-small">
                  Add a cell to see its voltage trace and send it a pulse.
                </p>
              </div>
            )}
            <Range
              label="Pulse strength"
              value={drive}
              min={0}
              max={700}
              unit=" pA"
              onChange={(v) => {
                changed();
                setDrive(v);
              }}
            />
            <Range
              label="Current per connection"
              value={coupling}
              min={0}
              max={1500}
              step={25}
              unit=" pA"
              onChange={(v) => {
                changed();
                setCoupling(v);
              }}
            />
          </aside>
        </div>
        <GameClock clock={clock} />
        <output className="game-status garden-playback-status">
          {!cells.length
            ? 'Add a neuron to begin.'
            : t < 40
              ? `The pulse into ${names[pulseCell!]} starts at 40 ms. Press play or send a pulse to the selected cell.`
              : t < 75 || (paired && t >= 170 && t < 205)
                ? `Pulse is on in ${names[pulseCell!]}. ${reached} of ${cells.length} cells have fired.`
                : paired && t < 170
                  ? `First pulse is off; the second starts at 170 ms. ${reached} of ${cells.length} cells have fired.`
                  : `Pulse is off. ${reached} of ${cells.length} cells have fired. Any later response comes from the circuit and its remaining currents.`}
        </output>
      </div>
      <h2>Keep the connections. Change how they work.</h2>
      <p>
        An{' '}
        <Explain
          title="Inhibitory output"
          text="A spike is an event in either type of cell. In this model, an inhibitory cell sends a negative current to its targets, tending to lower their voltage. The effect comes from the connection, not a negative spike."
        >
          inhibitory cell
        </Explain>{' '}
        can make its targets less likely to fire. A{' '}
        <Explain
          title="Short-term synaptic depression"
          text="Here each spike uses 35% of a cell’s available transmission resource. It recovers with a 160 ms time constant. This is a simplified model of synapses temporarily weakening after activity—not permanent learning."
        >
          recovering synapse
        </Explain>{' '}
        becomes temporarily weaker after repeated use.
      </p>
      <div className="game-toolbar">
        <Button
          variant="outline"
          aria-pressed={recovery}
          onClick={() => {
            changed();
            setRecovery(!recovery);
          }}
        >
          Temporary synapse weakening: {recovery ? 'on' : 'off'}
        </Button>
        <Button
          variant="outline"
          aria-pressed={block}
          onClick={() => {
            changed();
            setBlock(!block);
          }}
        >
          Inhibitory output: {block ? 'blocked' : 'working'}
        </Button>
        <Button
          variant="outline"
          aria-pressed={paired}
          onClick={() => {
            changed();
            setPaired(!paired);
          }}
        >
          Pulse: {paired ? 'paired' : 'single'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            changed();
            dispatch({ type: 'clear' });
            setBlock(false);
          }}
        >
          Clear circuit
        </Button>
      </div>
      <details className="game-details">
        <summary>Equations, parameters, and what these events mean</summary>
        <p>
          τ dV/dt = Vrest − V + R(Ipulse + Isyn). At threshold: emit an event,
          reset, and wait through the refractory period. Events arrive at
          connected cells 2 ms later; their current decays exponentially.
        </p>
        <dl>
          <dt>Rest / reset / threshold</dt>
          <dd>−65 / −65 / −50 mV</dd>
          <dt>Membrane τ / resistance</dt>
          <dd>20 ms / 100 MΩ</dd>
          <dt>Synapse τ / delay</dt>
          <dd>8 ms / 2 ms</dd>
          <dt>Refractory / integration step</dt>
          <dd>3 ms / 1 ms</dd>
          <dt>Pulse intervals</dt>
          <dd>40–75; optionally 170–205 ms</dd>
        </dl>
        <p>
          These are teaching parameters. Connections are the ones you build;
          these cells are not identified neurons from a fly or a culture.
        </p>
      </details>
      <ResearchMedia game="garden" />
      <CultureChallenge />
    </main>
  );
}
