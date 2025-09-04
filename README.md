# idr-formatting

Tiny helpers to format and parse Indonesian-style prices (IDR).

- Thousands separator: `.`
- Decimal separator: `,`

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


## Example usage for Ruby on Rails developer (importmap + stimulus)

### 1) Pin the package via CDN

Use jsDelivr (or unpkg). Example for version `1.0.1`:

```bash
bin/importmap pin idr-formatting@1.0.1 --from jsdelivr
# or:
# bin/importmap pin idr-formatting@1.0.1 --from unpkg
```

This will add the mapping to config/importmap.rb, so you can import it in the browser without a bundler.

### 2) Stimulus controller
`app/javascript/controllers/idr_price_controller.js`:

```js
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
    // allow only digits + comma while typing
    const cleaned = this.input.value.replace(/[^0-9,]/g, "")
    this.input.value = formatIdr(cleaned)

    const parsed = parseIdr(this.input.value) // Number | null
    if (this.hidden) this.hidden.value = parsed ?? ""

    // put caret at the end (simple & stable UX)
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

### 3) Usage in a Rails view (ERB)
```erb

<input
  type="text"
  name="product[price_display]"
  data-controller="idr-price"
  data-idr-price-submit-raw-to-value="product[price]"  <!-- hidden field sent to server -->
  data-action="input->idr-price#format blur->idr-price#format"
/>
```
- The user sees: 1.050,32
- The server receives (hidden input): 1050.32

```bash
Tip: Show the currency symbol (Rp) outside the input (e.g., as a label or addon) instead of inside the value, so the caret position isn’t affected.
```

```erb
<div class="input-group">
  <span class="input-group-text">Rp</span>
  <!-- the input above -->
</div>
```

### 4) (Optional) Self-host without a CDN

If you don’t want to rely on a CDN:

1. Build this package (npm run build) in your package repo, then copy dist/index.mjs into your Rails app:

```bash
app/javascript/vendor/idr-formatting/index.mjs
```

2. Pin it locally:
```rb
# config/importmap.rb
pin_all_from "app/javascript/vendor/idr-formatting", under: "idr-formatting"
# or:
# pin "idr-formatting", to: "vendor/idr-formatting/index.mjs"
```

3. Import it as usual:
```js
import { formatIdr, parseIdr } from "idr-formatting"
```

