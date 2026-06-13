export const Section = ({ title, children }) => (
  <section className="section-card">
    <h3 className="section-title">{title}</h3>
    <div className="section-grid">
      {children}
    </div>
  </section>
);

export const InputField = ({ label, value, onChange, onInput, onKeyDown, onBlur, type = "text", placeholder = "", readOnly = false, error = false, inputRef }) => (
  <div className={`input-group${error ? ' input-error' : ''}`}>
    <label className="input-label">{label}</label>
    <input
      ref={inputRef}
      type={type}
      value={value}
      onChange={onChange}
      onInput={onInput}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`custom-input${error ? ' input-error' : ''}${readOnly ? ' bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
    />
  </div>
);
