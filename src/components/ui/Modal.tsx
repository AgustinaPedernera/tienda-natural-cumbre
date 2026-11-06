
import type { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
}: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Ventana de diálogo"}
        style={{
          backgroundColor: "#ffffff",
          color: "#173f4f",
          padding: "24px",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "480px",
        }}
      >
        {title && <h2>{title}</h2>}

        <div>{children}</div>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: "20px",
            padding: "10px 18px",
            cursor: "pointer",
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
