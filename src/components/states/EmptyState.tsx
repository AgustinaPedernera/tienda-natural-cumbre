
interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <section
      style={{
        padding: "32px",
        textAlign: "center",
        border: "1px solid #d9e3df",
        borderRadius: "12px",
      }}
    >
      <h2>{title}</h2>

      {description && <p>{description}</p>}

      {actionLabel && onAction && (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </section>
  );
}
