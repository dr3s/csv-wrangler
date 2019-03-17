import parse from 'csv-parse';
import fs from 'fs';
import os from 'os';
import stream, { Readable } from 'stream';
import util from 'util';
import * as dsl from './dsl';
const transform = require('stream-transform');
const pipeline = util.promisify(stream.pipeline);

/**
 * Wrangle a CSV file into a new line delimited JSON file
 *
 *
 * ### Example
 * ```js
 * import * as w from 'wrangler';
 * w.wrangleFile(
 *   path.resolve(__dirname, 'example.csv'),
 *   path.resolve(__dirname, 'example.json'),
 *   row => {
 *     const mutableRow = { ...row };
 *     mutableRow.OrderID = row['Order Number'];
 *     delete mutableRow['Order Number'];
 *     return mutableRow;
 *   }
 * ).catch(err => {
 *   console.log(err.message);
 * });
 * ```
 *
 * @param  sourcePath  absolute path to a source CSV file
 * @param  targetPath  absolute path to a Json file to be written
 * @param  transformer  function that accepts a single object argument and returns an object that it has transformed
 *
 * @returns       a Promise when the target file is completely written
 */
export async function wrangleFileAsync(
  sourcePath: string,
  targetPath: string,
  transformer: (row: any) => any
): Promise<void> {
  const sourceCsv = fs.createReadStream(sourcePath);

  const output = fs.createWriteStream(targetPath);

  const jsonTransform = transform(data => {
    return JSON.stringify(data) + os.EOL;
  });

  return pipeline(wrangle(sourceCsv, transformer), jsonTransform, output);
}

/**
 * Wrangle a CSV file into a stream of Objects
 *
 *
 * ### Example
 * ```typescript
 * import * as w from 'wrangler';
 *
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
 *
 * const sourcePath = path.resolve(__dirname, 'example.csv');
 * const sourceCsv = fs.createReadStream(sourcePath);
 * w.wrangleMapping(
 *   sourceCsv,
 *   mapping
 * ).pipe(outputStream);
 * ```
 *
 * @param  sourceCsv  [[Readable]] stream of a CSV file
 * @param  wrangleConfig  function that accepts a single object argument and returns an object that it has transformed
 *
 * @returns       a Readable stream of objects defined by the [[WranglerConfig]]
 */
export function wrangleMapping(
  sourceCsv: Readable,
  wrangleConfig: dsl.WranglerConfig
): Readable {
  const transformer = row => {
    const mutableTarget = {};

    wrangleConfig.mappings.forEach(mapping => {
      const context = {
        m: mapping,
        source: row,
        dsl,
        value: name => dsl.value(row, name),
        integer: name => dsl.integer(row, name),
        float: name => dsl.float(row, name),
        titleCase: dsl.titleCase
      };

      const mapFn = Function(
        'source',
        'value',
        'integer',
        'float',
        'titleCase',
        '"use strict"; return (' + mapping.formula + ');'
      );
      mutableTarget[mapping.name] = mapFn.call(
        context,
        context.source,
        context.value,
        context.integer,
        context.float,
        context.titleCase
      );
    });
    return mutableTarget;
  };

  return wrangle(sourceCsv, transformer);
}

/**
 * Wrangle a CSV file stream into a stream of objects
 *
 *
 * ### Example
 * ```js
 * import * as w from 'wrangler';
 * w.wrangleFile(
 *   path.resolve(__dirname, 'example.csv'),
 *   path.resolve(__dirname, 'example.json'),
 *   row => {
 *     const mutableRow = { ...row };
 *     mutableRow.OrderID = row['Order Number'];
 *     delete mutableRow['Order Number'];
 *     return mutableRow;
 *   }
 * ).catch(err => {
 *   console.log(err.message);
 * });
 * ```
 *
 * @param  sourceCsv  [[Readable]] stream of a CSV file
 * @param  transformer  function that accepts a single object argument and returns an object that it has transformed
 *
 * @returns       a Readable stream of objects defined by the [[WranglerConfig]]
 */
export function wrangle(
  sourceCsv: Readable,
  transformer: (row) => any
): Readable {
  const parser = parse({
    columns: true,
    skip_lines_with_error: true,
    relax_column_count: true
  });

  const errors = new Array<dsl.MappingError>();

  parser.on('skip', err => {
    console.error(`skipped record due to: ${err.message}`);
    errors.push(new dsl.MappingError({ err }));
  });

  // Catch terminal error
  parser.on('error', err => {
    console.error(err.message, err);
    throw err;
  });

  const userTransform = transform((row: any) => {
    try {
      return transformer(row);
    } catch (err) {
      console.log(err.message);
      console.debug(row);
      console.debug(err);
      errors.push(new dsl.MappingError({ err, row }));
      return;
    }
  });

  return sourceCsv.pipe(parser).pipe(userTransform);
}
