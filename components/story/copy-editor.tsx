/* Local draft hydration runs after mount; edits never touch model parameters. */
/* oxlint-disable react/react-compiler, jsx-a11y/no-noninteractive-element-interactions */
'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { Pencil, Download, X, RotateCcw } from 'lucide-react';
const storageKey = 'fly-em-learn-copy-v1';
type Draft = Record<string, { text: string; original: string }>;
type Selection = { id: string; text: string; original: string };
const CopyContext = createContext<{
  editing: boolean;
  draft: Draft;
  select: (s: Selection) => void;
} | null>(null);
export function CopyEditor({ children }: { children: ReactNode }) {
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState<Draft>({}),
    [selected, setSelected] = useState<Selection | null>(null),
    [ready, setReady] = useState(false),
    [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved))
        setDraft(
          Object.fromEntries(
            Object.entries(saved).filter(
              ([, v]) =>
                v &&
                typeof v === 'object' &&
                typeof (v as Selection).text === 'string' &&
                typeof (v as Selection).original === 'string',
            ),
          ) as Draft,
        );
    } catch {
      /* A damaged local draft does not prevent reading. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(storageKey, JSON.stringify(draft));
        setStorageError(false);
      } catch {
        setStorageError(true);
      }
  }, [draft, ready]);
  const download = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            page: '/learn',
            exportedAt: new Date().toISOString(),
            changes: draft,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'neuron-lesson-wording.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <CopyContext.Provider value={{ editing, draft, select: setSelected }}>
      <div className={editing ? 'copy-editing' : ''}>{children}</div>
      <div className="copy-toolbar" aria-label="Temporary wording editor">
        <button
          onClick={() => {
            setEditing(!editing);
            setSelected(null);
          }}
        >
          <Pencil size={16} />
          {editing ? 'Finish editing' : 'Edit wording'}
        </button>
        {(editing || Object.keys(draft).length > 0) && (
          <>
            <span>
              {Object.keys(draft).length} edits ·{' '}
              {storageError ? 'download to keep' : 'browser draft'}
            </span>
            <button onClick={download} disabled={!Object.keys(draft).length}>
              <Download size={16} />
              Download edits
            </button>
          </>
        )}
      </div>
      {editing && (
        <aside className="copy-desk" aria-label="Edit lesson wording">
          <div className="copy-desk-heading">
            <span>YOUR WORKING DRAFT</span>
            <button
              aria-label="Close wording editor"
              onClick={() => {
                setEditing(false);
                setSelected(null);
              }}
            >
              <X size={20} />
            </button>
          </div>
          <h2>Make it sound like you.</h2>
          <p>
            Click a highlighted heading or paragraph, then rewrite it here. Your
            changes appear on the page as you type.
          </p>
          {selected ? (
            <>
              <label htmlFor="copy-draft">Selected passage</label>
              <textarea
                id="copy-draft"
                value={draft[selected.id]?.text ?? selected.text}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    [selected.id]: {
                      text: e.target.value,
                      original: d[selected.id]?.original ?? selected.original,
                    },
                  }))
                }
              />
              <button
                className="copy-restore"
                onClick={() => {
                  setDraft((d) => {
                    const next = { ...d };
                    delete next[selected.id];
                    return next;
                  });
                  setSelected({ ...selected, text: selected.original });
                }}
              >
                <RotateCcw size={15} />
                Restore this passage
              </button>
            </>
          ) : (
            <div className="copy-empty">← Pick some words on the page.</div>
          )}
          <p className="copy-local-note" aria-live="polite">
            {storageError
              ? 'Browser storage is unavailable. Download your edits before leaving.'
              : 'Saved only in this browser. Other visitors still see the published wording.'}{' '}
            Download the draft and send it back to apply it to the site.
          </p>
        </aside>
      )}
    </CopyContext.Provider>
  );
}
export function EditableCopy({
  as: Tag = 'p',
  copyId,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'span';
  copyId: string;
  children: ReactNode;
}) {
  const context = useContext(CopyContext),
    replacement = context?.draft[copyId];
  const pick = (el: HTMLElement) =>
    context?.select({
      id: copyId,
      text: replacement?.text ?? el.innerText,
      original: replacement?.original ?? el.innerText,
    });
  return (
    <Tag
      {...props}
      data-copy-id={copyId}
      tabIndex={context?.editing ? 0 : undefined}
      onClickCapture={(e) => {
        if (context?.editing) {
          e.preventDefault();
          e.stopPropagation();
          pick(e.currentTarget);
        }
      }}
      onKeyDown={(e) => {
        if (context?.editing && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          pick(e.currentTarget);
        }
      }}
    >
      {replacement ? replacement.text : children}
    </Tag>
  );
}
