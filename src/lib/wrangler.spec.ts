// tslint:disable:no-expression-statement
import test from 'ava';
import fs from 'fs';
import path from 'path';
import StreamTest from 'streamtest';
import * as w from './wrangler';

test('can convert a CSV file to json', t => {
  return w.wrangleFile(
    path.resolve(__dirname, '../../../resources/example.csv'),
    path.resolve(__dirname, '../../../build/example.json'),
    row => {
      t.truthy(row);
      const mutableRow = { ...row };
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
    const mutableRow:any = { ...row };
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
      OrderID: '1000',
      OrderDate: new Date(2018, 1, 1)
    }
  ];
  const mapping:w.Transform = {
    "mappings": [ {
           "name": "OrderID",
           "formula": "row['Order Number']"
           },
           {
               "name": "OrderDate",
               "formula": "new Date(row['Year'],row['Month'],row['Day'])"
           }
       ]
   }
  const output = w.wrangleMapping(sourceCsv, mapping);

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
