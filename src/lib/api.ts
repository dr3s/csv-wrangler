/**
 * Wrangle can be configured programmatically or from a file
 *
 * ```typescript
 *
 * import * as w from 'csv-wrangler';
 * const mapping: w.WranglerConfig = {
 *   mappings: [
 *        {
 *           name: 'OrderID',
 *           formula: "integer('Order Number')"
 *         },
 *         {
 *           name: 'OrderDate',
 *           formula: "new Date(value('Year'),value('Month'),value('Day'))"
 *         },
 *         {
 *           name: 'ProductID',
 *           formula: "value('Product Number')"
 *         },
 *         {
 *           name: 'ProductName',
 *           formula: "titleCase(value('Product Name'))"
 *         },
 *         {
 *           name: 'Quantity',
 *           formula: "float('Count')"
 *        },
 *        {
 *          name: 'Unit',
 *           formula: "'kg'"
 *         }
 *       ]
 *     };
 * ```
 */
export interface WranglerConfig {
  /**
   * The [[Mapping]]s to be applied in this transformation.  They are applied in the order that they are defined.
   */
  readonly mappings: Mapping[];
}

/**
 * Each [[Mapping]] defines an output field [[name]] and [[formula]] to calculate it.
 *
 *
 */
export interface Mapping {
  /**
   * The [[name]] of the field in the output object
   */
  readonly name: string;
  /**
   * The [[formula]] is a simple Javascript expression used to calculate the output field value.
   * Expressions are limited in scope and can only use basic datatypes, the defined mapping functions,
   * and other globals.
   *
   * ```json
   *  {
   *  "name": "OrderDate",
   *  "formula": "new Date(value('Year'),value('Month'),value('Day'))"
   *  }
   * ```
   */
  readonly formula: string;
}

/**
 * A [[MappingError]] will be created for the first error during application of the mapping
 *
 */
export interface MappingError extends Error {
  /**
   * The row which triggered the error
   */
  readonly row: any;
}

/**
 * These functions are available in scope when writing [[Mapping]] formulas.  They provide an easier way of performing common conversions.
 * All functions that take a row as the first argument have been curried, so that it is provided for you.
 */
export namespace Dsl {
  /**
   * Convert a string to Title Case. ex: "a green apple" => "A Green Apple"
   *
   * @param  str  string to be title cased
   * @returns title cased string
   */
  export function titleCase(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => {
        return word.replace(word[0], word[0].toUpperCase());
      })
      .join(' ');
  }

  /**
   * Use the value as is from the source row. ex: "value('Product Number')" => "P-0001"
   *
   * @param  name  of column in source row to map
   * @returns value of source column
   */
  export function value(row: any, name: string): any {
    return row[name];
  }
  /**
   * Map the source column as an integer. ex: "integer('Order Number')" => 1000
   *
   * @param  name  of column in source row to map
   * @returns value of source column as an integer
   */
  export function integer(row: any, name: string): number {
    return Math.floor(float(row, name));
  }
  /**
   * Map the source column as a float. ex: "float('Longitude')" => -84.1414334
   *
   *
   * @param  name  of column in source row to map
   * @returns value of source column as a 64bit float
   */
  export function float(row: any, name: string): number {
    const s = row[name];
    if (s === undefined) {
      throw Error(`${name} is undefined`);
    }
    const val = Number(s.replace(/,/g, ''));
    if (val === undefined || Number.isNaN(val)) {
      throw Error(`${name} is not a number`);
    }
    return val;
  }
}
