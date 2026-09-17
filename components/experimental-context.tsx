import Link from 'next/link';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import {
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  TableHeader,
} from '@/components/ui/table';
import {
  experimentalProtocols,
  currentModelRows,
} from '@/lib/experimental-protocols';
import type { CircuitKey, ModelKey, Settings } from '@/lib/simulation';
function Parameters({
  rows,
  label,
}: {
  rows: [string, string][];
  label: string;
}) {
  return (
    <Table className="parameter-table">
      <caption className="sr-only">{label}</caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Quantity / condition</TableHead>
          <TableHead scope="col">Reported value or assumption</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(([key, value]) => (
          <TableRow key={key}>
            <TableCell className="parameter-name">{key}</TableCell>
            <TableCell>{value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
export function ExperimentalContext({
  circuit,
  model,
  settings,
  knockdown,
}: {
  circuit: CircuitKey;
  model: ModelKey;
  settings: Settings;
  knockdown: boolean;
}) {
  const protocol = experimentalProtocols[circuit];
  return (
    <div className="experimental-context">
      <div className="comparison-answer">
        <strong>Can these traces be compared?</strong>
        <p>{protocol.comparison}</p>
        <Link href="/learn#comparison">
          How to design a valid comparison <ArrowUpRight size={14} />
        </Link>
      </div>
      <details open className="experimental-details">
        <summary>Reported recording conditions & measurements</summary>
        <Parameters
          rows={protocol.rows}
          label="Reported experimental protocol"
        />
        {circuit === 'motion' && (
          <div className="measured-parameter">
            <strong>
              {knockdown ? 'GluClα RNAi' : 'Control (T4 > GFP)'} · ON preferred
              direction, t = 0
            </strong>
            <div>
              <span>
                Vm <b>{knockdown ? '−62.80 ± 1.43' : '−66.00 ± 1.05'} mV</b>
              </span>
              <span>
                Rin <b>{knockdown ? '7.24 ± 0.57' : '5.26 ± 1.16'} GΩ</b>
              </span>
            </div>
            <p>
              Published mean ± SEM at the first sample, not a fitted resting
              potential or fixed leak resistance. Rin changes during stimulation
              and reflects all active conductances, not just leak. Converting GΩ
              per cell to mS/cm² requires an effective membrane area. These
              values come from the Figure 4a source workbook:{' '}
              {knockdown ? 'D4:E4 and I4:J4' : 'B4:C4 and G4:H4'}. The knockdown
              switch changes the measured condition; it does not alter the
              simulation.
            </p>
          </div>
        )}
        <p className="parameter-missing">
          <strong>Not identified by these displayed data.</strong>{' '}
          {protocol.missing}
        </p>
        <a
          className="parameter-source"
          href={protocol.source}
          target="_blank"
          rel="noreferrer"
        >
          {protocol.sourceLabel} <ArrowUpRight size={13} />
        </a>
      </details>
      <details className="experimental-details">
        <summary>
          Parameters in your active{' '}
          {model === 'lif'
            ? 'LIF'
            : model === 'hh'
              ? 'Hodgkin–Huxley'
              : 'graded'}{' '}
          simulation
        </summary>
        <p className="parameter-intro">
          Assumptions shared by all modeled cells, including the selected
          neuron. These are not measured parameters for its connectome body ID.
        </p>
        <Parameters
          rows={currentModelRows(model, settings)}
          label="Active simulation parameters"
        />
        <p className="parameter-missing">
          Contact weights are normalized by each target’s retained incoming
          contact count after perturbations.{' '}
          {model === 'graded'
            ? 'Excitatory and inhibitory contributions are combined into a signed net input before conversion to conductance.'
            : 'Spike-driven synaptic traces decay with an assumed 8 ms time constant; network input is refreshed every 1 ms.'}{' '}
          Synapse counts do not directly measure these electrical weights.
        </p>
        <Link className="parameter-source" href="/learn">
          <BookOpen size={14} /> Explore the equations and animated models
        </Link>
      </details>
    </div>
  );
}
