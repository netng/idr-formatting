// src/index.ts

/** Sign type for fixed-point representation */
export type IdxSign = 1 | -1

/** Exact fixed-point representation backed by BigInt (no FP error) */
export interface FixedIdr {
  /** sign * units / 10^scale gives exact numeric value */
  sign: IdxSign
  /** all digits as an integer (no decimal point) */
  units: bigint
  /** number of decimal digits (e.g., 2 for cents) */
  scale: number
  /** Convert to JS number (may lose precision for very large values) */
  toNumber(): number
  /** Canonical decimal string "1234567.89" (with '.' as decimal) */
  toString(): string
}

export interface ParseIdrOptions {
  /** "number" (default) -> returns number|null; "fixed" -> returns FixedIdr|null */
  mode?: "number" | "fixed"
}

export interface FormatIdrOptions {
  /**
   * Decimal behavior
   * - "auto" (default): preserve decimals as typed (no rounding, no padding)
   * - number: force that many decimals (round/pad as needed)
   */
  decimals?: "auto" | number
  /**
   * If decimals === "auto", pad to at least 2 digits when a decimal part exists.
   * Example: "1050,5" -> "1.050,50" when padZeros: true
   */
  padZeros?: boolean
}

/* ────────────────────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────────────────────── */

function makeFixed(sign: IdxSign, intDigits: string, decDigits: string): FixedIdr {
  const i = intDigits.replace(/^0+(?!$)/, "") || "0"
  const d = decDigits.replace(/[^0-9]/g, "")
  const scale = d.length
  const units = BigInt(i + d)

  return {
    sign,
    units,
    scale,
    toNumber() {
      const n = Number(units) / Math.pow(10, scale)
      return sign === -1 ? -n : n
    },
    toString() {
      if (scale === 0) return (sign === -1 ? "-" : "") + units.toString()
      const s = units.toString().padStart(scale + 1, "0")
      const head = s.slice(0, s.length - scale)
      const tail = s.slice(-scale)
      return (sign === -1 ? "-" : "") + head + "." + tail
    }
  }
}

function isFixedIdr(v: unknown): v is FixedIdr {
  return !!v && typeof v === "object" && "units" in (v as any) && "scale" in (v as any)
}

/** Keep only first comma as decimal marker; drop the rest (paste resilience) */
function keepFirstCommaOnly(s: string): string {
  const idx = s.indexOf(",")
  if (idx < 0) return s
  return s.slice(0, idx + 1) + s.slice(idx + 1).replace(/,/g, "")
}

/** Format integer digits with Indonesian thousands separators */
function idThousands(n: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)
}

/* ────────────────────────────────────────────────────────────────────────────
   formatIdr
──────────────────────────────────────────────────────────────────────────── */

/**
 * Format a value into Indonesian numeric style:
 * - Thousands: "."
 * - Decimals:  ","
 *
 * Heuristics:
 * - If there is a comma (","): treat it as the decimal separator.
 * - If there is a dot (".") and no comma:
 *    • If it matches a valid thousands pattern (e.g. "1.500", "12.345.678"),
 *      treat "." as thousands.
 *    • Otherwise, treat the first "." as a decimal point (e.g. "12.34" → "12,34").
 * - Plain digits are formatted as integers with thousand separators.
 * - A leading minus sign is preserved (e.g. "-1050.5" → "-1.050,5").
 *
 * Notes:
 * - Non-digit noise is ignored (letters, whitespace, currency symbols).
 * - With decimals: "auto" preserves what user typed; set {decimals: 2} to force rounding/padding.
 *
 * @param value number|string|FixedIdr to format (e.g., 1050.32, "1050,32", "1.500", "-1500")
 * @param options decimals behavior & zero padding
 * @returns Formatted string in Indonesian style (or "" for nullish/empty input)
 *
 * @example
 * formatIdr("1000")          // "1.000"
 * formatIdr("1050,32")       // "1.050,32"
 * formatIdr(1050.32)         // "1.050,32"
 * formatIdr("1.500")         // "1.500"       (thousands)
 * formatIdr("12.34")         // "12,34"       (dot used as decimal)
 * formatIdr("-1050.5")       // "-1.050,5"    (minus preserved)
 * formatIdr("1050,5", { decimals: "auto", padZeros: true }) // "1.050,50"
 * formatIdr("1050,5678", { decimals: 2 })                   // "1.050,57"
 */
