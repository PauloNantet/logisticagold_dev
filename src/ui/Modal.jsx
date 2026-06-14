import { X } from "lucide-react";
import Button from "./Button";

export default function Modal({ title, onClose, children, footer = undefined, count = undefined }) {
  return (
    <div className="modal-overlay no-print" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-row">
              <h2 className="modal-title">{title}</h2>
              {count !== undefined && (
                <span className="table-count-header">{count}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="modal-close" aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
