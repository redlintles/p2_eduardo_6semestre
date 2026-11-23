const LABELS = Object.freeze({
  success: "Copiado",
  skipped: "Já existe",
  error: "Erro",
  unsupported: "Não suportado",
  idle: "Pendente",
});

/**
 * Indica o status de transferência de um arquivo.
 * @param {{ status: keyof typeof LABELS }} props
 */
export function StatusBadge({ status }) {
  const safeStatus = status in LABELS ? status : "idle";

  return <span className={`status-badge status-badge--${safeStatus}`}>{LABELS[safeStatus]}</span>;
}
