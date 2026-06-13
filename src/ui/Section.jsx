export default function Section({ title, children, className = "", errorMsg }) {
  return (
    <section className={`section-card${errorMsg ? " section-error" : ""} ${className}`}>
      {title && <h3 className="section-title">{title}</h3>}
      {errorMsg && <p className="section-error-msg">{errorMsg}</p>}
      <div className="section-grid">{children}</div>
    </section>
  );
}
