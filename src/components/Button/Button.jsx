const VARIANTS = new Set(["primary", "secondary", "ghost", "inverse"]);

/**
 * Botão padrão. A variante é aplicada como modificador BEM (button--primary).
 */
export function Button({ variant = "secondary", type = "button", children, ...props }) {
  const modifier = VARIANTS.has(variant) ? variant : "secondary";

  return (
    <button type={type} className={`button button--${modifier}`} {...props}>
      {children}
    </button>
  );
}
