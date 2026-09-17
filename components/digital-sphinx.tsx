'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Explain } from '@/components/games/shared';
const paper = 'https://elifesciences.org/reviewed-preprints/111516';
const movie =
  'https://prod--epp.elifesciences.org/api/files/111516/v1/content/supplements/713233_file02.mp4';
const parts = [
  {
    title: 'Watch the walking',
    text: 'Start with the movement in the paper’s video. The virtual legs coordinate convincingly. How much does that tell you about the nervous system producing it?',
  },
  {
    title: 'Inspect the neural activity',
    text: 'The movie also plots activity from the model. These are continuous activations, not spikes recorded from an animal. Rhythms can appear because a stepping body feeds rhythmic sensor signals back into the network.',
  },
  {
    title: 'Reveal the connectome',
    text: 'The network is based on the 302-neuron C. elegans worm connectome. A random projection sends fly-body feedback into worm sensory units. Cell names preserve anatomical labels, but do not establish the cells’ biological functions in this model.',
  },
  {
    title: 'Find what learned',
    text: 'A separate motor decoder was trained with reinforcement learning to turn worm motor-unit activity into fly leg torques. The worm network itself stayed fixed. The trained interface makes the mismatched system work.',
  },
  {
    title: 'Choose the next experiment',
    text: 'A useful next test separates damage to one trained implementation from whether different wiring could support a newly trained decoder. Try both in the wiring game, then inspect what biological measurements would constrain the interface.',
  },
];
export default function DigitalSphinx() {
  const [step, setStep] = useState(0),
    [failed, setFailed] = useState(false),
    [playing, setPlaying] = useState(false),
    video = useRef<HTMLVideoElement>(null),
    [part, setPart] = useState('decoder');
  return (
    <section className="sphinx-opening" id="sphinx">
      <h2>This fly walks. What makes it walk?</h2>
      <div className="sphinx-grid">
        <div className="sphinx-film">
          {!failed ? (
            <video
              ref={video}
              src={movie}
              controls
              muted
              playsInline
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onError={() => setFailed(true)}
              aria-label="Original Digital Sphinx paper video showing simulated fly walking and worm-model activity"
            />
          ) : (
            <div className="sphinx-video-fallback">
              <p>The publisher’s video could not load here.</p>
              <a href={`${paper}#video1`} target="_blank" rel="noreferrer">
                Watch Video 1 on eLife ↗
              </a>
            </div>
          )}
          <p className="embodied-caption">
            Original paper video · simulation, not a living fly. It includes
            both the movement and model activity.
          </p>
          <div className="embodied-controls">
            <Button
              variant="outline"
              disabled={failed}
              onClick={() => {
                if (!video.current) return;
                if (playing) video.current.pause();
                else void video.current.play().catch(() => setFailed(true));
              }}
            >
              {playing ? 'Pause video' : 'Play paper video'}
            </Button>
            <a href={paper} target="_blank" rel="noreferrer">
              Brunton et al., Digital Sphinx ↗
            </a>
          </div>
        </div>
        <div className="sphinx-inspector">
          <div className="sphinx-steps" aria-label="Open the simulation">
            {parts.map((p, i) => (
              <Button
                key={p.title}
                variant="outline"
                aria-pressed={step === i}
                onClick={() => setStep(i)}
              >
                {i + 1}. {p.title}
              </Button>
            ))}
          </div>
          <h3>{parts[step].title}</h3>
          <p>{parts[step].text}</p>
          {step >= 2 && (
            <div
              className="sphinx-loop"
              aria-label="Inspect the brain-body interface"
            >
              {[
                ['sensors', 'Body sensors'],
                ['projection', 'Random input map'],
                ['worm', 'Worm network · fixed'],
                ['decoder', 'Motor decoder · trained'],
                ['body', 'Fly leg actuators'],
              ].map(([id, name]) => (
                <Button
                  key={id}
                  variant="outline"
                  aria-pressed={part === id}
                  onClick={() => setPart(id)}
                >
                  {name} →
                </Button>
              ))}
              <span>movement feeds back to the sensors</span>
            </div>
          )}
          {step >= 2 && (
            <p className="embodied-caption">
              {part === 'sensors'
                ? 'Joint and body measurements are generated by the simulated body.'
                : part === 'projection'
                  ? 'This input mapping is random, not a reconstructed fly sensory pathway.'
                  : part === 'worm'
                    ? 'Fixed, graded units use connectome-based weights. No neuron here learns during policy training.'
                    : part === 'decoder'
                      ? 'The flexible learned interface maps activity to 42 leg-actuator torque commands. It is not a measured motor-neuron-to-muscle map.'
                      : 'MuJoCo computes physical movement. Actuator commands are not a detailed neuromuscular-junction simulation.'}
            </p>
          )}
          {step === 4 && (
            <Link className="sphinx-next" href="/games/wiring">
              Run the wiring challenge ↗
            </Link>
          )}
        </div>
      </div>
      <details>
        <summary>What this demonstration establishes</summary>
        <p>
          A convincing movement can coexist with an implausible neural-to-body
          mapping. This is a counterexample to inferring biological fidelity
          from behavior alone. The paper’s worm model is a computed system; it
          does not establish biological worm activity during fly walking.
        </p>
        <p>
          The paper argues that a random recurrent network could play a similar
          role; a worm-versus-random equivalence is not a measured control
          reported in this version. The authors’{' '}
          <a href="https://github.com/Brunton-Lab/DigitalSphinx2026">
            code and checkpoint instructions
          </a>{' '}
          are public. This page embeds their video; it does not run their
          trained MuJoCo policy live.
        </p>
        <p>
          Next, inspect a more constrained visual model and the{' '}
          <Explain
            title="Biological interfaces"
            text="A full sensorimotor explanation needs to specify which sensors supply which cells, how neurons recruit particular muscles, and how those muscles move joints. A learned mapping can produce useful control without identifying these biological links."
            source={paper}
          >
            interfaces between neurons, muscles and joints
          </Explain>{' '}
          below.
        </p>
      </details>
    </section>
  );
}
