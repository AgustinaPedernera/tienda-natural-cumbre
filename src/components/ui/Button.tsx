
import type { ReactNode } from "react";

type ButtonSize = "sm" | "md" | "lg";

interface BaseButtonProps {
  size?: ButtonSize;
  children?: ReactNode;
}

interface SolidButtonProps extends BaseButtonProps {
  variant: "solid";
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  href?: never;
  target?: never;
}

interface LinkButtonProps extends BaseButtonProps {
  variant: "link";
  href: string;
  target?: string;
  onClick?: never;
  disabled?: never;
  loading?: never;
}

type ButtonProps = SolidButtonProps | LinkButtonProps;

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: "6px 12px", fontSize: "14px" },
  md: { padding: "10px 18px", fontSize: "16px" },
  lg: { padding: "14px 24px", fontSize: "18px" },
};

export function Button(props: ButtonProps) {
  const size = props.size ?? "md";

  const commonStyles: React.CSSProperties = {
    ...sizeStyles[size],
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-block",
    textDecoration: "none",
    textAlign: "center",
  };

  if (props.variant === "link") {
    return (
      <a
        href={props.href}
        target={props.target}
        rel={props.target === "_blank" ? "noopener noreferrer" : undefined}
        style={{
          ...commonStyles,
          color: "#173f4f",
          textDecoration: "underline",
        }}
      >
        {props.children}
      </a>
    );
  }

  const isDisabled = props.disabled || props.loading;

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={isDisabled}
      style={{
        ...commonStyles,
        backgroundColor: isDisabled ? "#a0a0a0" : "#173f4f",
        color: "#ffffff",
        border: "none",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.7 : 1,
      }}
    >
      {props.loading ? "Cargando…" : props.children}
    </button>
  );
}
