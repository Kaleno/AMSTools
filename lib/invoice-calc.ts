export type CalcItem = { qty: number; hargaSatuan: number };

export function roundRp(value: number) {
  return Math.round(value);
}

/** One invoice line, in whole rupiah. The invoice subtotal is the sum of these. */
export function lineSubtotal(item: CalcItem) {
  return roundRp(item.qty * item.hargaSatuan);
}

/** Store a whole-rupiah unit price, then the rounded line amount from that price. */
export function wholeRupiahLines<T extends CalcItem>(lines: T[]) {
  return lines.map((line) => {
    const hargaSatuan = roundRp(line.hargaSatuan);
    return {
      ...line,
      hargaSatuan,
      subtotal: lineSubtotal({ qty: line.qty, hargaSatuan }),
    };
  });
}

export function calcInvoice(input: {
  items: CalcItem[];
  useDiskon: boolean;
  diskonPersen: number | null;
  diskonNominal: number | null;
  usePpn: boolean;
  ppnRate: number;
}) {
  const subtotal = input.items.reduce((sum, item) => sum + lineSubtotal(item), 0);

  let diskonAmount = 0;
  if (input.useDiskon) {
    if (input.diskonPersen && input.diskonPersen > 0) {
      diskonAmount = roundRp(subtotal * (input.diskonPersen / 100));
    } else {
      diskonAmount = roundRp(input.diskonNominal ?? 0);
    }
  }
  if (diskonAmount > subtotal) diskonAmount = subtotal;

  const dpp = subtotal - diskonAmount;
  const ppnAmount = input.usePpn ? roundRp(dpp * (input.ppnRate / 100)) : 0;
  const grandTotal = dpp + ppnAmount;

  return { subtotal, diskonAmount, dpp, ppnAmount, grandTotal };
}
