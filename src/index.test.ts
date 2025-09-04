// src/index.test.ts
import { describe, it, expect } from "vitest"
import { formatIdr, parseIdr, type FixedIdr } from "./index"

describe("formatIdr — basics", () => {
  it("formats integers with thousands (string & number)", () => {
    expect(formatIdr("1000")).toBe("1.000")
    expect(formatIdr("1050")).toBe("1.050")
    expect(formatIdr(1000000)).toBe("1.000.000")
    expect(formatIdr("0000")).toBe("0")
    expect(formatIdr("000123")).toBe("123")
  })

  it("preserves comma decimals; ignores extra commas", () => {
    expect(formatIdr("1050,32")).toBe("1.050,32")
    // keep the *first* comma as decimal, strip the rest
    expect(formatIdr("1,234,56")).toBe("1,23456")
  })

  it("dot vs comma heuristic", () => {
    // thousands pattern
    expect(formatIdr("1.500")).toBe("1.500")
    expect(formatIdr("12.345.678")).toBe("12.345.678")
    // dot as decimal if not valid thousands grouping
    expect(formatIdr("12.34")).toBe("12,34")
    expect(formatIdr("1500.55")).toBe("1.500,55")
  })

  it("minus sign preserved", () => {
    expect(formatIdr("-1500")).toBe("-1.500")
    expect(formatIdr("-1050,5")).toBe("-1.050,5")
    expect(formatIdr("-1500.55")).toBe("-1.500,55")
  })

  it("strips non-formatting characters safely", () => {
    expect(formatIdr("Rp 1a0b50,32")).toBe("1.050,32")
    expect(formatIdr("  10 00 0  ")).toBe("10.000")
  })

  it("handles nullish/empty", () => {
    expect(formatIdr("")).toBe("")
    expect(formatIdr(null as any)).toBe("")
    expect(formatIdr(undefined as any)).toBe("")
  })
})

describe("formatIdr — options (decimals & padZeros)", () => {
  it("respects decimals: 'auto' (default)", () => {
    expect(formatIdr("1050,5")).toBe("1.050,5") // preserved
    expect(formatIdr("1050,5", { decimals: "auto", padZeros: true })).toBe("1.050,50")
  })

  it("respects decimals: fixed number with BigInt rounding", () => {
    expect(formatIdr("1050,5678", { decimals: 2 })).toBe("1.050,57") // rounded
    expect(formatIdr("1000", { decimals: 2 })).toBe("1.000,00")      // padded
    expect(formatIdr(1000, { decimals: 0 })).toBe("1.000")           // integer only
  })

  it("rounds correctly across integer carry (9,99 → 10,0 with decimals=1)", () => {
    expect(formatIdr("9,99", { decimals: 1 })).toBe("10,0")
    expect(formatIdr("999,99", { decimals: 1 })).toBe("1.000,0")
    expect(formatIdr("999.99", { decimals: 1 })).toBe("1.000,0")
  })
})

describe("parseIdr — number mode", () => {
  it("parses integers and decimals", () => {
    expect(parseIdr("1.000")).toBe(1000)
    expect(parseIdr("1.050")).toBe(1050)
    expect(parseIdr("1.050,32")).toBe(1050.32)
    expect(parseIdr("1.234.567,89")).toBe(1234567.89)
  })

  it("parses thousands without decimals", () => {
    expect(parseIdr("1.500")).toBe(1500)
    expect(parseIdr("12.345.678")).toBe(12345678)
  })

  it("ignores junk", () => {
    expect(parseIdr("Rp 1.234,56")).toBe(1234.56)
    expect(parseIdr("  10.000  ")).toBe(10000)
  })

  it("preserves minus sign", () => {
    expect(parseIdr("-1.050,5")).toBe(-1050.5)
    expect(parseIdr("-  Rp  1.000")).toBe(-1000)
  })

  it("invalid → null", () => {
    expect(parseIdr("abc")).toBeNull()
    expect(parseIdr(",," as any)).toBeNull()
    expect(parseIdr("." as any)).toBeNull()
    expect(parseIdr("" as any)).toBeNull()
    expect(parseIdr(null as any)).toBeNull()
    expect(parseIdr(undefined as any)).toBeNull()
    expect(parseIdr("-" as any)).toBeNull()
  })
})

describe("parseIdr — fixed mode (BigInt exact)", () => {
  it("handles huge magnitudes exactly", () => {
    const fx = parseIdr("9.223.372.036.854.775.807,99", { mode: "fixed" }) as FixedIdr
    expect(fx.sign).toBe(1)
    expect(fx.scale).toBe(2)
    expect(fx.units.toString()).toBe("922337203685477580799") // exact (…807.99 → …580799 units)
    expect(fx.toString()).toBe("9223372036854775807.99")
    // Note: toNumber() may lose precision but must be finite
    expect(Number.isFinite(fx.toNumber())).toBe(true)
  })

  it("handles negatives, zero scale, leading zeros", () => {
    const fx = parseIdr("-000123,040", { mode: "fixed" }) as FixedIdr
    expect(fx.sign).toBe(-1)
    expect(fx.scale).toBe(3)
    expect(fx.units.toString()).toBe("123040")
    expect(fx.toString()).toBe("-123.040")
  })
})

describe("formatIdr — accepts FixedIdr input", () => {
  it("formats FixedIdr exactly (no precision loss)", () => {
    const fx = parseIdr("1.234.567,8901", { mode: "fixed" }) as FixedIdr
    expect(formatIdr(fx)).toBe("1.234.567,8901")
    const fxNeg = parseIdr("-1.234.567,5", { mode: "fixed" }) as FixedIdr
    expect(formatIdr(fxNeg)).toBe("-1.234.567,5")
  })

  it("respects options when given FixedIdr", () => {
    const fx = parseIdr("1000", { mode: "fixed" }) as FixedIdr
    expect(formatIdr(fx, { decimals: 2 })).toBe("1.000,00")
  })
})

describe("round-trips", () => {
  it("format -> parse -> format (strings, numbers, negatives)", () => {
    const samples: any[] = [
      "0", "12", "1000", "1050", "1234567",
      "1050,32", "1.234,5", "1.500", "12.34",
      0, 12, 1000, 1050, 1234567, 1050.32,
      "-1.500", "-1.050,5", -1500, -1050.5
    ]
    for (const s of samples) {
      const f1 = formatIdr(s)
      const p1 = parseIdr(f1)!
      const f2 = formatIdr(p1)
      expect(f2).toBe(f1)
    }
  })

  it("parse -> format -> parse preserves numeric value (tolerant to float precision)", () => {
    const samples = ["1.050,32", "1.234.567,89", "12,34", "1.500", "1500.55", "-1.050,5"]
    for (const s of samples) {
      const p1 = parseIdr(s)!
      const f1 = formatIdr(p1)
      const p2 = parseIdr(f1)!
      expect(p2).toBeCloseTo(p1, 12)
    }
  })

  it("fixed -> format -> fixed is stable & exact", () => {
    const s = "1.234.567,8901"
    const fx1 = parseIdr(s, { mode: "fixed" }) as FixedIdr
    const f = formatIdr(fx1) // "1.234.567,8901"
    const fx2 = parseIdr(f, { mode: "fixed" }) as FixedIdr
    expect(f).toBe("1.234.567,8901")
    expect(fx2.sign).toBe(fx1.sign)
    expect(fx2.scale).toBe(fx1.scale)
    expect(fx2.units.toString()).toBe(fx1.units.toString())
  })
})
