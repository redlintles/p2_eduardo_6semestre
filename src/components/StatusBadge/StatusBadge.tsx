import type { TransferStatus } from "@/types/transfer";

export type BadgeStatus = TransferStatus | "unsupported" | "idle";

const LABELS: Readonly<Record<BadgeStatus, string>> = {
  success: "Copiado",
  skipped: "Já existe",
  error: "Erro",
  unsupported: "Não suportado",
  idle: "Pendente",
};

interface StatusBadgeProps {
  status: BadgeStatus;
}

/** Indica o status de transferência de um arquivo. */
export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${status}`}>{LABELS[status]}</span>;
}
