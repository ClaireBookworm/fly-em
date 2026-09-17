'use client';
/* Parametric stimulus diagram: landmarks are the four numerical model features. */
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { faceAxes, faceNullMove, faceRates } from '@/lib/games';
import { Explain, GameNav, Range } from './shared';
import ResearchMedia from './research-media';
const featureNames = [
  'Eye spacing',
  'Face width',
  'Nose length',
  'Mouth width',
];
function FaceStimulus({
  features,
  label,
}: {
  features: number[];
  label: string;
}) {
  const [eyes, width, nose, mouth] = features,
    ex = 37 + eyes * 12,
    rx = 88 + width * 16,
    ny = 175 + nose * 14,
    mw = 32 + mouth * 12;
  return (
    <svg
      className="game-face"
      viewBox="0 0 320 330"
      role="img"
      aria-label={`${label}: eye spacing ${eyes.toFixed(2)}, face width ${width.toFixed(2)}, nose length ${nose.toFixed(2)}, mouth width ${mouth.toFixed(2)}`}
    >
      <defs>
        <radialGradient id={`face-shade-${label.replaceAll(' ', '-')}`}>
          <stop offset="0" stopColor="var(--card)" />
          <stop offset="1" stopColor="var(--secondary)" />
        </radialGradient>
      </defs>
      <ellipse
        cx="160"
        cy="156"
        rx={rx}
        ry="120"
        fill={`url(#face-shade-${label.replaceAll(' ', '-')})`}
        stroke="var(--foreground)"
        strokeWidth="1.5"
      />
      {[-1, 1].map((side) => (
        <g key={side}>
          <path
            d={`M${160 + side * ex - 17} 116 Q${160 + side * ex} 109 ${160 + side * ex + 17} 116`}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth="3"
          />
          <ellipse
            cx={160 + side * ex}
            cy="134"
            rx="15"
            ry="8"
            fill="var(--card)"
            stroke="var(--foreground)"
          />
          <circle
            cx={160 + side * ex}
            cy="134"
            r="6"
            fill="var(--foreground)"
          />
        </g>
      ))}
      <path
        d={`M159 142 L150 ${ny} Q160 ${ny + 7} 171 ${ny}`}
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="2"
      />
      <path
        d={`M${160 - mw} 214 Q160 220 ${160 + mw} 214 M${160 - mw + 5} 215 Q160 233 ${160 + mw - 5} 215`}
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="2"
      />
      <text
        x="160"
        y="310"
        textAnchor="middle"
        fontSize="13"
        fill="currentColor"
      >
        {label} · schematic stimulus
      </text>
    </svg>
  );
}
export default function FaceGame() {
  const [features, setFeatures] = useState([0, 0, 0, 0]),
    [watched, setWatched] = useState(1),
    [showAxes, setShowAxes] = useState(false);
  const rates = faceRates(features),
    distance = Math.hypot(...features),
    error = Math.max(...rates.slice(0, watched).map((v) => Math.abs(v - 30))),
    won = distance > 0.6 && error < 0.5;
  const move = (amount: number) => {
    const next = faceNullMove(features, watched, amount);
    if (next.every((v) => Math.abs(v) <= 1.25)) setFeatures(next);
  };
  return (
    <main className="games-page">
      <GameNav active="faces" />
      <h1>Change the face. Keep the response.</h1>
      <p>
        Make the face look different while keeping the watched cell near{' '}
        <strong>30 predicted spikes per second</strong>. A cell can be sensitive
        to one kind of change and almost blind to another.
      </p>
      <div className="game-surface">
        <div className="game-workspace">
          <div className="game-board">
            <div className="game-two">
              <FaceStimulus features={[0, 0, 0, 0]} label="Starting face" />
              <FaceStimulus features={features} label="Your face" />
            </div>
            <div className="game-caption">
              <span>Feature distance: {distance.toFixed(2)}</span>
              <span>{4 - watched} unmeasured directions in this model</span>
            </div>
            {featureNames.map((label, i) => (
              <Range
                key={label}
                label={label}
                value={features[i]}
                min={-1.25}
                max={1.25}
                step={0.01}
                onChange={(v) =>
                  setFeatures(features.map((f, j) => (j === i ? v : f)))
                }
              />
            ))}
          </div>
          <aside className="game-inspector">
            <h2>
              {watched} watched {watched === 1 ? 'cell' : 'cells'}
            </h2>
            <p className="game-small">
              Bars show{' '}
              <Explain
                title="Predicted response rate"
                text="These bars come from the displayed equation, using invented coefficients. They are rates in an illustrative encoding model, not monkey recordings, instantaneous voltage or a simulation of individual spikes."
              >
                predicted rates
              </Explain>
              . The marker is the starting face’s response.
            </p>
            {rates.map((rate, i) => (
              <div key={i} style={{ opacity: i < watched ? 1 : 0.35 }}>
                <div className="face-row">
                  <span>Cell {'ABCD'[i]}</span>
                  <div className="game-meter" style={{ position: 'relative' }}>
                    <span
                      style={{
                        width: `${Math.max(0, Math.min(100, (rate / 60) * 100))}%`,
                      }}
                    />
                    <i
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: 0,
                        bottom: 0,
                        borderLeft: '2px solid var(--foreground)',
                      }}
                    />
                  </div>
                  <output>{rate.toFixed(1)} /s</output>
                </div>
                <p className="game-small" style={{ marginTop: 0 }}>
                  {i < watched
                    ? Math.abs(rate - 30) < 0.5
                      ? 'Within target range'
                      : `${Math.abs(rate - 30).toFixed(1)} /s away from target`
                    : 'Not watched yet'}
                </p>
              </div>
            ))}
            <div className="game-toolbar">
              <Button
                variant="outline"
                disabled={watched === 4}
                onClick={() => setWatched(watched + 1)}
              >
                Watch another cell
              </Button>
              <Button
                variant="ghost"
                disabled={watched === 1}
                onClick={() => setWatched(watched - 1)}
              >
                Watch fewer
              </Button>
            </div>
            <h3>Try a direction the watched cells cannot see</h3>
            <p className="game-small">
              These buttons change several features together, keeping all
              currently watched responses unchanged.
            </p>
            <div className="game-toolbar">
              <Button
                variant="outline"
                disabled={watched === 4}
                onClick={() => move(-0.3)}
              >
                ← Move
              </Button>
              <Button
                variant="outline"
                disabled={watched === 4}
                onClick={() => move(0.3)}
              >
                Move →
              </Button>
            </div>
            {watched === 4 && (
              <p className="game-small">
                All four independent directions are now measured. This
                four-feature model has no invisible direction left. Real
                recordings remain noisy and incomplete.
              </p>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                setFeatures([0, 0, 0, 0]);
                setWatched(1);
              }}
            >
              Reset face & challenge
            </Button>
          </aside>
        </div>
        <div className="game-status" role="status">
          {won
            ? 'You changed the face while preserving the watched response. Add another cell and see what it notices.'
            : error > 0.5
              ? `The watched response moved by ${error.toFixed(1)} /s. Try compensating with another feature.`
              : 'The response is on target. Try making the face more different.'}
        </div>
      </div>
      <h2>One measurement leaves many possible faces.</h2>
      <p>
        Each cell here measures a weighted combination of features—one{' '}
        <Explain
          title="Axis in a feature space"
          text="Think of a face as a list of numbers. A cell’s axis tells you which weighted combination it measures. Changes perpendicular to that axis preserve its prediction. This is a geometric description of an encoding model; it does not specify the synapses producing the response."
          source="https://doi.org/10.1016/j.cell.2017.05.011"
        >
          direction in face space
        </Explain>
        . You can change other combinations without changing that cell’s
        response.
      </p>
      <div className="game-toolbar">
        <Button
          variant="outline"
          aria-pressed={showAxes}
          onClick={() => setShowAxes(!showAxes)}
        >
          {showAxes ? 'Hide' : 'Show'} the encoding equations
        </Button>
      </div>
      {showAxes && (
        <div className="game-surface game-board">
          <p className="game-small">
            rate = 30 + 12 × weighted feature sum. All coefficients below are
            invented for this four-feature prototype.
          </p>
          <table className="game-results">
            <thead>
              <tr>
                <th>Cell</th>
                {featureNames.map((n) => (
                  <th key={n}>{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {faceAxes.map((a, i) => (
                <tr key={i}>
                  <th>{'ABCD'[i]}</th>
                  {a.map((v, j) => (
                    <td key={j}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            For cell A: rate = 30 + 12 × (eye spacing + 0.65 × face width).
            Widen the face and reduce eye spacing by the right amount: the sum
            stays the same.
          </p>
        </div>
      )}
      <ResearchMedia game="faces" />
      <details className="game-details">
        <summary>What did Chang and Tsao actually measure?</summary>
        <p>
          Chang and Tsao (2017) recorded macaque face-cell responses and
          described faces with shape and appearance features. They found
          axis-like tuning and tested faces that looked different but produced
          similar responses in individual cells. Their population responses also
          supported face reconstruction.{' '}
          <a href="https://doi.org/10.1016/j.cell.2017.05.011">
            Read the paper ↗
          </a>
        </p>
        <p>
          This prototype shows the geometry with four schematic features. Its
          coefficients, cells and rates are illustrative. It does not contain
          their raw electrophysiology, decode a monkey’s experience, or
          reconstruct a biological circuit. The original paper offers data on
          request.
        </p>
      </details>
    </main>
  );
}
