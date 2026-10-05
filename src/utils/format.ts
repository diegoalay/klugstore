/**
 * Formato de moneda, centralizado — antes estaba duplicado (`Intl.NumberFormat('es-GT', …)`)
 * en 6 archivos distintos del catálogo y el admin.
 */
export function formatCurrency(amount: number, currency = 'GTQ'): string {
  try {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount}`
  }
}
