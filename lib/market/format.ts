export function money(n: number | null | undefined, unit = "USD") {
  if (n == null || !Number.isFinite(n)) return "—";
  return unit === "USD/shares"
    ? "$" + n.toFixed(2)
    : new Intl.NumberFormat("en-US", {
        notation: Math.abs(n) >= 1000000 ? "compact" : "standard",
        maximumFractionDigits: 2,
        style: "currency",
        currency: "USD",
      }).format(n);
}
export function change(n: number | null | undefined) {
  return n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
}
