// tslint:disable:no-expression-statement
import test from 'ava';
import fs from 'fs';
import path from 'path';
import StreamTest from 'streamtest';
import * as w from '../index';

test('can convert a CSV file to json', t => {
  return w.wrangleFileAsync(
    path.resolve(__dirname, '../../../resources/example.csv'),
    path.resolve(__dirname, '../../../build/example.json'),
    row => {
      t.truthy(row);
      const mutableRow = { ...row } as any;
      mutableRow.OrderID = row['Order Number'];
      delete mutableRow['Order Number'];
      return mutableRow;
    }
  );
});

test.cb('can read a CSV file as a stream', t => {
  const sourcePath = path.resolve(__dirname, '../../../resources/example.csv');
  const sourceCsv = fs.createReadStream(sourcePath);
  const expectedObjs = [
    {
      Year: '2018',
      Month: '1',
      Day: '1',
      'Product Number': 'P-10001',
      'Product Name': 'Arugola',
      Count: '5,250.50',
      'Extra Col1': 'Lorem',
      'Extra Col2': 'Ipsum',
      'Empty Column': '',
      OrderID: '1000'
    },

    {
      Year: '2017',
      Month: '12',
      Day: '12',
      'Product Number': 'P-10002',
      'Product Name': 'Iceberg lettuce',
      Count: '500.00',
      'Extra Col1': 'Lorem',
      'Extra Col2': 'Ipsum',
      'Empty Column': '',
      OrderID: '1001'
    }
  ];

  const output = w.wrangle(sourceCsv, row => {
    const mutableRow: any = { ...row };
    mutableRow.OrderID = row['Order Number'];
    delete mutableRow['Order Number'];
    return mutableRow;
  });

  const verify = StreamTest.v2.toObjects((err, objs: any) => {
    if (err) {
      t.fail(err.message);
      throw err;
    }
    t.deepEqual(objs[0], expectedObjs[0]);
    t.end();
  });
  output.pipe(verify);
});

test.cb('can apply transform to type', t => {
  const sourcePath = path.resolve(__dirname, '../../../resources/example.csv');
  const sourceCsv = fs.createReadStream(sourcePath);
  const expectedObjs = [
    {
      OrderID: 1000,
      OrderDate: new Date(2018, 0, 1),
      ProductID: 'P-10001',
      ProductName: 'Arugola',
      Quantity: 5250.5,
      Unit: 'kg'
    }
  ];
  const output = w.wrangle(sourceCsv, defaultMapping);

  const verify = StreamTest.v2.toObjects((err, objs: any) => {
    if (err) {
      t.fail(err.message);
      throw err;
    }
    t.deepEqual(expectedObjs[0], objs[0]);
    t.end();
  });
  output.pipe(verify);
});

test.cb('can handle error and skip bad rows', t => {
  const sourcePath = path.resolve(
    __dirname,
    '../../../resources/example-error.csv'
  );
  const sourceCsv = fs.createReadStream(sourcePath);
  const expectedObjs = [
    {
      OrderID: 1001,
      OrderDate: new Date(2017, 11, 12, 0, 0, 0, 0),
      ProductID: 'P-10002',
      ProductName: 'Iceberg Lettuce',
      Quantity: 500.0,
      Unit: 'kg'
    }
  ];

  t.plan(2);
  const output = w
    .wrangle(sourceCsv, defaultMapping)
    .on('skip', (err: w.MappingError) => {
      t.is(err.message, 'Count is not a number');
    });

  const verify = StreamTest.v2.toObjects((err, objs: any) => {
    if (err) {
      t.fail(err.message);
      throw err;
    }
    t.deepEqual(expectedObjs[0], objs[0]);
    t.end();
  });
  output.pipe(verify);
});

test.cb('can read config from file', t => {
  const sourcePath = path.resolve(__dirname, '../../../resources/example.csv');
  const sourceCsv = fs.createReadStream(sourcePath);
  const configPath = path.resolve(
    __dirname,
    '../../../resources/example-config.json'
  );
  const expectedObjs = [
    {
      OrderID: 1000,
      OrderDate: new Date(2018, 0, 1),
      ProductID: 'P-10001',
      ProductName: 'Arugola',
      Quantity: 5250.5,
      Unit: 'kg'
    }
  ];
  const output = w.wrangle(sourceCsv, configPath);

  const verify = StreamTest.v2.toObjects((err, objs: any) => {
    if (err) {
      t.fail(err.message);
      throw err;
    }
    t.deepEqual(expectedObjs[0], objs[0]);
    t.end();
  });
  output.pipe(verify);
});

test.cb('can read large dataset', t => {
  const sourcePath = path.resolve(
    __dirname,
    '../../../resources/large_sample.csv'
  );
  const sourceCsv = fs.createReadStream(sourcePath);
  const configPath = path.resolve(
    __dirname,
    '../../../resources/large-config.json'
  );
  const expectedObjs = [
    {
      PolicyID: 891996,
      Longitude: -81.372444
    }
  ];
  const output = w.wrangle(sourceCsv, configPath).on('end', () => t.end());

  const verify = StreamTest.v2.toObjects((err, objs: any) => {
    if (err) {
      t.fail(err.message);
      throw err;
    }
    t.deepEqual(expectedObjs[0], objs[1234]);
  });
  output.pipe(verify);
});

test.cb('skips errors when parsing', t => {
  const sourcePath = path.resolve(
    __dirname,
    '../../../resources/parse-error.csv'
  );
  const sourceCsv = fs.createReadStream(sourcePath);
  const output = w.wrangle(sourceCsv, defaultMapping).on('skip', err => {
    t.is(err.message.split(' ')[0], 'Invalid');
    t.pass();
  });

  const verify = StreamTest.v2.toObjects(err => {
    if (!err) {
      t.end();
    }
  });
  output.pipe(verify);
});

const defaultMapping: w.WranglerConfig = {
  mappings: [
    {
      name: 'OrderID',
      formula: "integer('Order Number')"
    },
    {
      name: 'OrderDate',
      formula: "new Date(value('Year'),value('Month') - 1,value('Day'))"
    },
    {
      name: 'ProductID',
      formula: "value('Product Number')"
    },
    {
      name: 'ProductName',
      formula: "titleCase(value('Product Name'))"
    },
    {
      name: 'Quantity',
      formula: "float('Count')"
    },
    {
      name: 'Unit',
      formula: "'kg'"
    }
  ]
};
