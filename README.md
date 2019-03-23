# csv-wrangler

mini-wrangler for csv files

## Getting Started

* Install Node >= 8.9
* npm run prepare-release
* npm pack
* npm i -g csv-wrangler-{version}.tgz
* Create a new project and add csv-wrangler as dependency
* Check out the API documentation starting with the [wrangle function](globals.html#wrangle])

## Architecture Overview

I chose Typescript for this project because of its ease of use with string manipulation tasks.  I utilized an existing library for csv parsing and for building function based duplex streams.

Node streams module is very suited for processing large amounts of data without retaining it all in memory but it is single-threaded.   

The wrangle funtions works by piping the caller's input stream first through a parser, then transformation functions built from the configuration DSL.

The API provided by Node streams makes for a convenient and familiar API for users of the library.

The configuration DSL relies on javascript formulas with a few convenience functions executed in the context of the row being transformed.

#### Assumptions and Simplifications
* Data doesn't need to be processed in parallel and can be done sufficiently fast single-threaded.
* All the input could be parsed simply as a string, so that it could be used in the transformation function however needed.  This means evaluation of input format rules are combined with transformation execution.
* It's ok to evaluate user javascript in a limited scope because the library would be used in the callers VM and not a shared server context.
* Only one mapping per output target field.
* To keep dependencies down, big decimals are not directly implemented but instead are just treated as strings.

#### Possible Improvements
* More tests, especially focused on error handling
* Files could be split into segments to be processed in parallel by multiple processes but I would probably move to another language and framework to accomplish this.
* Dedicated configuration DSL for input validation.
* Create a result interface that is either returned by a Promise or via the end event to provide information about the job at completion.
* Evaluation of user transformation formulas could be further isolated for security.
* More DSL convenience functions could be added to simplify usage and add data types.
* Each mapping overwrites the named target field, so multiple mappings targeting the same field and building upon one another isn't possible.  The target could be added to the context, so that mappings could be applied in order and use the existing target field value as a component in the formulas.

## Example Set Up

Create a new node project with the following package.json

```json
{
  "name": "test-wrangler",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "author": "",
  "license": "ISC",
  "dependencies": {
    "csv-wrangler": "^1.0.2"
  }
}
```

Try converting a csv file to Json.  The large_sample.csv and large-config.json files are in the resources directory.

```javascript
const w = require('csv-wrangler');
const path = require('path');
const fs = require('fs');


const sourcePath = path.resolve(
    __dirname,
    'large_sample.csv'
); const targetPath = path.resolve(
    __dirname,
    'large_sample.json'
);
const sourceCsv = fs.createReadStream(sourcePath);
const configPath = path.resolve(
    __dirname,
    'large-config.json'
);
const output = w.wrangleFileAsync(sourcePath, targetPath, configPath)
    .then(() => console.log("Success"))
    .catch(err => console.error(err));
```

or reading it as a stream and logging its contents

```javascript
try {
    const outputStream = w.wrangle(sourceCsv, configPath)
    var fin = new Promise((resolve, reject) => {
        outputStream.on('readable', () => {
            while (record = output2.read()) {
                console.log(record);
            }
        });
        outputStream.on('skip', (err) => console.error(err));
        outputStream.on('end', () => {
            return resolve("success");
        });
        outputStream.on('error', (err) => reject(err));
    }).then(msg => console.log(msg))
    .catch(err => console.log(err));
}
catch (err) { console.error(err) };
```
