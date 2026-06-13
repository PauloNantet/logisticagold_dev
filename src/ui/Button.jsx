const variants = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

export default function Button({ variant = "primary", className = "", children, ...props }) {
  return (
    <button className={`btn ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}
