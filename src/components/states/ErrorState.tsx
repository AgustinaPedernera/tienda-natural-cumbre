
interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      style={{
        padding: "24px",
        textAlign: "center",
        border: "1px solid #c76b6b",
        borderRadius: "12px",
      }}
    >
      <p>{message}</p>

      {onRetry && (
        <button type="button" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
