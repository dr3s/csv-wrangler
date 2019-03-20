import parse from 'csv-parse';
import fs from 'fs';
import os from 'os';
import stream, { Readable } from 'stream';
import util from 'util';
import * as api from './api';
const transform = require('stream-transform');
const pipeline = util.promisify(stream.pipeline);

/**
 * Wrangle a CSV file into a new line delimited JSON file.
 *
 * ### Example
 * ```js
 * import * as w from 'csv-wrangler';
 * w.wrangleFile(
 *   path.resolve(__dirname, 'example.csv'),
 *   path.resolve(__dirname, 'example.json'),
 *   row => {
 *     const mutableRow = { ...row };
 *     mutableRow['OrderID'] = row['Order Number'];
 *     delete mutableRow['Order Number'];
 *     return mutableRow;
 *   }
 * ).catch(err => {
 *   console.log(err.message);
 * });
 * ```
 *
 * @param  sourcePath  absolute path to a source CSV file
 * @param  targetPath  absolute path to a file to be written with newline delimited JSON objects
 * @param  transformOptions  can be supplied as one of the following: absolute path to config file, a [[WranglerConfig]] object, or a function that takes a row object and returns a new object
 *
 * @returns       a Promise when the target file is completely written
 */
export async function wrangleFileAsync(
  sourcePath: string,
  targetPath: string,
  transformOptions: string | api.WranglerConfig | ((row: object) => object)
): Promise<void> {
  const sourceCsv = fs.createReadStream(sourcePath);

  const output = fs.createWriteStream(targetPath);

  // use new line separators in the output file
  const jsonTransform = transform(data => {
    return JSON.stringify(data) + os.EOL;
  });

  return pipeline(wrangle(sourceCsv, transformOptions), jsonTransform, output);
}

/**
 * Wrangle a CSV file stream into a stream of Objects.
 *
 * Files should be provided as a [[Readable]] stream of comma separated values with newline delimters.
 * Configuration of the transformation can be provided programmatically or via a file.
 *
 * The result of this function is another [[Readable]] streams that supports the typical node streams events
 * plus a 'skip' event that can be used to get information about skipped rows and the errors that caused them.
 *
 * The 'error' event is terminal.
 *
 * ### Example
 * ```typescript
 * import * as w from 'csv-wrangler';
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
 * w.wrangle(
 *   sourceCsv,
 *   mapping
 * )
 * .on('skip', (err) => console.error(err)) // log dropped rows
 * .pipe(outputStream) // pipe it to a writable stream that takes objects
 * .on('finish', () => doSomething()); // the writable stream has been flushed
 * ```
 *
 * ### Example of transforming with an arbitrary function
 * ```js
 * import * as w from 'csv-wrangler';
 *
 * const sourcePath = path.resolve(__dirname, 'example.csv');
 * const sourceCsv = fs.createReadStream(sourcePath);
 *
 * w.wrangle(
 *  sourceCsv,
 *   row => {
 *     const mutableRow = { ...row };
 *     mutableRow['OrderID'] = row['Order Number'];
 *     delete mutableRow['Order Number'];
 *     return mutableRow;
 *   }
 * )
 * .on('skip', (err) => console.error(err)) // log dropped rows
 * .pipe(outputStream) // pipe it to a writable stream that takes objects
 * .on('finish', () => doSomething()); // the writable stream has been flushed
 * ```
 *
 * @param  sourceCsv  [[Readable]] stream of a CSV file
 * @param  transformOptions  can be supplied as one of the following: absolute path to config file, a [[WranglerConfig]] object, or a function that takes a row object and returns a new object
 *
 *
 * @returns       a Readable stream of objects defined by the [[WranglerConfig]] or transform function
 */
export function wrangle(
  sourceCsv: Readable,
  transformOptions: string | api.WranglerConfig | ((row: object) => object)
): Readable {
  const config: api.WranglerConfig | ((row: object) => object) =
    typeof transformOptions === 'string'
      ? JSON.parse(fs.readFileSync(transformOptions, 'utf8'))
      : transformOptions;

  const transformer =
    typeof transformOptions === 'function'
      ? (config as ((row: object) => object))
      : buildTransformer(config as api.WranglerConfig);

  return _wrangle(sourceCsv, transformer);
}

/**
 * Build the user's transformation function based upon the [[WranglerConfig]].
 *
 */
function buildTransformer(config: api.WranglerConfig): (row: object) => object {
  return row => {
    const mutableTarget = {};
    // iterate the mappings build a function to update the named target field
    config.mappings.forEach(mapping => {
      const context = new api.Dsl(row);

      // consruct the function using the context as arguments
      const mapFn = Function(
        ...Object.keys(context),
        '"use strict"; return (' + mapping.formula + ');'
      );
      mutableTarget[mapping.name] = mapFn.call(
        context,
        ...Object.values(context)
      );
    });
    return mutableTarget;
  };
}

/**
 * Wrangle a CSV file stream into a stream of Objects.
 *
 */
function _wrangle(
  sourceCsv: Readable,
  transformer: (row: object) => object
): Readable {
  const parser = parse({
    columns: true,
    skip_lines_with_error: true,
    relax_column_count: false
  });

  // log and collect parsing errors.  These unfortunately don't indicate which row of data failed.
  parser.on('skip', err => {
    console.error(`skipped record due to: ${err.message}`);
    outputStream.emit('skip', err);
  });

  // wrap the user's transformation function in a duplex stream
  const userTransform = transform((row: object) => {
    try {
      return transformer(row);
    } catch (mutableErr) {
      mutableErr.row = row;
      outputStream.emit('skip', mutableErr);
      return undefined; // skip this row in the output
    }
  });

  const outputStream = sourceCsv.pipe(parser).pipe(userTransform);

  return outputStream;
}
