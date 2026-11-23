export type CalcItem = { qty: number; hargaSatuan: number };

export function roundRp(value: number) {
  return Math.round(value);
}

export function calcInvoice(input: {
  items: CalcItem[];
  useDiskon: boolean;
  diskonPersen: number | null;
  diskonNominal: number | null;
  usePpn: boolean;
  ppnRate: number;
}) {
  const subtotal = roundRp(
    input.items.reduce((sum, item) => sum + item.qty * item.hargaSatuan, 0),
  );

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
