/**
 * Format a string/number to Indonesian style:
 *  - thousands with "."
 *  - decimals with ","
 *
 * Example usage:
 *   formatIdr("1000")        // "1.000"
 *   formatIdr("1050")        // "1.050"
 *   formatIdr("1050,32")     // "1.050,32"
 *   formatIdr(1050.32)       // "1.050,32"
 *   formatIdr("Rp 1.234,56") // "1.234,56"
 *   formatIdr(1000000)       // "1.000.000"
 *   formatIdr("")            // ""
 */
export function formatIdr(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return ""

  const str = String(value).trim()

  // User typed comma as decimal
  if (str.includes(",")) {
    const raw = str.replace(/[^0-9,]/g, "")
    const [intPart, decPart] = raw.split(",")
    const intFormatted = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 })
      .format(Number(intPart || "0"))
    return decPart !== undefined ? `${intFormatted},${decPart}` : intFormatted
  }

  // Number with dot decimal (e.g., 1050.32)
  if (str.includes(".")) {
    const [left, right] = str.split(".", 2)
    const intDigits = (left || "").replace(/\D/g, "")
    const decDigits = (right || "").replace(/\D/g, "")
    const intFormatted = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 })
      .format(Number(intDigits || "0"))
    return decDigits ? `${intFormatted},${decDigits}` : intFormatted
  }

  // Plain integer
  const digitsOnly = str.replace(/\D/g, "")
  const intFormatted = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 })
    .format(Number(digitsOnly || "0"))
  return intFormatted
}

/**
 * Parse Indonesian-formatted price string into a JS number.
 *  - Accepts stray characters like "Rp " or spaces
 *  - Treats "." as thousands and "," as decimal
 *
 * Example usage:
 *   parseIdr("1.050,32")  // 1050.32
 *   parseIdr("Rp 1.234")  // 1234
 *   parseIdr(" 10.000 ")  // 10000
 *   parseIdr("")          // null
 */
export function parseIdr(str: string | number | null | undefined): number | null {
  if (str === null || str === undefined || str === "") return null

  // Keep only digits, dot, comma, and optional leading minus
  let s = String(str).trim()
  const isNegative = s.startsWith("-")
  s = (isNegative ? s.slice(1) : s).replace(/[^0-9.,]/g, "")

  // Indonesian normalization: remove thousands ".", turn decimal "," into "."
  const normalized = s.replace(/\./g, "").replace(",", ".")
  if (normalized === "" || normalized === ".") return null

  const num = Number((isNegative ? "-" : "") + normalized)
  return Number.isNaN(num) ? null : num
}
