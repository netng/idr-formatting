import { formatIdr, parseIdr } from "./index"

// ---------- formatIdr ----------
describe("formatIdr", () => {
  it("formats integers with thousand separators", () => {
    expect(formatIdr("1000")).toBe("1.000")
    expect(formatIdr("1050")).toBe("1.050")
    expect(formatIdr(1000000)).toBe("1.000.000")
  })

  it("preserves user-entered decimals using comma", () => {
    expect(formatIdr("1050,32")).toBe("1.050,32")
    expect(formatIdr("1234567,8")).toBe("1.234.567,8")
    // current util does *not* limit decimals length — it preserves what user typed
    expect(formatIdr("1234,5678")).toBe("1.234,5678")
  })

  it("strips non-digit characters except comma", () => {
    expect(formatIdr("1a0b50,32")).toBe("1.050,32")   // letters removed
    expect(formatIdr("Rp 1.234,56")).toBe("1.234,56") // symbol & dots cleaned
  })

  it("handles empty and nullish input", () => {
    expect(formatIdr("")).toBe("")
    expect(formatIdr(null as unknown as string)).toBe("")
    expect(formatIdr(undefined as unknown as string)).toBe("")
  })

  it("handles leading zeros", () => {
    expect(formatIdr("0000")).toBe("0")
    expect(formatIdr("000123")).toBe("123")
    expect(formatIdr("000123,40")).toBe("123,40")
  })
})

// ---------- parseIdr ----------
describe("parseIdr", () => {
  it("parses Indonesian-formatted strings to numbers", () => {
    expect(parseIdr("1.000")).toBe(1000)
    expect(parseIdr("1.050")).toBe(1050)
    expect(parseIdr("1.050,32")).toBe(1050.32)
    expect(parseIdr("1.234.567,89")).toBe(1234567.89)
  })

  it("ignores non-formatting characters", () => {
    expect(parseIdr("Rp 1.234,56")).toBe(1234.56)
    expect(parseIdr("  10.000  ")).toBe(10000)
  })

  it("returns null on invalid input", () => {
    expect(parseIdr("abc")).toBeNull()
    expect(parseIdr(",,," as unknown as string)).toBeNull()
    expect(parseIdr("")).toBeNull()
    expect(parseIdr(null as unknown as string)).toBeNull()
  })

  it("round-trip with formatIdr for common inputs", () => {
    const samples = ["0", "12", "1000", "1050", "1234567", "1050,32", "1.234,5"]
    for (const s of samples) {
      const formatted = formatIdr(s)
      const parsed = parseIdr(formatted)
      const reparsed = parseIdr(formatIdr(parsed ?? ""))
      expect(parsed).toBe(reparsed)
    }
  })
})
