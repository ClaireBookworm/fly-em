/* Original research figures are linked at their publisher URLs. */
/* SVG provides accessible scientific diagrams, not replaceable bitmap images. */
/* oxlint-disable next/no-img-element, jsx-a11y/prefer-tag-over-role */
'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
  PopoverDescription,
} from '@/components/ui/popover';
import { papers, paperImages } from '@/content/papers';
type Entry = {
  title: string;
  text: string;
  source: 'heading' | 'escape' | 'motion';
  graphic?: 'ring' | 'stripe' | 'calcium';
  image?: keyof typeof paperImages;
};
const definitions: Record<string, Entry> = {
  epg: {
    title: 'E-PG: the compass representation',
    text: 'A population of central-complex neurons whose activity is localized around a heading-related position. E, P and G refer to regions their arbors occupy. An E-PG cell is a cell type, not an equation variable.',
    source: 'heading',
    graphic: 'ring',
  },
  pen: {
    title: 'P-EN: updating the compass',
    text: 'P-EN neurons connect the protocerebral bridge, ellipsoid body and noduli. P-EN1 and P-EN2 are distinct types; their offset, recurrent connections participate in updating the heading representation.',
    source: 'heading',
    graphic: 'ring',
  },
  delta: {
    title: 'Δ7: interactions across headings',
    text: 'Delta7 neurons span the protocerebral bridge and participate in the compass network’s inhibitory interactions. Transmitter identity alone does not specify the sign of every connection: the postsynaptic receptors matter.',
    source: 'heading',
    graphic: 'ring',
  },
  stripe: {
    title: 'Visual stripe trial',
    text: 'A visible stripe provides an angular landmark while a tethered fly walks. Researchers compare the position of the neural activity pattern with the visual cue and the fly’s movement. The plot here is a calcium-imaging trial, not a recording of individual spikes.',
    source: 'heading',
    graphic: 'stripe',
  },
  calcium: {
    title: 'Fluorescence is an indirect activity readout',
    text: 'Calcium-sensitive proteins change brightness as cellular calcium changes. ΔF/F expresses fluorescence change relative to a reference. Indicator kinetics and imaging rate blur timing; this is not membrane voltage in mV.',
    source: 'heading',
    graphic: 'calcium',
  },
  lc4: {
    title: 'LC4: a looming-sensitive visual pathway',
    text: 'LC4 cells are visual projection neurons. Their synapses onto descending neurons can convey information about an approaching object’s position.',
    source: 'escape',
    image: 'escape',
  },
  lplc: {
    title: 'LPLC2: visual projection neurons',
    text: 'LPLC2 is a visual cell type responsive to expanding, looming patterns. The extract includes LPLC2 contacts onto the giant fiber.',
    source: 'escape',
    image: 'escape',
  },
  gf: {
    title: 'Giant fiber (GF / DNp01)',
    text: 'A descending neuron involved in rapid escape takeoff. This model follows its brain inputs, without the muscles and body mechanics needed to simulate a jump.',
    source: 'escape',
    image: 'escape',
  },
  t4: {
    title: 'T4: direction-selective ON motion',
    text: 'T4 cells respond preferentially to bright-edge motion in one direction. T4a is one directional subtype. This paper measures membrane voltage and studies interactions between excitatory and inhibitory dendritic inputs.',
    source: 'motion',
    image: 'motion',
  },
  t5: {
    title: 'T5: the OFF motion pathway',
    text: 'T5 cells participate in dark-edge motion detection. T5a appears in this anatomical extract, but the experimental voltage data alongside it are from T4. They are not measurements of T5.',
    source: 'motion',
    image: 'motion',
  },
  ephys: {
    title: 'Whole-cell electrophysiology',
    text: 'An electrode gains electrical access to the cell. In current clamp, the experimenter records voltage while controlling injected current. Voltage, input resistance and averaged response curves are distinct measurements.',
    source: 'motion',
    image: 'conductance',
  },
  sem: {
    title: 'SEM: uncertainty in a mean',
    text: 'The standard error of the mean describes uncertainty in the estimated average across samples. It is not the range of voltages in one neuron or the variability of individual spike shapes.',
    source: 'motion',
    image: 'motion',
  },
  conductance: {
    title: 'Conductance: how readily current flows',
    text: 'For a synaptic conductance, current depends on both conductance and the difference between membrane voltage and a reversal potential. The same conductance can have different effects at different voltages.',
    source: 'motion',
    image: 'conductance',
  },
};
const aliases: Record<string, string> = {
  'E-PG': 'epg',
  EPG: 'epg',
  'P-EN1/2': 'pen',
  'P-EN': 'pen',
  Δ7: 'delta',
  Delta7: 'delta',
  'visual stripe trial': 'stripe',
  'Visual stripe trial': 'stripe',
  'stripe trial': 'stripe',
  fluorescence: 'calcium',
  'ΔF/F': 'calcium',
  LC4: 'lc4',
  LPLC2: 'lplc',
  'giant fiber': 'gf',
  'Giant-fiber': 'gf',
  T4a: 't4',
  T4: 't4',
  T5a: 't5',
  'whole-cell': 'ephys',
  'Whole-cell': 'ephys',
  electrophysiology: 'ephys',
  SEM: 'sem',
  conductance: 'conductance',
};
const pattern = new RegExp(
  `(${Object.keys(aliases)
    .sort((a, b) => b.length - a.length)
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})`,
  'g',
);
function ConceptGraphic({ kind }: { kind: Entry['graphic'] }) {
  if (kind === 'stripe')
    return (
      <svg
        viewBox="0 0 360 140"
        role="img"
        aria-label="Schematic of an angular visual landmark around a walking animal"
      >
        <circle cx="95" cy="68" r="48" fill="none" stroke="currentColor" />
        <path d="M85 20 H105" stroke="currentColor" strokeWidth="8" />
        <path
          d="M95 80 V49 M89 57 L95 49 L101 57"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text x="165" y="48">
          Stripe: visual landmark
        </text>
        <text x="165" y="77">
          Arrow: heading
        </text>
        <text x="20" y="135">
          Conceptual arena, not an apparatus reconstruction
        </text>
      </svg>
    );
  if (kind === 'calcium')
    return (
      <svg
        viewBox="0 0 360 120"
        role="img"
        aria-label="Schematic showing discrete events and a slower fluorescence response"
      >
        <text x="5" y="22">
          Events
        </text>
        <path d="M85 30 V10 M102 30 V10 M200 30 V10" stroke="currentColor" />
        <text x="5" y="70">
          Indicator
        </text>
        <path
          d="M85 84 Q90 51 98 55 Q105 25 115 44 Q140 74 198 80 Q208 50 220 60 Q250 83 345 86"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <text x="5" y="115">
          Illustrative kinetics only; not experimental data
        </text>
      </svg>
    );
  return (
    <svg
      viewBox="0 0 360 145"
      role="img"
      aria-label="Schematic of a localized heading representation on a ring"
    >
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return (
          <circle
            key={i}
            cx={Number((82 + 48 * Math.cos(a)).toFixed(3))}
            cy={Number((67 + 48 * Math.sin(a)).toFixed(3))}
            r="7"
            fill="currentColor"
            opacity={i < 3 ? 1 : 0.18}
          />
        );
      })}
      <text x="158" y="50">
        Activity is localized
      </text>
      <text x="158" y="75">
        around a heading.
      </text>
      <text x="13" y="137">
        Conceptual population layout; not measured activity
      </text>
    </svg>
  );
}
export function Term({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const entry = definitions[name],
    p = papers[entry.source];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="term-trigger"
        onMouseEnter={() => {
          cancel();
          timer.current = setTimeout(() => setOpen(true), 200);
        }}
        onMouseLeave={() => {
          cancel();
          timer.current = setTimeout(() => setOpen(false), 350);
        }}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="term-window"
        align="start"
        sideOffset={8}
        initialFocus={false}
        onMouseEnter={cancel}
        onMouseLeave={() => {
          cancel();
          timer.current = setTimeout(() => setOpen(false), 350);
        }}
      >
        <div className="term-window-bar">
          <PopoverTitle>{entry.title}</PopoverTitle>
          <button onClick={() => setOpen(false)} aria-label="Close explanation">
            <X size={16} />
          </button>
        </div>
        <div className="term-window-body">
          <PopoverDescription>{entry.text}</PopoverDescription>
          <figure>
            {entry.image && !imageFailed ? (
              <img
                src={paperImages[entry.image]}
                onError={() => setImageFailed(true)}
                alt={`Original figure from ${p.author}; see the linked paper for panel descriptions.`}
                loading="lazy"
              />
            ) : entry.graphic ? (
              <ConceptGraphic kind={entry.graphic} />
            ) : null}
            <figcaption>
              {entry.image
                ? `${imageFailed ? 'Figure unavailable here. ' : ''}${p.author}, Fig. ${entry.image === 'conductance' ? '3' : '1'} · CC BY 4.0; unmodified publisher image.`
                : 'Explanatory schematic.'}
            </figcaption>
          </figure>
          <a href={p.url} target="_blank" rel="noreferrer">
            {p.title} ↗
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
export function GlossaryText({ text }: { text: string }) {
  return (
    <>
      {text.split(pattern).map((part, i) =>
        aliases[part] ? (
          <Term key={i} name={aliases[part]}>
            {part}
          </Term>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
