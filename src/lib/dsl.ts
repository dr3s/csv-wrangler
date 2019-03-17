/**
 * Wrangle can be configured programmatically or from a file
 *
 * ```typescript
 * // Initialize config
 * const config = new WranglerConfig();
 * ```
 */
export class WranglerConfig {
  /**
   * The [[Mapping]]s to be applied in this transformation.  They are applied in the order that they are defined.
   */
  public readonly mappings: Mapping[];
}

/**
 * Each [[Mapping]] defines an output field [[name]] and [[formula]] to calculate it.
 *
 *
 */
export class Mapping {
  /**
   * The [[name]] of the field in the output object
   */
  public readonly name: string;
  /**
   * The [[formula]] is a simple Javascript expression used to calculate the output field value.
   * Expressions are limited in scope and can only use basic datatypes, the defined mapping functions,
   * and other globals.
   *
   */
  public readonly formula: string;
}

export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      return word.replace(word[0], word[0].toUpperCase());
    })
    .join(' ');
}

export function value(row: any, name: string): string {
  return row[name];
}

export function integer(row: any, name: string): number {
  return Math.floor(row[name]);
}

export function float(row: any, name: string): number {
  return Number.parseFloat(row[name]);
}
