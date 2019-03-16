import parse from 'csv-parse';
import fs from 'fs';
import os from 'os';
import stream, { Readable } from 'stream';
import util from 'util';
const transform = require('stream-transform');
const pipeline = util.promisify(stream.pipeline);

/**
 * Wrangle a CSV file into a new line delimited JSON file
 *
 * @returns       a Promise
 */
export async function wrangleFile(
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

export class Transform {
  mappings: Mapping[]
}

export class Mapping {
  name: string
  formula: string
}

export function wrangleMapping(
  sourceCsv: Readable,
  transform: Transform
): Readable {
  const transformer = (row) => {
    const target = {};

    const context = {
      row: row
    }
    
    transform.mappings.forEach(mapping => {

      const mapFn = () => { 
        'use strict';
        return eval(mapping.formula); 
      };
        
      target[mapping.name] = mapFn.call(context);
    });
    return target;
  }

  return wrangle(sourceCsv, transformer);
}

export function wrangle<INPUT, OUTPUT>(
  sourceCsv: Readable,
  transformer: (row: INPUT) => OUTPUT
): Readable {
  const parser = parse({
    columns: true,
    delimiter: ','
  });

  // Catch any error
  parser.on('error', err => {
    console.error(err.message);
  });

  const userTransform = transform((row: any) => {
    try {
      return transformer(row);
    } catch (err) {
      console.error(err.message);
      return {};
    }
  });

  return sourceCsv.pipe(parser).pipe(userTransform);
}