export function formatIdr(
  value: string | number | FixedIdr | null | undefined,
  options: FormatIdrOptions = {}
): string {
  if (value === null || value === undefined || value === "") return ""

  // Allow FixedIdr directly
  if (isFixedIdr(value)) {
    // Convert to canonical decimal "1234.56" then reuse the same logic
    return formatIdr(value.toString(), options)
  }

  const { decimals = "auto", padZeros = false } = options

  let str = String(value).trim()
  const negative = str.startsWith("-")
  if (negative) str = str.slice(1) // format magnitude; re-attach sign later

  // Helper to apply decimal policy
  function applyDecimals(intFormatted: string, rawDecimals?: string): string {
    if (decimals === "auto") {
      if (rawDecimals === undefined || rawDecimals === "") return intFormatted
      const dec = padZeros ? rawDecimals.padEnd(2, "0") : rawDecimals
      return `${intFormatted},${dec}`
    } else {
      // Force N decimals: build a JS number from int/dec parts, round, then format back
      const num = Number(`${intFormatted.replace(/\./g, "")}.${rawDecimals || "0"}`)
      const rounded = num.toFixed(decimals)
      const [i, d] = rounded.split(".")
      const iFormatted = idThousands(Number(i))
      return decimals > 0 ? `${iFormatted},${d}` : iFormatted
    }
  }

  let display = ""

  // Case 1: comma present → Indonesian decimal
  if (str.includes(",")) {
    const only = str.replace(/[^0-9,]/g, "")
    const raw = keepFirstCommaOnly(only)
    const [intPart, decPart] = raw.split(",")
    const intFormatted = idThousands(Number(intPart || "0"))
    display = applyDecimals(intFormatted, decPart)
  }

  // Case 2: dot(s) present and no comma → detect thousands vs decimal
  else if (str.includes(".")) {
    const s = str.replace(/\s+/g, "")
    const thousandPattern = /^\d{1,3}(\.\d{3})+$/ // valid thousand groups only
    if (thousandPattern.test(s)) {
      const digits = s.replace(/\./g, "")
      const intFormatted = idThousands(Number(digits || "0"))
      display = applyDecimals(intFormatted)
    } else {
      // treat first "." as decimal point
      const [left, right = ""] = s.split(".", 2)
      const intDigits = (left || "").replace(/\D/g, "")
      const decDigits = (right || "").replace(/\D/g, "")
      const intFormatted = idThousands(Number(intDigits || "0"))
      display = applyDecimals(intFormatted, decDigits)
    }
  }

  // Case 3: plain integer (digits only)
  else {
    const digitsOnly = str.replace(/\D/g, "")
    const intFormatted = idThousands(Number(digitsOnly || "0"))
    display = applyDecimals(intFormatted)
  }

  return negative ? `-${display}` : display
}

/* ────────────────────────────────────────────────────────────────────────────
   parseIdr
──────────────────────────────────────────────────────────────────────────── */

/**
 * Parse an Indonesian-formatted price string.
 *
 * Rules:
 * - Accepts stray characters like "Rp", spaces, letters (ignored).
 * - "." is treated as thousands and removed.
 * - "," is treated as decimal and converted to ".".
 * - The first comma is the decimal marker; any additional commas are ignored.
 * - A leading minus "-" is preserved.
 * - Returns `null` for invalid/empty input or non-finite numbers.
 *
 * Precision:
 * - Default returns JS `number` (subject to IEEE-754 precision limits).
 * - For exact arithmetic with huge values, use `{ mode: "fixed" }` to get a `FixedIdr`.
 *
 * @param str number|string to parse (e.g., "1.050,32", "Rp 1.000", "-1.500")
 * @param opts { mode?: "number" | "fixed" }  // default "number"
 * @returns number | FixedIdr | null
 *
 * @example
 * parseIdr("1.050,32")                    // 1050.32
 * parseIdr("Rp 1.234")                    // 1234
 * parseIdr("-  1.500")                    // -1500
 * parseIdr("1.234.567,89", { mode: "fixed" }) // { sign:1, units: 123456789n, scale: 2, ... }
 */
export function parseIdr(
  str: string | number | null | undefined,
  opts: ParseIdrOptions = {}
): number | FixedIdr | null {
  const mode = opts.mode ?? "number"
  if (str === null || str === undefined || str === "") return null

  let s = String(str).trim()
  const isNegative = s.startsWith("-")
  if (isNegative) s = s.slice(1)

  // keep only digits/dot/comma
  s = s.replace(/[^0-9.,]/g, "")
  if (!s) return null

  // keep first comma as decimal; drop the rest
  s = keepFirstCommaOnly(s)

  // normalize Indonesian → canonical "int.dec": remove thousands; replace "," with "."
  const normalized = s.replace(/\./g, "").replace(",", ".")
  if (normalized === "" || normalized === ".") return null

  const [intRaw, decRaw = ""] = normalized.split(".")
  const intDigits = intRaw.replace(/\D/g, "") || "0"
  const decDigits = decRaw.replace(/\D/g, "")

  if (mode === "fixed") {
    return makeFixed(isNegative ? -1 : 1, intDigits, decDigits)
  } else {
    const num = Number((isNegative ? "-" : "") + intDigits + (decDigits ? "." + decDigits : ""))
    return Number.isFinite(num) ? num : null
  }
}
