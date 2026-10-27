import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function DeleteArtwork() {
  return <div className="delete-art" aria-hidden="true">
    <svg viewBox="0 0 180 150" role="presentation">
      <ellipse cx="91" cy="132" rx="55" ry="8" className="delete-art-shadow" />
      <g className="delete-art-paper">
        <path d="M51 20h42l18 18v44H51z" className="delete-paper-fill" />
        <path d="M93 20v19h18" className="delete-paper-fold" />
        <path d="M62 51h36M62 61h30M62 71h24" className="delete-paper-lines" />
      </g>
      <g className="delete-art-bin">
        <path d="M64 61h53l-5 61H69z" className="delete-bin-fill" />
        <path d="M60 56h61M77 49h27M84 72v36M98 72v36" className="delete-bin-line" />
        <path d="M59 57l5-7h53l5 7" className="delete-bin-lid" />
      </g>
      <path d="M40 102l-7 5m109-6 8 5M42 48l-8-4m106 2 8-5" className="delete-art-spark" />
    </svg>
    <span className="sr-only">Animated illustration of a file dropping into a trash bin</span>
  </div>;
}

export default function DeleteConfirmAction({
  children,
  onDelete,
  title = "Delete this item?",
  description = "This action cannot be undone.",
  confirmLabel = "Delete permanently",
  className = "",
  triggerProps = {},
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const cancelRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === "Escape" && !busy) setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [open, busy]);

  useEffect(() => { if (!open) triggerRef.current?.focus(); }, [open]);

  const confirm = async () => {
    setBusy(true); setError("");
    try { await onDelete(); setOpen(false); }
    catch (ex) { setError(ex?.message || "Could not complete this deletion. Please try again."); }
    finally { setBusy(false); }
  };

  return <>
    <button ref={triggerRef} type="button" className={className} onClick={() => { setError(""); setOpen(true); }} {...triggerProps}>{children}</button>
    {open && createPortal(<div className="delete-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section className="delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
        <DeleteArtwork />
        <p className="delete-dialog-kicker">CONFIRM ACTION</p>
        <h2 id="delete-dialog-title">{title}</h2>
        <p id="delete-dialog-description" className="delete-dialog-description">{description}</p>
        {error && <p className="delete-dialog-error" role="alert">{error}</p>}
        <div className="delete-dialog-actions">
          <button ref={cancelRef} type="button" className="delete-dialog-cancel" disabled={busy} onClick={() => setOpen(false)}>Keep it</button>
          <button type="button" className="delete-dialog-confirm" disabled={busy} onClick={confirm}>{busy ? <><span className="delete-button-spinner" aria-hidden="true"/>Deleting…</> : confirmLabel}</button>
        </div>
      </section>
    </div>, document.body)}
  </>;
}
