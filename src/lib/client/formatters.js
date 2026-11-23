const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];
const BYTES_PER_UNIT = 1024;

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium" });

/** Formata um tamanho em bytes de forma legível (ex.: 1,5 MB). */
export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) {
    return "—";
  }

  let value = bytes;
  let unitIndex = 0;
  while (value >= BYTES_PER_UNIT && unitIndex < BYTE_UNITS.length - 1) {
    value /= BYTES_PER_UNIT;
    unitIndex += 1;
  }

  const digits = unitIndex === 0 ? 0 : 1;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: digits })} ${BYTE_UNITS[unitIndex]}`;
}

/** Formata uma data ISO no padrão brasileiro. */
export function formatDate(isoDate) {
  return isoDate ? dateFormatter.format(new Date(isoDate)) : "—";
}

/** Formata o horário atual para o console de transferências. */
export function formatTime(date) {
  return timeFormatter.format(date);
}
