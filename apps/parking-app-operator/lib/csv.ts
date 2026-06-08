export function escapeCsvValue(value: unknown) {
  const normalized = value == null ? '' : String(value);
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`;
  }
  return normalized;
}

export function buildCsv<T extends object>(rows: T[], columns: Array<keyof T & string>) {
  const header = columns.map(escapeCsvValue).join(',');
  const lines = rows.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(','));
  return [header, ...lines].join('\n');
}
