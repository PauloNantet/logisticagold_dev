import { useRef, useEffect } from "react";

export default function ConfirmDialog({ message, onConfirm, onCancel, confirmText = "Sim", cancelText = "Não" }) {
  const naoRef = useRef(null);
  const simRef = useRef(null);

  useEffect(() => {
    naoRef.current?.focus();
  }, []);

  const handleKey = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      simRef.current?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      naoRef.current?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    } else if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      const next = document.activeElement === naoRef.current ? simRef.current : naoRef.current;
      next?.focus();
    }
  };

  return (
    <div className="confirm-overlay" onClick={onCancel} onKeyDown={handleKey}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button ref={naoRef} autoFocus className="confirm-btn no-btn" onClick={onCancel}>{cancelText}</button>
          <button ref={simRef} className="confirm-btn yes-btn" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
