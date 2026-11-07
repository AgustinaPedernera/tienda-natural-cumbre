interface PaginationProps {
  page: number;
  totalPages: number;
  disabled?: boolean;
  onChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  disabled = false,
  onChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Paginación de productos"
      className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4"
    >
      <button
        type="button"
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
        className="cumbre-button cumbre-button-secondary"
      >
        ← Anterior
      </button>

      <span
        aria-live="polite"
        className="text-xs text-muted"
      >
        {page} de {totalPages}
      </span>

      <button
        type="button"
        disabled={disabled || page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="cumbre-button cumbre-button-secondary"
      >
        Siguiente →
      </button>
    </nav>
  );
}