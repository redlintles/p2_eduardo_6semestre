const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;
const BYTES_PER_UNIT = 1024;
const EMPTY_VALUE = "—";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium" });

/** Formata um tamanho em bytes de forma legível (ex.: 1,5 MB). */
export function formatBytes(bytes: number | null): string {
  if (bytes === null) {
    return EMPTY_VALUE;
  }

  let value = bytes;
  let unitIndex = 0;
  while (value >= BYTES_PER_UNIT && unitIndex < BYTE_UNITS.length - 1) {
    value /= BYTES_PER_UNIT;
    unitIndex += 1;
  }

  const digits = unitIndex === 0 ? 0 : 1;
  const formatted = value.toLocaleString("pt-BR", { maximumFractionDigits: digits });
  return `${formatted} ${BYTE_UNITS[unitIndex]}`;
}

/** Formata uma data ISO no padrão brasileiro. */
export function formatDate(isoDate: string | null): string {
  return isoDate ? dateFormatter.format(new Date(isoDate)) : EMPTY_VALUE;
}

/** Formata um horário para o console de transferências. */
export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}
