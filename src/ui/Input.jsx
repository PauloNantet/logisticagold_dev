import { forwardRef } from "react";

const Input = forwardRef(({ label, error, className = "", ...props }, ref) => (
  <div className={`input-group${error ? " input-error" : ""}`}>
    {label && <label className="input-label">{label}</label>}
    <input ref={ref} className={`custom-input${error ? " input-error" : ""} ${className}`} {...props} />
  </div>
));

export function Textarea({ label, error, className = "", ...props }) {
  return (
    <div className={`input-group${error ? " input-error" : ""}`}>
      {label && <label className="input-label">{label}</label>}
      <textarea className={`custom-input${error ? " input-error" : ""} ${className}`} {...props} />
    </div>
  );
}

export default Input;
