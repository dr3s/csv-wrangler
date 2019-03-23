/**
 * Wrangle can be configured programmatically or from a file.
 *
 * The config contains a set of mappings that set fields in a target object in the order that they are defined.
 * Only the last mapping for a field will be in the result.  The formulas are simple javascript expressions that
 * can reference global types and functions, as well as the functions defined in the DSL class that are applied to
 * the row in context.
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
 * These functions are available in scope when writing [[Mapping]] formulas.
 * They provide an easier way of performing common conversions.
 *
 */
export class Dsl {
  public readonly row: any;

  constructor(row: any) {
    this.row = row;
  }

  /**
   * Use the value as is from the source row. ex: "value('Product Number')" => "P-0001"
   *
   * @param  name  of column in source row to map
   * @returns value of source column
   */
  public readonly value = (name: string, required: boolean = false): any => {
    const s = this.row[name];
    if (required && (s === undefined || s === null)) {
      throw Error(`${name} is not in the source row`);
    }
    return s;
  };

  /**
   * Convert a string to Title Case. ex: "a green apple" => "A Green Apple"
   *
   * @param  str  string to be title cased
   * @returns title cased string
   */
  public readonly titleCase = (str: string): string => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => {
        return word.replace(word[0], word[0].toUpperCase());
      })
      .join(' ');
  };
  /**
   * Map the source column as an integer. ex: "integer('Order Number')" => 1000
   *
   * @param  name  of column in source row to map
   * @returns value of source column as an integer
   */
  public readonly integer = (
    name: string,
    required: boolean = false
  ): number => {
    return Math.floor(this.float(name, required));
  };
  /**
   * Map the source column as a float. ex: "float('Longitude')" => -84.1414334
   *
   *
   * @param  name  of column in source row to map
   * @returns value of source column as a 64bit float
   */
  public readonly float = (name: string, required: boolean = false): number => {
    const s = this.value(name, required);
    const val = Number(`${s}`.replace(/,/g, '')); // force to string to allow regex
    if (val === undefined || Number.isNaN(val)) {
      throw Error(`${name} is not a number`);
    }
    return val;
  };
}
