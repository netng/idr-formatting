/**
 * Format a string/number to Indonesian style:
 *  - thousands with "."
 *  - decimals with ","
 *
 * Examples:
 *   formatIdr("1000")     -> "1.000"
 *   formatIdr("1050")     -> "1.050"
 *   formatIdr("1050,32")  -> "1.050,32"
 *   formatIdr(1050.32)    -> "1.050,32"
 */
export function formatIdr(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return ""

  let raw = String(value).replace(/[^0-9,]/g, "")
  let [intPart, decPart] = raw.split(",")

  // Format integer with thousand separator
  let intFormatted = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0
  }).format(Number(intPart || "0"))

  return decPart !== undefined ? `${intFormatted},${decPart}` : intFormatted
}

/**
 * Parse Indonesian-formatted price string into a JS number.
 * "1.050,32" -> 1050.32
 * "1.000"    -> 1000
 */
export function parseIdr(str: string | number | null | undefined): number | null {
  if (str === null || str === undefined || str === "") return null
  const cleaned = String(str).replace(/\./g, "").replace(",", ".")
  const num = Number(cleaned)
  return Number.isNaN(num) ? null : num
}
