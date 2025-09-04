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
export declare function formatIdr(value: string | number | null | undefined): string;
/**
 * Parse Indonesian-formatted price string into a JS number.
 * "1.050,32" -> 1050.32
 * "1.000"    -> 1000
 */
export declare function parseIdr(str: string | number | null | undefined): number | null;
