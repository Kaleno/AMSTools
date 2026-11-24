export function foreignInvoiceItemIds(lines: { id?: string | null }[], ownedIds: ReadonlySet<string>) {
  const seen = new Set<string>();
  const rejected: string[] = [];
  for (const line of lines) {
    if (line.id == null || line.id === "") continue;
    if (!ownedIds.has(line.id) || seen.has(line.id)) rejected.push(line.id);
    else seen.add(line.id);
  }
  return rejected;
}
