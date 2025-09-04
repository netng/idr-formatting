// src/index.ts

/** Sign type for fixed-point representation */
export type IdxSign = 1 | -1

/** Exact fixed-point representation backed by BigInt (no floating-point errors) */
export interface FixedIdr {
  /** Sign of the value: 1 or -1 */
  sign: IdxSign
  /** All digits as integer (no decimal point) */
  units: bigint
  /** Number of decimal digits */
  scale: number
  /** Convert to JS Number (may lose precision for very large values) */
  toNumber(): number
  /** Canonical decimal string with "." as decimal separator */
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
   * - number: force exactly that many decimals (round/pad as needed)
   */
  decimals?: "auto" | number
  /**
   * When decimals === "auto", pad decimals with zeros to at least 2 digits.
   * Example: "1050,5" -> "1.050,50"
   */
  padZeros?: boolean
}

/* ───────────────────────────────
   Helpers
────────────────────────────────── */

/** Format integer digits with Indonesian thousands separators (string-based, no Number) */
function groupThousandsStr(digits: string): string {
  digits = digits.replace(/^0+(?!$)/, "") || "0"
  let out = ""
  for (let i = digits.length; i > 0; i -= 3) {
    const start = Math.max(0, i - 3)
    const chunk = digits.slice(start, i)
    out = out ? `${chunk}.${out}` : chunk
  }
  return out
}

/** Apply fixed decimal rounding using BigInt (safe for huge numbers) */
function applyFixedDecimals(intDigits: string, decDigits: string, decimals: number): { i: string; d: string } {
  const cleanI = (intDigits || "0").replace(/\D/g, "") || "0"
  const cleanD = (decDigits || "").replace(/\D/g, "")
  if (decimals <= 0) {
    // round to integer
    const carry = cleanD[0] && +cleanD[0] >= 5 ? 1n : 0n
    const big = BigInt(cleanI) + carry
    return { i: big.toString(), d: "" }
  }
  if (cleanD.length === decimals) return { i: cleanI, d: cleanD }
  if (cleanD.length < decimals) return { i: cleanI, d: cleanD.padEnd(decimals, "0") }

  // cleanD is longer than requested → rounding
  const keep = cleanD.slice(0, decimals)
  const next = cleanD[decimals] ?? "0"
  if (+next < 5) return { i: cleanI, d: keep }

  // increment integer+decimal as a single BigInt
  const inc = (BigInt(cleanI + keep) + 1n).toString().padStart(cleanI.length + keep.length, "0")
  const newI = inc.slice(0, inc.length - decimals) || "0"
  const newD = inc.slice(-decimals)
  return { i: newI, d: newD }
}

/** Keep only the first comma as decimal marker; drop the rest */
function keepFirstCommaOnly(s: string): string {
  const idx = s.indexOf(",")
  if (idx < 0) return s
  return s.slice(0, idx + 1) + s.slice(idx + 1).replace(/,/g, "")
}

/** Fixed-point factory */
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

/* ───────────────────────────────
   formatIdr
────────────────────────────────── */

/**
 * Format a value into Indonesian numeric style:
 * - Thousands: "."
 * - Decimals:  ","
 *
 * Heuristics:
 * - If comma (",") exists → it is the decimal separator.
 * - If dot (".") exists and no comma:
 *    • If pattern looks like thousands (e.g., "1.500", "12.345.678"),
 *      treat "." as thousands.
 *    • Otherwise, first dot is decimal (e.g., "12.34" → "12,34").
 * - Plain digits are formatted with thousand separators.
 * - Minus sign is preserved.
 *
 * Notes:
 * - Non-digit characters are ignored (currency symbol, letters, spaces).
 * - Decimal digits are preserved as typed unless `decimals` option is set.
 */
export function formatIdr(
  value: string | number | FixedIdr | null | undefined,
  options: FormatIdrOptions = {}
): string {
  if (value == null || value === "") return ""
  if (isFixedIdr(value)) return formatIdr(value.toString(), options)

  const { decimals = "auto", padZeros = false } = options

  let str = String(value).trim()
  const negative = str.startsWith("-")
  if (negative) str = str.slice(1)

  function finish(intDigits: string, rawDecimals?: string): string {
    if (decimals === "auto") {
      const iFmt = groupThousandsStr(intDigits)
      if (!rawDecimals) return iFmt
      const dec = padZeros ? rawDecimals.padEnd(2, "0") : rawDecimals
      return `${iFmt},${dec}`
    } else {
      const { i, d } = applyFixedDecimals(intDigits, rawDecimals ?? "", decimals)
      const iFmt = groupThousandsStr(i)
      return decimals > 0 ? `${iFmt},${d}` : iFmt
    }
  }

  let display = ""

  if (str.includes(",")) {
    const only = str.replace(/[^0-9,]/g, "")
    const raw = keepFirstCommaOnly(only)
    const [intPart, decPart = ""] = raw.split(",")
    const intDigits = (intPart || "").replace(/\D/g, "") || "0"
    const decDigits = (decPart || "").replace(/\D/g, "")
    display = finish(intDigits, decDigits)
  } else if (str.includes(".")) {
    const s = str.replace(/\s+/g, "")
    const thousandPattern = /^\d{1,3}(\.\d{3})+$/
    if (thousandPattern.test(s)) {
      const digits = s.replace(/\./g, "") || "0"
      display = finish(digits)
    } else {
      const [left, right = ""] = s.split(".", 2)
      const intDigits = (left || "").replace(/\D/g, "") || "0"
      const decDigits = (right || "").replace(/\D/g, "")
      display = finish(intDigits, decDigits)
    }
  } else {
    const digits = str.replace(/\D/g, "") || "0"
    display = finish(digits)
  }

  return negative ? `-${display}` : display
}

/* ───────────────────────────────
   parseIdr
────────────────────────────────── */

/**
 * Parse an Indonesian-formatted string into a JS number or FixedIdr.
 *
 * Rules:
 * - "." is thousands separator, removed.
 * - "," is decimal, converted to ".".
 * - Only the first comma is kept as decimal.
 * - Minus sign is preserved.
 * - Returns null for invalid input.
 *
 * Modes:
 * - "number" (default): return JS Number (may lose precision).
 * - "fixed": return FixedIdr with BigInt units (exact).
 */
export function parseIdr(
  str: string | number | null | undefined,
  opts: ParseIdrOptions = {}
): number | FixedIdr | null {
  const mode = opts.mode ?? "number"
  if (str == null || str === "") return null

  let s = String(str).trim()
  const isNegative = s.startsWith("-")
  if (isNegative) s = s.slice(1)

  s = s.replace(/[^0-9.,]/g, "")
  if (!s) return null

  s = keepFirstCommaOnly(s)

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
