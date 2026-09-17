/* Preserve the original publisher figure URL. */
/* oxlint-disable next/no-img-element */
'use client';
import { useState } from 'react';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { GlossaryText } from '@/components/glossary';
import { ExperimentalContext } from '@/components/experimental-context';
import { TracePlot, Heatmap } from '@/components/science-plots';
import type { Recording } from '@/lib/recordings';
import type { CircuitKey, ModelKey, Settings } from '@/lib/simulation';
export function Evidence({
  data,
  circuit,
  model,
  settings,
}: {
  data: Recording;
  circuit: CircuitKey;
  model: ModelKey;
  settings: Settings;
}) {
  const [showPerturb, setShowPerturb] = useState(false);
  return (
    <div className="evidence-content">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Measured in living flies</span>
          <h3>
            {circuit === 'heading'
              ? 'The compass, through calcium'
              : circuit === 'motion'
                ? 'T4 membrane voltage'
                : 'Giant-fiber whole-cell recordings'}
          </h3>
        </div>
        <a
          className="source-link"
          href={data.source}
          target="_blank"
          rel="noreferrer"
        >
          Paper <ArrowUpRight size={15} />
        </a>
      </div>
      <p className="muted">
        <GlossaryText text={data.kind} />
      </p>
      {circuit === 'escape' ? (
        <>
          <a
            className="experimental-figure"
            href={data.figurePage}
            target="_blank"
            rel="noreferrer"
          >
            <img
              src={data.figure}
              alt="Dombrovski et al. Extended Data Figure 4: experimental giant-fiber and descending-neuron voltage traces, stimulus protocol, and response summaries."
              loading="lazy"
            />
            <span>
              Open original figure to inspect voltage traces in panels b, d and
              g <ExternalLink size={14} />
            </span>
          </a>
          <p className="annotation">{data.limitation}</p>
        </>
      ) : (
        <>
          {circuit === 'motion' && (
            <label className="switch-label" htmlFor="measured-knockdown">
              <Switch
                id="measured-knockdown"
                checked={showPerturb}
                onCheckedChange={setShowPerturb}
              />
              Show GluClα knockdown
            </label>
          )}
          <TracePlot
            time={data.time!}
            timeUnit={data.timeUnit}
            unit={data.unit}
            lines={data
              .series!.slice(
                circuit === 'motion' && showPerturb ? 2 : 0,
                circuit === 'motion' && showPerturb ? 4 : 2,
              )
              .map((s, i) => ({ ...s, color: i ? '#d1a5de' : '#d9eccc' }))}
          />
          {data.heatmap && (
            <Heatmap
              rows={data.heatmap}
              label="Measured E-PG fluorescence · 18 bridge ROIs"
              color="#bee780"
              range={[-0.1, 1.25]}
              timeEnd={data.time![data.time!.length - 1]}
              timeUnit="s"
            />
          )}
        </>
      )}
      <div className="evidence-note">
        <strong>Experimental condition</strong>
        <p>
          <GlossaryText text={data.condition} />
        </p>
        <p className="annotation">
          {circuit === 'motion'
            ? 'Lines are population means; bands are SEM. The source provides 300 samples at 10 ms spacing.'
            : circuit === 'heading'
              ? 'One fly, one stripe trial. Fluorescence is a filtered indicator signal; it is not a spike raster. The colored ROIs are not matched to individual MaleCNS body IDs.'
              : 'The figure supplies real measured waveforms. The accompanying source table has integrated responses, not raw voltage samples.'}
        </p>
      </div>
      <ExperimentalContext
        circuit={circuit}
        model={model}
        settings={settings}
        knockdown={showPerturb}
      />
      <footer className="citation">
        <a href={data.download} target="_blank" rel="noreferrer">
          {data.citation} · source data <ArrowUpRight size={13} />
        </a>
        <span>
          {data.license} · time scales and preparations differ from the model
        </span>
      </footer>
    </div>
  );
}
