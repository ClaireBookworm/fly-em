'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { gameResearch } from '@/content/game-research';

export default function ResearchMedia({
  game,
}: {
  game: keyof typeof gameResearch;
}) {
  const item = gameResearch[game];
  const [enlarged, setEnlarged] = useState(false),
    [failed, setFailed] = useState(false);
  return (
    <section
      className={`game-research${enlarged ? ' is-enlarged' : ''}`}
      aria-labelledby={`${game}-research-title`}
    >
      <div className="game-caption">
        <span>From the paper</span>
        <span>
          {item.kind === 'video'
            ? 'Original experiment · sound on'
            : 'Original research figure'}
        </span>
      </div>
      <h2 id={`${game}-research-title`}>{item.title}</h2>
      <div className="game-research-grid">
        <figure>
          {failed ? (
            <p className="game-research-fallback">
              The original media could not load.{' '}
              <a href={item.original} target="_blank" rel="noreferrer">
                View it at the source ↗
              </a>
            </p>
          ) : item.kind === 'image' ? (
            <Button
              variant="ghost"
              className="game-research-image"
              onClick={() => setEnlarged(!enlarged)}
              aria-expanded={enlarged}
              aria-label={`${enlarged ? 'Reduce' : 'Enlarge'} ${item.credit}`}
            >
              <Image
                src={item.src}
                width={item.width}
                height={item.height}
                unoptimized
                alt={item.alt}
                loading="lazy"
                onError={() => setFailed(true)}
              />
            </Button>
          ) : (
            <video
              controls
              playsInline
              preload="metadata"
              aria-label={item.alt}
              aria-describedby={`${game}-media-description`}
              onError={() => setFailed(true)}
            >
              <source src={item.src} type="video/mp4" />
              <track
                kind="captions"
                src="/data/games/research/face-cell-captions.vtt"
                srcLang="en"
                label="Sound description"
              />
            </video>
          )}
          <figcaption>
            <a href={item.original} target="_blank" rel="noreferrer">
              {item.credit} ↗
            </a>
            {item.kind === 'image' && !failed && (
              <span>
                {enlarged
                  ? 'Click the figure to reduce it.'
                  : 'Click the figure to enlarge it.'}
              </span>
            )}
          </figcaption>
        </figure>
        <div className="game-research-reading">
          <p id={`${game}-media-description`}>{item.look}</p>
          <p>{item.measured}</p>
          <p className="game-research-comparison">{item.comparison}</p>
          <details>
            <summary>Paper & image credit</summary>
            <p>
              <a href={item.paper} target="_blank" rel="noreferrer">
                Read the paper ↗
              </a>
            </p>
            <p>
              {item.rights}{' '}
              {item.rightsUrl && (
                <a href={item.rightsUrl} target="_blank" rel="noreferrer">
                  License ↗
                </a>
              )}
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}
