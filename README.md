![CI](https://github.com/netng/idr-formatting/actions/workflows/ci.yml/badge.svg)

# idr-formatting

Tiny helpers to **format** and **parse** Indonesian-style prices (IDR).

- Thousands separator: `.`
- Decimal separator: `,`
- Minus sign is preserved (e.g. `-1050.5 → -1.050,5`)
- Optional **exact** parsing with `BigInt` (no floating-point error)

---

### Live demo
👉 https://netng.github.io/idr-formatting-example/

---

## Features

- **formatIdr(value, options?)**
  - Smart dot/comma heuristics
  - Preserves user decimals by default
  - Optional `decimals` (force fixed digits) & `padZeros`
  - Accepts numbers, strings, or exact `FixedIdr` objects

- **parseIdr(value, options?)**
  - Returns a JS **number** by default
  - Or returns an exact **FixedIdr** (sign + units + scale) with `{ mode: "fixed" }`
  - Ignores stray characters like `Rp` or spaces

- Works in browsers & Node (ESM & CJS)
- Great fit for **Rails (Importmap + Stimulus)**

---

## Install

```sh
npm install idr-formatting
# or
yarn add idr-formatting
# or
pnpm add idr-formatting
```

## Usage
### ESM / modern bundlers (Vite, webpack, esbuild, Node ESM)

```js
import { formatIdr, parseIdr } from "idr-formatting"

formatIdr("1000")        // "1.000"
formatIdr("1050")        // "1.050"
formatIdr("1050,32")     // "1.050,32"
formatIdr(1050.32)       // "1.050,32"

parseIdr("1.050,32")     // 1050.32
parseIdr("1.000")        // 1000
parseIdr("Rp 1.234,56")  // 1234.56
parseIdr(" 10.000 ")     // 10000
```

### CommonJS (Node with `require`)
```js
const { formatIdr, parseIdr } = require("idr-formatting")

formatIdr(1000000)   // "1.000.000"
parseIdr("1.234,56") // 1234.56
```

### Options
`formatIdr(value, options?)`
```js
type FormatIdrOptions = {
  /**
   * "auto" (default): preserve decimals as typed (no rounding)
   * number: force fixed decimals (round/pad as needed)
   */
  decimals?: "auto" | number
  /**
   * If decimals === "auto", pad to at least 2 digits when decimal exists.
   * E.g. "1050,5" -> "1.050,50"
   */
  padZeros?: boolean
}
```

#### Examples:
```js
formatIdr("1050,5")                                   // "1.050,5"
formatIdr("1050,5", { decimals: "auto", padZeros: true }) // "1.050,50"
formatIdr("1050,5678", { decimals: 2 })               // "1.050,57"
formatIdr("1000", { decimals: 2 })                    // "1.000,00"
formatIdr(1000, { decimals: 0 })                      // "1.000"
```

`parseIdr(value, options?)`
```js
type ParseIdrOptions = {
  /** "number" (default) -> number|null; "fixed" -> FixedIdr|null (exact) */
  mode?: "number" | "fixed"
}
```

Exact parsing (no floating errors):
```js
const fx = parseIdr("1.234.567,89", { mode: "fixed" })
// => { sign: 1, units: 123456789n, scale: 2, toNumber(), toString() }
fx.toString() // "1234567.89" (exact)
formatIdr(fx) // "1.234.567,89"
```


| Input (raw)                   | `formatIdr` output       | `parseIdr` output                  |
|--------------------------------|---------------------------|-------------------------------------|
| `"1000"`                       | `"1.000"`                | `1000`                             |
| `"1050"`                       | `"1.050"`                | `1050`                             |
| `"1050,32"`                    | `"1.050,32"`             | `1050.32`                          |
| `1050.32`                      | `"1.050,32"`             | `1050.32`                          |
| `"1.500"`                      | `"1.500"`                | `1500`                             |
| `"1.500,55"`                   | `"1.500,55"`             | `1500.55`                          |
| `"12.34"`                      | `"12,34"`                | `12.34`                            |
| `"-1050.5"`                    | `"-1.050,5"`             | `-1050.5`                          |
| `"Rp 1.234,56"`                | `"1.234,56"`             | `1234.56`                          |
| `" 10.000 "`                   | `"10.000"`               | `10000`                            |
| `""`                           | `""`                     | `null`                             |
| `"abc"`                        | `""`                     | `null`                             |
| `"9.223.372.036.854.775.807"`  | `"9.223.372.036.854.775.807"` | `9223372036854776000` (approx, due to JS Number limits) |
| `"9.223.372.036.854.775.807,99"` with `{ mode: "fixed" }` | `"9.223.372.036.854.775.807,99"` | `{ sign: 1, units: 922337203685477580799n, scale: 2 }` (exact) |

---

### Large number with FixedIdr (exact parsing)

```js
import { parseIdr, formatIdr } from "idr-formatting"

// Normal parse (as Number, precision lost for huge values)
parseIdr("9.223.372.036.854.775.807,99")
// => 9223372036854776000  (approx)

// Exact parse with BigInt-backed FixedIdr
const fx = parseIdr("9.223.372.036.854.775.807,99", { mode: "fixed" })
/*
fx = {
  sign: 1,
  units: 922337203685477580799n,
  scale: 2,
  toNumber: [Function],
  toString: [Function]
}
*/

fx.toString()  // "9223372036854775807.99"  (exact decimal string)
formatIdr(fx)  // "9.223.372.036.854.775.807,99"
```


This way users see both:

- **Regular `Number` mode** (fast, but limited by JS precision).  
- **Fixed mode** (BigInt exact, good for finance & huge numbers).


### Round-trip guarantee
For typical inputs, formatting and parsing are stable:

```js
parseIdr(formatIdr("1050,32"))   // 1050.32
formatIdr(parseIdr("1.050,32"))  // "1.050,32"

parseIdr(formatIdr(-1500))       // -1500
formatIdr(parseIdr("-1.500"))    // "-1.500"
```

- `parseIdr(formatIdr(x)) === x` for most integers and decimals.

- `formatIdr(parseIdr(x)) === x` for valid Indonesian-formatted strings.

- Trailing decimals are preserved as typed (unless you set `decimals: <number>`).

- Non-formatting characters (`Rp`, spaces) are ignored by parseIdr.

### Limitations

- Decimal length preserved by default (no auto-rounding):
`formatIdr("1234,5678") // "1.234,5678"`.

- No auto currency symbol — add `Rp` in your UI.

- Numbers have IEEE-754 limits. For huge/precise values use `{ mode: "fixed" }` to get `FixedIdr` (BigInt-backed).

- Misplaced minus like `"1.000-"` is not recognized; only leading - is preserved.

## Rails (Importmap) + Stimulus

### 1) Pin via CDN
```bash
bin/importmap pin idr-formatting@1.x --from jsdelivr
# or
bin/importmap pin idr-formatting@1.x --from unpkg
```

### 2) Stimulus controller
```js
// app/javascript/controllers/idr_price_controller.js
import { Controller } from "@hotwired/stimulus"
import { formatIdr, parseIdr } from "idr-formatting"

export default class extends Controller {
  static values = { submitRawTo: String }

  connect() {
    this.input = this.element
    this.#ensureHidden()
    this.format()
  }

  format() {
    const cleaned = this.input.value.replace(/[^0-9,]/g, "")
    this.input.value = formatIdr(cleaned)

    const parsed = parseIdr(this.input.value) // Number | null
    if (this.hidden) this.hidden.value = parsed ?? ""
    this.input.setSelectionRange(this.input.value.length, this.input.value.length)
  }

  #ensureHidden() {
    if (!this.hasSubmitRawToValue) return
    if (!this.hidden) {
      const hidden = document.createElement("input")
      hidden.type = "hidden"
      hidden.name = this.submitRawToValue
      this.input.insertAdjacentElement("afterend", hidden)
      this.hidden = hidden
    }
  }
}
```

### 3) ERB snippet
```erb
<input
  type="text"
  name="product[price_display]"
  data-controller="idr-price"
  data-idr-price-submit-raw-to-value="product[price]"
  data-action="input->idr-price#format blur->idr-price#format"
/>
```

- User sees: `1.050,32`
- Server receives (hidden): `1050.32`

> Tip: put Rp outside the input (addon/label) so caret position isn’t affected.


## Test & Coverage
```sh
# run tests + coverage
npm run test

# watch mode
npm run test:watch
```

## Contributing
1. Fork & clone
2. npm i
3. npm run test
4. PRs welcome!

## License
MIT

