# idr-formatting

Tiny helpers to format and parse Indonesian-style prices (IDR).

- Thousands separator: `.`
- Decimal separator: `,`

## Install
```sh
npm i idr-formatting
# or
yarn add idr-formatting
# or
pnpm add idr-formatting
```

## Usage

### ESM / modern bundlers (Vite, webpack, esbuild)

```js
const { formatIdr, parseIdr } = require("idr-formatting")
```

### CommonJS
```js
const { formatIdr, parseIdr } = require("idr-formatting")
```

#### Example
```js
formatIdr("1000")     // "1.000"
formatIdr("1050")     // "1.050"
formatIdr("1050,32")  // "1.050,32"
formatIdr(1050.32)    // "1.050,32"

parseIdr("1.050,32")  // 1050.32
parseIdr("1.000")     // 1000
```