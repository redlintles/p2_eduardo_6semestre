import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "inverse";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ButtonVariant;
}

/** Botão padrão. A variante é aplicada como modificador BEM (button--primary). */
export function Button({ variant = "secondary", type = "button", children, ...props }: ButtonProps) {
  return (
    <button type={type} className={`button button--${variant}`} {...props}>
      {children}
    </button>
  );
}
