const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function rotationDay(now = new Date()) {
  return dayFormatter.format(now);
}

// FNV-1a do id com o dia: a ordem dos empatados muda todo dia e é igual para todos os visitantes.
export function rotationKey(id: string, day: string) {
  let hash = 0x811c9dc5;
  for (const char of `${day}:${id}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
