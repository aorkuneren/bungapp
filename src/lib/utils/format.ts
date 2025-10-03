/**
 * Tutarlı sayı formatlaması için utility fonksiyonları
 */

/**
 * Türk Lirası formatında sayı formatlar
 * @param amount - Formatlanacak sayı
 * @returns Formatlanmış string (örn: "1.234,56")
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return num.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
}

/**
 * Türk Lirası formatında sayı formatlar (₺ sembolü ile)
 * @param amount - Formatlanacak sayı
 * @returns Formatlanmış string (örn: "₺1.234,56")
 */
export function formatCurrencyWithSymbol(amount: number | string): string {
  return `₺${formatCurrency(amount)}`
}

/**
 * Yüzde formatında sayı formatlar
 * @param value - Formatlanacak sayı
 * @returns Formatlanmış string (örn: "%12,34")
 */
export function formatPercentage(value: number): string {
  return `${value.toLocaleString('tr-TR')}%`
}
