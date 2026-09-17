'use client';
import type { CircuitKey } from '@/lib/simulation';
import { papers } from '@/content/papers';
import { GlossaryText } from './glossary';
export function PaperGuide({
  selected,
  onSelect,
}: {
  selected: CircuitKey;
  onSelect: (key: CircuitKey) => void;
}) {
  return (
    <section className="paper-guide">
      <div className="paper-shortlist">
        <strong>Three circuits · three papers</strong>
        {(Object.keys(papers) as CircuitKey[]).map((key) => (
          <a key={key} href={papers[key].url} target="_blank" rel="noreferrer">
            {papers[key].author} ↗
          </a>
        ))}
      </div>
      <details>
        <summary>
          What each circuit does, how it was studied, and which data are shown
        </summary>
        <p className="paper-guide-intro">
          Each circuit has a different biological question and a different
          measurement. The anatomy shown here comes from MaleCNS; the recordings
          come from these earlier studies in other flies.
        </p>
        <div className="paper-grid">
          {(Object.keys(papers) as CircuitKey[]).map((key) => {
            const p = papers[key];
            return (
              <article
                className={`paper-entry ${key === selected ? 'is-selected' : ''}`}
                key={key}
              >
                <button
                  onClick={() => onSelect(key)}
                  aria-pressed={key === selected}
                >
                  {p.circuit}
                </button>
                <h3>
                  <a href={p.url} target="_blank" rel="noreferrer">
                    {p.title} ↗
                  </a>
                </h3>
                <span className="small-label">{p.author}</span>
                <p>
                  <GlossaryText text={p.function} />
                </p>
                <details>
                  <summary>Methods, measurements & what is shown</summary>
                  <p>
                    <GlossaryText text={p.methods} />
                  </p>
                  <p>
                    <GlossaryText text={p.output} />
                  </p>
                  <p>{p.scope}</p>
                  <blockquote>“{p.quote}”</blockquote>
                  <a
                    className="source-link"
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    From the paper’s abstract ↗
                  </a>
                </details>
              </article>
            );
          })}
        </div>
      </details>
    </section>
  );
}
