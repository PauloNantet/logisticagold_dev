export default function IconBtn({ icon: Icon, label, onClick, variant = "default", className = "", ...props }) {
  const variantClass = {
    default: "",
    edit: "edit",
    delete: "delete",
    download: "download",
    select: "select",
  }[variant] || "";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`action-icon-btn ${variantClass} ${className}`}
      title={label}
      aria-label={label}
      {...props}
    >
      <Icon size={14} />
    </button>
  );
}
